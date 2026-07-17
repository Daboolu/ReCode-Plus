import { getAgentSuggestions, getLocalAgentUser } from "@/lib/agent/data";
import { agentErrorResponse, AgentApiError } from "@/lib/agent/errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }

    const data = await getAgentSuggestions(user.id, user.uiLanguage);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return agentErrorResponse(error);
  }
}

