import type { AgentTestPlan, AgentTestReport, AgentTestResult } from '@/types/agent';
import type {
  AgentAction,
  AgentApiResult,
  AgentMessage,
  AgentProblem,
  AgentSession,
  AgentStatus,
  AgentSuggestion,
  AgentSuggestionMode,
  ReviewProposal,
} from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function unwrap(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};
  return isRecord(payload.data) ? { ...payload, ...payload.data } : payload;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeAction(value: unknown): AgentAction | null {
  if (typeof value === 'string') return { type: value };
  if (!isRecord(value)) return null;

  const type = asString(value.type || value.action || value.name);
  if (!type) return null;
  return { ...value, type } as AgentAction;
}

function normalizeActions(value: unknown): AgentAction[] {
  if (Array.isArray(value)) {
    return value
      .map(normalizeAction)
      .filter((action): action is AgentAction => Boolean(action));
  }

  const action = normalizeAction(value);
  return action ? [action] : [];
}

function normalizeMessage(value: unknown): AgentMessage | null {
  if (typeof value === 'string') {
    return {
      id: createId('assistant'),
      role: 'assistant',
      content: value,
    };
  }

  if (!isRecord(value)) return null;
  const nested = isRecord(value.message) ? value.message : null;
  const content = asString(
    value.content || value.text || nested?.content || nested?.text,
  );

  if (!content && !value.action && !value.actions) return null;

  const role = asString(value.role, 'assistant');
  const safeRole: AgentMessage['role'] =
    role === 'user' || role === 'system' || role === 'tool'
      ? role
      : 'assistant';

  let metadata: unknown = value.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata) as unknown;
    } catch {
      metadata = null;
    }
  }
  const actionSource = isRecord(metadata)
    ? {
        ...metadata,
        type: asString(metadata.type || value.action),
      }
    : value.actions || value.action;

  return {
    id: asString(value.id, createId(safeRole)),
    role: safeRole,
    content,
    createdAt: asString(value.createdAt) || undefined,
    actions: normalizeActions(actionSource),
  };
}

function normalizeProblem(value: unknown): AgentProblem | undefined {
  if (!isRecord(value)) return undefined;
  const problem = isRecord(value.problem) ? value.problem : value;
  const submission = isRecord(value.submission)
    ? value.submission
    : Array.isArray(value.submissions) && isRecord(value.submissions[0])
      ? value.submissions[0]
      : null;

  const id = asString(value.progressId || value.id || problem.id);
  const title = asString(problem.title || value.title);
  if (!id && !title) return undefined;

  return {
    id: id || asString(problem.id, createId('problem')),
    progressId: asString(value.progressId || value.id) || undefined,
    pid: asString(problem.pid || value.pid, '—'),
    title: title || 'Untitled problem',
    difficulty: asString(problem.difficulty || value.difficulty, 'Medium'),
    tags: normalizeTags(problem.tags || value.tags),
    masteryLevel: asNumber(value.masteryLevel || problem.masteryLevel),
    notes: asString(value.notes || problem.notes) || undefined,
    language:
      asString(submission?.language || value.language || problem.language) ||
      undefined,
    code: asString(submission?.code || value.code || problem.code) || undefined,
    lastReview: asString(value.lastReview || problem.lastReview) || undefined,
  };
}

function normalizeSession(value: unknown): AgentSession | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id || value.sessionId);
  if (!id) return undefined;

  return {
    id,
    status: asString(value.status, 'active'),
    mode: (asString(value.mode) || undefined) as AgentSuggestionMode | undefined,
    problemId: asString(value.problemId || value.progressId) || undefined,
    createdAt: asString(value.createdAt) || undefined,
  };
}

function normalizeProposal(value: unknown): ReviewProposal | undefined {
  if (!isRecord(value)) return undefined;
  const rating = asNumber(value.rating ?? value.suggestedRating, -1);
  const summary = asString(value.summary || value.note);

  if (rating < 0 && !summary) return undefined;
  return {
    rating: Math.min(5, Math.max(0, rating < 0 ? 3 : Math.round(rating))),
    summary,
  };
}

function normalizeTestReport(value: unknown): AgentTestReport | undefined {
  if (!isRecord(value) || !Array.isArray(value.results)) return undefined;
  const mode = value.mode === 'function' || value.mode === 'stdin'
    ? value.mode
    : undefined;
  if (!mode) return undefined;

  const results = value.results.flatMap((item) => {
    if (!isRecord(item)) return [];
    return [{
      name: asString(item.name, 'Test'),
      passed: item.passed === true,
      status: (item.status === 'passed' || item.status === 'failed' || item.status === 'observed'
        ? item.status
        : undefined) as AgentTestResult['status'],
      input: item.input,
      expected: item.expected,
      actual: item.actual,
      error: asString(item.error) || undefined,
      adapter: asString(item.adapter) || undefined,
    }];
  });

  return {
    mode,
    className: asString(value.className) || undefined,
    functionName: asString(value.functionName) || undefined,
    passed: asNumber(value.passed),
    failed: asNumber(value.failed),
    observed: asNumber(value.observed),
    results,
  };
}

export function normalizeAgentResult(payload: unknown): AgentApiResult {
  const data = unwrap(payload);
  const rawSession = data.session;
  const session = normalizeSession(rawSession) || normalizeSession(data);
  const sessionRecord = isRecord(rawSession) ? rawSession : null;
  const rawMessages = Array.isArray(data.messages)
    ? data.messages
    : Array.isArray(sessionRecord?.messages)
      ? sessionRecord.messages
      : [];
  const messages = rawMessages
    .map(normalizeMessage)
    .filter((message): message is AgentMessage => Boolean(message));

  const rawMessage =
    data.assistantMessage ||
    data.reply ||
    (typeof data.message === 'string' || isRecord(data.message)
      ? data.message
      : undefined);
  const message = normalizeMessage(rawMessage);
  const actions = normalizeActions(
    data.actions || data.action || message?.actions,
  );
  const proposal =
    normalizeProposal(data.proposal || data.reviewProposal || data.result) ||
    normalizeProposal(sessionRecord) ||
    normalizeProposal(
      actions.find((action) =>
        /review|rating|complete|finish/i.test(action.type),
      ),
    );

  return {
    session,
    problem:
      normalizeProblem(data.problem || sessionRecord?.problem || data.progress) ||
      undefined,
    messages,
    message: message
      ? {
          ...message,
          actions: actions.length > 0 ? actions : message.actions,
        }
      : undefined,
    actions,
    proposal,
    testReport: normalizeTestReport(data.testReport),
    notes: asString(data.notes) || undefined,
    memorySaved: data.memorySaved === true,
    error: asString(data.ollamaError || data.error) || undefined,
    raw: data,
  };
}

async function parseError(response: Response) {
  const payload = await response.json().catch(() => null);
  const data = unwrap(payload);
  return (
    asString(data.error || data.message) ||
    `${response.status} ${response.statusText}`
  );
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) throw new Error(await parseError(response));
  return response;
}

export async function getAgentStatus(signal?: AbortSignal): Promise<AgentStatus> {
  const response = await request('/api/agent/status', { signal });
  const payload = unwrap(await response.json());
  const available = Boolean(
    payload.available ?? payload.ready ?? payload.ollamaAvailable,
  );

  return {
    available,
    serviceReachable: Boolean(payload.serviceReachable ?? available),
    modelInstalled: Boolean(
      payload.modelInstalled ?? payload.hasModel ?? available,
    ),
    model: asString(payload.model) || undefined,
    message: asString(payload.message || payload.error) || undefined,
  };
}

function normalizeSuggestion(value: unknown, index: number): AgentSuggestion | null {
  if (!isRecord(value)) return null;
  const mode = asString(value.mode || value.type) as AgentSuggestionMode;
  const title = asString(value.title || value.label);
  if (!mode || !title) return null;

  return {
    id: asString(value.id, `${mode}-${index}`),
    mode,
    title,
    description: asString(value.description) || undefined,
    count: typeof value.count === 'number' ? value.count : undefined,
    problemId: asString(value.problemId || value.progressId) || undefined,
    sessionId: asString(value.sessionId) || undefined,
    disabled: value.disabled === true,
  };
}

export async function getAgentSuggestions(
  signal?: AbortSignal,
  query?: string,
): Promise<{ suggestions: AgentSuggestion[]; problems: AgentProblem[] }> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await request(`/api/agent/suggestions${suffix}`, { signal });
  const payload = unwrap(await response.json());
  const rawSuggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions
    : [];
  const rawProblems = Array.isArray(payload.problems)
    ? payload.problems
    : Array.isArray(payload.questions)
      ? payload.questions
      : [];

  return {
    suggestions: rawSuggestions
      .map(normalizeSuggestion)
      .filter((item): item is AgentSuggestion => Boolean(item)),
    problems: rawProblems
      .map(normalizeProblem)
      .filter((item): item is AgentProblem => Boolean(item)),
  };
}

export async function createAgentSession(input: {
  mode: AgentSuggestionMode;
  problemId?: string;
  sessionId?: string;
  message?: string;
}): Promise<AgentApiResult> {
  const response = await request('/api/agent/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeAgentResult(await response.json());
}

async function readStream(
  response: Response,
  onDelta?: (content: string) => void,
  onStage?: (message: string, stage?: string) => void,
): Promise<AgentApiResult> {
  const reader = response.body?.getReader();
  if (!reader) return {};

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finalPayload: unknown;
  const collectedActions: AgentAction[] = [];

  const processLine = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) return;
    const data = line.startsWith('data:') ? line.slice(5).trim() : line;
    if (!data || data === '[DONE]') return;

    try {
      const payload: unknown = JSON.parse(data);
      if (!isRecord(payload)) return;
      if (payload.type === 'stage') {
        const message = asString(payload.message);
        if (message) onStage?.(message, asString(payload.stage) || undefined);
        return;
      }
      const delta = asString(
        payload.type === 'done'
          ? ''
          : payload.delta ||
              payload.token ||
              (isRecord(payload.message) ? payload.message.content : ''),
      );
      if (delta) {
        content += delta;
        onDelta?.(content);
      }
      collectedActions.push(
        ...normalizeActions(payload.actions || payload.action),
      );
      if (payload.done || payload.type === 'done' || payload.session) {
        finalPayload = payload;
      }
    } catch {
      content += data;
      onDelta?.(content);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  }
  buffer += decoder.decode();
  if (buffer.trim()) processLine(buffer);

  const result = normalizeAgentResult(finalPayload || {});
  if (content) {
    result.message = {
      id: result.message?.id || createId('assistant'),
      role: 'assistant',
      content,
      actions:
        result.message?.actions && result.message.actions.length > 0
          ? result.message.actions
          : collectedActions,
    };
  }
  return result;
}

async function readChatResponse(
  response: Response,
  onDelta?: (content: string) => void,
  onStage?: (message: string, stage?: string) => void,
) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') || contentType.includes('ndjson')) {
    return readStream(response, onDelta, onStage);
  }

  const result = normalizeAgentResult(await response.json());
  if (result.message?.content) onDelta?.(result.message.content);
  return result;
}

export async function sendAgentMessage(
  input: { sessionId: string; message: string },
  onDelta?: (content: string) => void,
): Promise<AgentApiResult> {
  const response = await request('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readChatResponse(response, onDelta);
}

export async function submitCodeToAgent(
  input: {
    sessionId: string;
    language: string;
    code: string;
    executionOutput?: string | null;
  },
  onDelta?: (content: string) => void,
  onStage?: (message: string, stage?: string) => void,
): Promise<AgentApiResult> {
  const response = await request('/api/agent/code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readChatResponse(response, onDelta, onStage);
}

export async function executeAgentTests(
  input: {
    sessionId: string;
    language: string;
    code: string;
    testPlan: AgentTestPlan;
  },
  onDelta?: (content: string) => void,
): Promise<AgentApiResult> {
  const response = await request('/api/agent/tests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readChatResponse(response, onDelta);
}

export async function completeAgentReview(input: {
  sessionId: string;
  rating: number;
  summary: string;
  appendToNotes: boolean;
}): Promise<AgentApiResult> {
  const response = await request('/api/agent/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeAgentResult(await response.json());
}
