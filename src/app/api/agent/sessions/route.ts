import {
  agentSessionInclude,
  getLocalAgentUser,
  selectProgressForMode,
} from "@/lib/agent/data";
import {
  agentErrorResponse,
  AgentApiError,
  readJsonObject,
  requiredString,
} from "@/lib/agent/errors";
import { AGENT_LIMITS } from "@/lib/agent/config";
import {
  createAgentReply,
  saveUserAgentMessage,
} from "@/lib/agent/service";
import { serializeAgentSession } from "@/lib/agent/serialization";
import { prisma } from "@/lib/db";
import {
  AGENT_REVIEW_MODES,
  type AgentReviewMode,
} from "@/types/agent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function optionalId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 200) {
    throw new AgentApiError("problemId must be a valid string", 400, "INVALID_INPUT");
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const mode = body.mode;
    if (
      typeof mode !== "string" ||
      !AGENT_REVIEW_MODES.includes(mode as AgentReviewMode)
    ) {
      throw new AgentApiError("Unknown Agent review mode", 400, "INVALID_MODE");
    }

    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }

    if (mode === "continue") {
      const existing = await prisma.agentReviewSession.findFirst({
        where: { userId: user.id, status: "active" },
        orderBy: { updatedAt: "desc" },
        include: agentSessionInclude,
      });
      if (!existing) {
        throw new AgentApiError(
          "There is no active Agent session to continue",
          404,
          "SESSION_NOT_FOUND",
        );
      }
      const session = serializeAgentSession(existing);
      return NextResponse.json({
        success: true,
        session,
        messages: session.messages,
        problem: session.problem,
        assistantMessage: session.messages.at(-1) ?? null,
      });
    }

    const requestedId = optionalId(body.progressId ?? body.problemId);
    const initialMessage =
      body.message === undefined || body.message === null || body.message === ""
        ? undefined
        : requiredString(body.message, "message", AGENT_LIMITS.userMessage);
    if (mode === "manual" && !requestedId) {
      throw new AgentApiError(
        "problemId is required for this mode",
        400,
        "PROBLEM_REQUIRED",
      );
    }

    const progress = await selectProgressForMode({
      userId: user.id,
      mode: mode as AgentReviewMode,
      requestedId,
      query: initialMessage,
    });
    if (!progress) {
      throw new AgentApiError(
        mode === "due"
          ? "No problems are due for review"
          : "No eligible problem was found",
        404,
        "PROBLEM_NOT_FOUND",
      );
    }

    const [, created] = await prisma.$transaction([
      // The MVP exposes one resumable conversation at a time. Starting a new
      // review closes any older abandoned session so "Continue" is unambiguous.
      prisma.agentReviewSession.updateMany({
        where: { userId: user.id, status: "active" },
        data: { status: "cancelled" },
      }),
      prisma.agentReviewSession.create({
        data: {
          userId: user.id,
          progressId: progress.id,
          mode,
        },
      }),
    ]);

    let assistantMessage = null;
    let action = null;
    let ollamaError: string | null = null;
    if (initialMessage) {
      await saveUserAgentMessage({
        sessionId: created.id,
        userId: user.id,
        content: initialMessage,
      });
    }

    try {
      const reply = await createAgentReply({
        sessionId: created.id,
        userId: user.id,
        opening: !initialMessage,
      });
      assistantMessage = reply.message;
      action = reply.action;
    } catch (error) {
      // Keep the new session resumable when Ollama is temporarily unavailable.
      ollamaError = error instanceof Error ? error.message : "Local Ollama is unavailable";
    }

    const persisted = await prisma.agentReviewSession.findUniqueOrThrow({
      where: { id: created.id },
      include: agentSessionInclude,
    });
    const session = serializeAgentSession(persisted);

    return NextResponse.json(
      {
        success: true,
        session,
        messages: session.messages,
        problem: session.problem,
        assistantMessage,
        action,
        ollamaError,
      },
      { status: 201 },
    );
  } catch (error) {
    return agentErrorResponse(error);
  }
}
