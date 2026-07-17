import { getLocalAgentUser } from "@/lib/agent/data";
import {
  agentErrorResponse,
  AgentApiError,
  readJsonObject,
  requiredString,
} from "@/lib/agent/errors";
import { createAgentReply, saveUserAgentMessage } from "@/lib/agent/service";
import { AGENT_LIMITS } from "@/lib/agent/config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const sessionId = requiredString(body.sessionId, "sessionId", 200);
    const content = requiredString(
      body.message ?? body.content,
      "message",
      AGENT_LIMITS.userMessage,
    );
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }

    const userMessage = await saveUserAgentMessage({
      sessionId,
      userId: user.id,
      content,
    });
    const reply = await createAgentReply({ sessionId, userId: user.id });

    return NextResponse.json({
      success: true,
      userMessage,
      message: reply.message,
      assistantMessage: reply.message,
      action: reply.action,
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

