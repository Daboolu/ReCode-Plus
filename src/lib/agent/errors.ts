import { NextResponse } from "next/server";

export class AgentApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "AGENT_REQUEST_FAILED",
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

export function agentErrorResponse(error: unknown) {
  if (error instanceof AgentApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("Agent API error:", error);
  const message = error instanceof Error ? error.message : "Agent request failed";
  const isLocalModelError =
    message.includes("Ollama") ||
    message.includes("local model") ||
    message.includes("Local model") ||
    message.includes("fetch failed") ||
    message.includes("timed out");

  return NextResponse.json(
    {
      success: false,
      error: isLocalModelError
        ? message
        : "The local Agent request could not be completed",
      code: isLocalModelError ? "OLLAMA_UNAVAILABLE" : "AGENT_INTERNAL_ERROR",
    },
    { status: isLocalModelError ? 503 : 500 },
  );
}

export async function readJsonObject(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AgentApiError("Request body must be valid JSON", 400, "INVALID_JSON");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentApiError("Request body must be a JSON object", 400, "INVALID_BODY");
  }

  return value as Record<string, unknown>;
}

export function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AgentApiError(`${field} is required`, 400, "INVALID_INPUT");
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AgentApiError(
      `${field} must be at most ${maxLength} characters`,
      400,
      "INPUT_TOO_LARGE",
    );
  }
  return trimmed;
}

