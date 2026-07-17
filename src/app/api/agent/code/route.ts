import { AGENT_LIMITS } from "@/lib/agent/config";
import { getLocalAgentUser } from "@/lib/agent/data";
import {
  agentErrorResponse,
  AgentApiError,
  readJsonObject,
  requiredString,
} from "@/lib/agent/errors";
import {
  createAgentReply,
  formatCodeSubmission,
  runAutonomousCodeReview,
  saveAgentSubmission,
  saveUserAgentMessage,
} from "@/lib/agent/service";

export const runtime = "nodejs";

const SUPPORTED_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "python",
  "cpp",
  "java",
  "go",
]);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const sessionId = requiredString(body.sessionId, "sessionId", 200);
    const language = requiredString(body.language, "language", 30).toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(language)) {
      throw new AgentApiError("Unsupported programming language", 400, "INVALID_LANGUAGE");
    }
    const code = requiredString(body.code, "code", AGENT_LIMITS.code);
    const executionOutput =
      body.executionOutput === undefined || body.executionOutput === null
        ? undefined
        : requiredString(
            body.executionOutput,
            "executionOutput",
            AGENT_LIMITS.executionOutput,
          );
    const user = await getLocalAgentUser();
    if (!user) {
      throw new AgentApiError("No local user found", 401, "UNAUTHORIZED");
    }

    const encoder = new TextEncoder();
    const isChinese = user.uiLanguage.toLowerCase().startsWith("zh");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        void (async () => {
          try {
            emit({
              type: "stage",
              stage: "saving",
              message: isChinese
                ? "正在保存最新代码，并确认它属于当前复习题目…"
                : "Saving the latest code and attaching it to this review…",
            });
            const content = formatCodeSubmission({ language, code, executionOutput });
            await saveAgentSubmission({
              sessionId,
              userId: user.id,
              language,
              code,
            });
            const userMessage = await saveUserAgentMessage({
              sessionId,
              userId: user.id,
              content,
            });
            const autonomous = await runAutonomousCodeReview({
              sessionId,
              userId: user.id,
              onStage: (event) => emit({ type: "stage", ...event }),
            });
            if (!autonomous) {
              emit({
                type: "stage",
                stage: "judging",
                message: isChinese
                  ? "当前代码无法安全自动调用，Agent 正在给出静态分析…"
                  : "The code cannot be called safely; the Agent is preparing a static analysis…",
              });
            }
            const reply = autonomous
              ? { message: autonomous.message, action: null }
              : await createAgentReply({
                  sessionId,
                  userId: user.id,
                  requireTests: true,
                  directive: user.uiLanguage.toLowerCase().startsWith("zh")
                    ? "静态分析最新代码。若题目信息不足以构造可靠预期值，明确询问一个输入输出示例，禁止声称代码未提交或无法分析。"
                    : "Statically analyze the latest code. If context is insufficient for reliable expected values, ask for one input/output example. Never claim code was not submitted or cannot be analyzed.",
                });

            emit({
              type: "done",
              done: true,
              success: true,
              userMessage,
              message: reply.message,
              assistantMessage: reply.message,
              action: reply.action,
              testReport: autonomous?.testReport,
              notes: autonomous?.notes,
              memorySaved: autonomous?.memorySaved ?? false,
              planSource: autonomous?.planSource,
            });
          } catch (error) {
            console.error("Agent code stream error:", error);
            emit({
              type: "done",
              done: true,
              success: false,
              error: error instanceof Error
                ? error.message
                : isChinese
                  ? "Agent 处理代码时发生错误"
                  : "The Agent could not process the code",
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return agentErrorResponse(error);
  }
}
