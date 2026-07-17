import { AGENT_LIMITS } from "@/lib/agent/config";
import { getLocalAgentUser, getOwnedAgentSession } from "@/lib/agent/data";
import {
  agentErrorResponse,
  AgentApiError,
  readJsonObject,
  requiredString,
} from "@/lib/agent/errors";
import {
  appendAgentTestMemory,
  createAgentReply,
  replaceAgentReplyContent,
  saveAgentAssistantMessage,
  saveUserAgentMessage,
} from "@/lib/agent/service";
import {
  formatTestExecution,
  explainTestReport,
  readAgentTestPlan,
  runAgentTestPlan,
} from "@/lib/agent/testing";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPPORTED_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "python",
  "cpp",
  "java",
]);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const sessionId = requiredString(body.sessionId, "sessionId", 200);
    const language = requiredString(body.language, "language", 30).toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(language)) {
      throw new AgentApiError(
        "Unsupported programming language for Agent tests",
        400,
        "INVALID_LANGUAGE",
      );
    }
    const code = requiredString(body.code, "code", AGENT_LIMITS.code);
    const testPlan = readAgentTestPlan(body.testPlan);
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }
    const session = await getOwnedAgentSession(sessionId, user.id);
    if (!session) {
      throw new AgentApiError("Agent session not found", 404, "SESSION_NOT_FOUND");
    }
    if (
      session.progress.submission?.code !== code ||
      session.progress.submission?.language.toLowerCase() !== language
    ) {
      throw new AgentApiError(
        user.uiLanguage.toLowerCase().startsWith("zh")
          ? "代码已经更新，请重新提交代码后再运行测试。"
          : "The code has changed. Submit the latest code before running tests.",
        409,
        "STALE_TEST_PLAN",
      );
    }

    const testReport = await runAgentTestPlan({ language, code, testPlan });
    const userMessage = await saveUserAgentMessage({
      sessionId,
      userId: user.id,
      content: formatTestExecution(testReport),
    });
    const explanation = explainTestReport(
      testReport,
      user.uiLanguage.toLowerCase().startsWith("zh"),
    );
    let enrichedMessage;
    let replyAction = null;
    try {
      const reply = await createAgentReply({ sessionId, userId: user.id });
      enrichedMessage = await replaceAgentReplyContent(
        reply.message.id,
        `${explanation}\n\n${reply.message.content}`,
      );
      replyAction = reply.action;
    } catch {
      enrichedMessage = await saveAgentAssistantMessage({
        sessionId,
        content: explanation,
      });
    }
    const notes = await appendAgentTestMemory({
      sessionId,
      userId: user.id,
      report: testReport,
      analysis: enrichedMessage.content,
    });

    return NextResponse.json({
      success: true,
      userMessage,
      message: enrichedMessage,
      assistantMessage: enrichedMessage,
      action: replyAction,
      testReport,
      notes,
      memorySaved: true,
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
