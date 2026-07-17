import type {
  AgentActionType,
  AgentMessageDto,
  AgentProblemSummary,
  AgentReviewMode,
  AgentSessionDto,
} from "@/types/agent";

type MessageLike = {
  id: string;
  role: string;
  content: string;
  action: string | null;
  metadata: string | null;
  createdAt: Date;
};

type ProgressLike = {
  id: string;
  problemId: string;
  status: string;
  notes: string | null;
  masteryLevel: number;
  reviewCount: number;
  lastReview: Date | null;
  nextReview: Date;
  problem: {
    pid: string;
    title: string;
    difficulty: string;
    tags: string;
    url: string | null;
  };
  submission: {
    language: string;
    code: string;
  } | null;
};

type SessionLike = {
  id: string;
  mode: string;
  status: string;
  progressId: string;
  suggestedRating: number | null;
  finalRating: number | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  progress: ProgressLike;
  messages: MessageLike[];
};

function safeMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function serializeAgentMessage(message: MessageLike): AgentMessageDto {
  const action =
    message.action === "open_editor" ||
    message.action === "run_tests" ||
    message.action === "suggest_review"
      ? (message.action as AgentActionType)
      : null;

  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    action,
    metadata: safeMetadata(message.metadata),
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeAgentProblem(progress: ProgressLike): AgentProblemSummary {
  return {
    progressId: progress.id,
    problemId: progress.problemId,
    pid: progress.problem.pid,
    title: progress.problem.title,
    difficulty: progress.problem.difficulty,
    tags: progress.problem.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    url: progress.problem.url,
    status: progress.status,
    masteryLevel: progress.masteryLevel,
    reviewCount: progress.reviewCount,
    lastReview: progress.lastReview?.toISOString() ?? null,
    nextReview: progress.nextReview.toISOString(),
    language: progress.submission?.language ?? null,
    code: progress.submission?.code ?? null,
    notes: progress.notes,
  };
}

export function serializeAgentSession(session: SessionLike): AgentSessionDto {
  const mode = ["due", "weakest", "random", "manual", "custom"].includes(
    session.mode,
  )
    ? (session.mode as AgentReviewMode)
    : "manual";
  const status = ["active", "completed", "cancelled"].includes(session.status)
    ? (session.status as AgentSessionDto["status"])
    : "active";

  return {
    id: session.id,
    mode,
    status,
    progressId: session.progressId,
    suggestedRating: session.suggestedRating,
    finalRating: session.finalRating,
    summary: session.summary,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    problem: serializeAgentProblem(session.progress),
    messages: session.messages.map(serializeAgentMessage),
  };
}
