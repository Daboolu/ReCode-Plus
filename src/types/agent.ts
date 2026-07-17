export const AGENT_REVIEW_MODES = [
  "due",
  "weakest",
  "random",
  "manual",
  "custom",
  "continue",
] as const;

export type AgentReviewMode = (typeof AGENT_REVIEW_MODES)[number];

export type AgentActionType = "open_editor" | "run_tests" | "suggest_review";

export interface AgentTestCase {
  name: string;
  /** Function-mode arguments. Values must be JSON serializable. */
  args?: unknown[];
  /** Function-mode expected JSON value. */
  expected?: unknown;
  /** Stdin-mode input passed to the program. */
  input?: string;
  /** Stdin-mode expected stdout after trimming. */
  expectedOutput?: string;
}

export interface AgentTestPlan {
  mode: "function" | "stdin";
  /** Model plans are exploratory; only trusted plans may assert pass/fail. */
  oracle?: "model" | "trusted";
  /** Optional class to instantiate before calling functionName. */
  className?: string;
  /** Required for function mode; restricted to a plain identifier. */
  functionName?: string;
  tests: AgentTestCase[];
}

export interface AgentTestResult {
  name: string;
  passed: boolean;
  status?: "passed" | "failed" | "observed";
  input?: unknown;
  expected: unknown;
  actual: unknown;
  error?: string;
  /** Executor-side call adaptation; this is not an algorithm failure. */
  adapter?: string;
}

export interface AgentTestReport {
  mode: "function" | "stdin";
  oracle?: "model" | "trusted";
  className?: string;
  functionName?: string;
  passed: number;
  failed: number;
  observed?: number;
  results: AgentTestResult[];
}

export interface AgentUiAction {
  type: AgentActionType;
  label?: string;
  prompt?: string;
  /** Alias kept for simple UI consumers. */
  rating?: number;
  suggestedRating?: number;
  summary?: string;
  testPlan?: AgentTestPlan;
}

export interface AgentProblemSummary {
  /** Progress is the user-specific record used by Agent review routes. */
  progressId: string;
  /** Problem is the shared problem metadata record. */
  problemId: string;
  pid: string;
  title: string;
  difficulty: string;
  tags: string[];
  url: string | null;
  status: string;
  masteryLevel: number;
  reviewCount: number;
  lastReview: string | null;
  nextReview: string;
  language: string | null;
  code: string | null;
  notes: string | null;
}

export interface AgentMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  action: AgentActionType | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentSessionDto {
  id: string;
  mode: AgentReviewMode;
  status: "active" | "completed" | "cancelled";
  progressId: string;
  suggestedRating: number | null;
  finalRating: number | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  problem: AgentProblemSummary;
  messages: AgentMessageDto[];
}

export interface AgentSuggestion {
  id: "continue" | "due" | "weakest" | "random" | "manual";
  mode: AgentReviewMode;
  label: string;
  description: string;
  count?: number;
  progressId?: string;
  disabled?: boolean;
}

export interface AgentModelStatus {
  available: boolean;
  serviceReachable: boolean;
  modelInstalled: boolean;
  model: string;
  baseUrl: string;
  error?: string;
}
