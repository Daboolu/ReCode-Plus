import type { AgentTestPlan, AgentTestReport } from '@/types/agent';

export type AgentSuggestionMode =
  | 'due'
  | 'weakest'
  | 'random'
  | 'continue'
  | 'manual'
  | 'custom';

export interface AgentSuggestion {
  id: string;
  mode: AgentSuggestionMode;
  title: string;
  description?: string;
  count?: number;
  problemId?: string;
  sessionId?: string;
  disabled?: boolean;
}

export interface AgentProblem {
  id: string;
  progressId?: string;
  pid: string;
  title: string;
  difficulty: string;
  tags: string[];
  masteryLevel: number;
  notes?: string;
  language?: string;
  code?: string;
  lastReview?: string;
}

export interface AgentAction {
  type: string;
  label?: string;
  prompt?: string;
  rating?: number;
  suggestedRating?: number;
  summary?: string;
  testPlan?: AgentTestPlan;
  [key: string]: unknown;
}

export interface AgentMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt?: string;
  actions?: AgentAction[];
}

export interface AgentSession {
  id: string;
  status: 'active' | 'completed' | string;
  mode?: AgentSuggestionMode;
  problemId?: string;
  createdAt?: string;
}

export interface AgentStatus {
  available: boolean;
  serviceReachable?: boolean;
  modelInstalled: boolean;
  model?: string;
  message?: string;
}

export interface ReviewProposal {
  rating: number;
  summary: string;
}

export interface AgentApiResult {
  session?: AgentSession;
  problem?: AgentProblem;
  messages?: AgentMessage[];
  message?: AgentMessage;
  actions?: AgentAction[];
  proposal?: ReviewProposal;
  testReport?: AgentTestReport;
  notes?: string;
  memorySaved?: boolean;
  error?: string;
  raw?: Record<string, unknown>;
}
