const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b";

export type AgentProvider = "ollama" | "openai-compatible";

function parseTimeout(value: string | undefined) {
  const seconds = Number(value ?? "120");
  if (!Number.isFinite(seconds)) return 120_000;
  return Math.min(Math.max(seconds, 5), 300) * 1_000;
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(normalized);
}

function parseProvider(value: string | undefined): AgentProvider {
  const normalized = (value || "ollama").trim().toLowerCase();
  if (normalized === "ollama" || normalized === "openai-compatible") {
    return normalized;
  }
  throw new Error("AGENT_PROVIDER must be ollama or openai-compatible");
}

export function getAgentConfig() {
  const provider = parseProvider(process.env.AGENT_PROVIDER);
  const rawBaseUrl = provider === "ollama"
    ? process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL
    : process.env.AGENT_BASE_URL;
  if (!rawBaseUrl) throw new Error("AGENT_BASE_URL is required for remote mode");

  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error(`${provider === "ollama" ? "OLLAMA_BASE_URL" : "AGENT_BASE_URL"} is not a valid URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Agent base URL must use http or https");
  }
  if (provider === "ollama" && !isLoopbackHostname(url.hostname)) {
    throw new Error("OLLAMA_BASE_URL must point to this computer (localhost)");
  }
  if (
    provider === "openai-compatible" &&
    url.protocol !== "https:" &&
    !isLoopbackHostname(url.hostname)
  ) {
    throw new Error("Remote AGENT_BASE_URL must use https");
  }

  const apiKey = provider === "openai-compatible"
    ? process.env.AGENT_API_KEY?.trim()
    : undefined;
  if (provider === "openai-compatible" && !apiKey) {
    throw new Error("AGENT_API_KEY is required for remote mode");
  }
  const remoteModel = process.env.AGENT_MODEL?.trim();
  if (provider === "openai-compatible" && !remoteModel) {
    throw new Error("AGENT_MODEL is required for remote mode");
  }

  return {
    provider,
    baseUrl: url.toString().replace(/\/$/, ""),
    model: provider === "ollama"
      ? process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL
      : remoteModel!,
    apiKey,
    timeoutMs: parseTimeout(process.env.AGENT_TIMEOUT_SECONDS || process.env.OLLAMA_TIMEOUT_SECONDS),
    mockMode: process.env.AGENT_MOCK_MODE === "true",
  };
}

export const AGENT_LIMITS = {
  userMessage: 6_000,
  assistantMessage: 12_000,
  code: 50_000,
  executionOutput: 12_000,
  summary: 8_000,
  noteContext: 8_000,
  savedCodeContext: 20_000,
  historyMessages: 24,
  historyEvents: 8,
} as const;
