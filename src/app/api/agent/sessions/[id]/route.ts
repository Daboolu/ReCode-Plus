import { getLocalAgentUser, getOwnedAgentSession } from "@/lib/agent/data";
import { agentErrorResponse, AgentApiError } from "@/lib/agent/errors";
import { serializeAgentSession } from "@/lib/agent/serialization";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }
    const { id } = await params;
    const session = await getOwnedAgentSession(id, user.id);
    if (!session) {
      throw new AgentApiError("Agent session not found", 404, "SESSION_NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      session: serializeAgentSession(session),
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

