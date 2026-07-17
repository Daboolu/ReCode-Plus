import {
  agentSessionInclude,
  getLocalAgentUser,
} from "@/lib/agent/data";
import {
  agentErrorResponse,
  AgentApiError,
  readJsonObject,
  requiredString,
} from "@/lib/agent/errors";
import { completeAgentReview } from "@/lib/agent/service";
import { serializeAgentSession } from "@/lib/agent/serialization";
import { AGENT_LIMITS } from "@/lib/agent/config";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const sessionId = requiredString(body.sessionId, "sessionId", 200);
    const summary = requiredString(body.summary, "summary", AGENT_LIMITS.summary);
    const rating = body.rating;
    if (typeof rating !== "number") {
      throw new AgentApiError("rating must be a number", 400, "INVALID_RATING");
    }
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }

    const result = await completeAgentReview({
      sessionId,
      userId: user.id,
      rating,
      summary,
      appendToNotes: body.appendToNotes === true,
    });
    const persisted = await prisma.agentReviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: agentSessionInclude,
    });

    return NextResponse.json({
      success: true,
      session: serializeAgentSession(persisted),
      nextReview: result.nextReview.toISOString(),
      interval: result.interval,
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

