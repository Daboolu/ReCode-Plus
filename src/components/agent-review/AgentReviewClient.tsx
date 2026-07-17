'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CloudOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';

import AgentContextPanel from './AgentContextPanel';
import AgentConversation from './AgentConversation';
import CodeEditorDialog from './CodeEditorDialog';
import ProblemPickerDialog from './ProblemPickerDialog';
import ReviewCompletionDialog from './ReviewCompletionDialog';
import SuggestionBubbles from './SuggestionBubbles';
import {
  completeAgentReview,
  createAgentSession,
  executeAgentTests,
  getAgentStatus,
  getAgentSuggestions,
  sendAgentMessage,
  submitCodeToAgent,
} from './api';
import { getAgentCopy } from './copy';
import type {
  AgentAction,
  AgentApiResult,
  AgentMessage,
  AgentProblem,
  AgentSession,
  AgentStatus,
  AgentSuggestion,
  ReviewProposal,
} from './types';

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeMessages(
  current: AgentMessage[],
  incoming: AgentMessage[],
): AgentMessage[] {
  const merged = [...current];
  for (const message of incoming) {
    const existingIndex = merged.findIndex(
      (item) =>
        item.id === message.id ||
        (item.role === message.role &&
          item.content === message.content &&
          item.content.length > 0),
    );
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...message };
    } else {
      merged.push(message);
    }
  }
  return merged;
}

function isEditorAction(type: string) {
  return /open_editor|request_editor|request_code|code_submission/i.test(type);
}

function isCompletionAction(type: string) {
  return /suggest_review|propose_review|suggest_rating|complete_review|finish_review/i.test(type);
}

function isTestAction(type: string) {
  return /run_tests|execute_tests|test_code/i.test(type);
}

export default function AgentReviewClient() {
  const { uiLanguage, preferredLang } = useUserStore();
  const copy = useMemo(() => getAgentCopy(uiLanguage), [uiLanguage]);

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [problems, setProblems] = useState<AgentProblem[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [suggestionsWarning, setSuggestionsWarning] = useState(false);

  const [session, setSession] = useState<AgentSession | null>(null);
  const [problem, setProblem] = useState<AgentProblem | undefined>();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [proposal, setProposal] = useState<ReviewProposal | undefined>();
  const [customPrompt, setCustomPrompt] = useState('');

  const [isStarting, setIsStarting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [agentActivity, setAgentActivity] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);

  const fallbackSuggestions = useMemo<AgentSuggestion[]>(
    () => [
      {
        id: 'due',
        mode: 'due',
        title: copy.dueTitle,
        description: copy.dueDescription,
      },
      {
        id: 'weakest',
        mode: 'weakest',
        title: copy.weakestTitle,
        description: copy.weakestDescription,
      },
      {
        id: 'random',
        mode: 'random',
        title: copy.randomTitle,
        description: copy.randomDescription,
      },
      {
        id: 'manual',
        mode: 'manual',
        title: copy.manualTitle,
        description: copy.manualDescription,
      },
    ],
    [copy],
  );

  const displayedSuggestions = useMemo(() => {
    const continued = suggestions.filter((item) => item.mode === 'continue');
    const dynamicByMode = new Map(
      suggestions
        .filter((item) => item.mode !== 'continue')
        .map((item) => [item.mode, item]),
    );
    const standard = fallbackSuggestions.map(
      (fallback) => dynamicByMode.get(fallback.mode) || fallback,
    );
    const extras = suggestions.filter(
      (item) =>
        item.mode !== 'continue' &&
        !fallbackSuggestions.some((fallback) => fallback.mode === item.mode),
    );
    return [...continued, ...standard, ...extras];
  }, [fallbackSuggestions, suggestions]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setBootstrapLoading(true);
      const [statusResult, suggestionResult] = await Promise.allSettled([
        getAgentStatus(controller.signal),
        getAgentSuggestions(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value);
      } else {
        setStatus({
          available: false,
          modelInstalled: false,
          message: statusResult.reason instanceof Error
            ? statusResult.reason.message
            : copy.offline,
        });
      }

      if (suggestionResult.status === 'fulfilled') {
        setSuggestions(suggestionResult.value.suggestions);
        setProblems(suggestionResult.value.problems);
        setSuggestionsWarning(false);
      } else {
        setSuggestionsWarning(true);
      }
      setBootstrapLoading(false);
    };

    void load();
    return () => controller.abort();
  }, [copy.offline]);

  const agentReady = Boolean(status?.available && status.modelInstalled);

  const retryStatus = async () => {
    setStatus(null);
    try {
      setStatus(await getAgentStatus());
    } catch (error) {
      setStatus({
        available: false,
        modelInstalled: false,
        message: error instanceof Error ? error.message : copy.offline,
      });
    }
  };

  const refreshSuggestions = async () => {
    try {
      const result = await getAgentSuggestions();
      setSuggestions(result.suggestions);
      setProblems(result.problems);
      setSuggestionsWarning(false);
    } catch {
      setSuggestionsWarning(true);
    }
  };

  const applyResult = (result: AgentApiResult, streamingId?: string) => {
    if (result.session) setSession(result.session);
    if (result.problem) setProblem(result.problem);
    if (result.proposal) setProposal(result.proposal);

    setMessages((current) => {
      let next = result.messages?.length
        ? mergeMessages(current, result.messages)
        : [...current];

      if (result.message) {
        if (streamingId) {
          const index = next.findIndex((item) => item.id === streamingId);
          if (index >= 0) {
            next[index] = {
              ...next[index],
              ...result.message,
              id: streamingId,
              content: result.message.content || next[index].content,
              actions:
                result.message.actions?.length
                  ? result.message.actions
                  : result.actions,
            };
          } else {
            next = mergeMessages(next, [result.message]);
          }
        } else {
          next = mergeMessages(next, [result.message]);
        }
      } else if (streamingId) {
        next = next.filter(
          (item) => item.id !== streamingId || item.content.trim().length > 0,
        );
      }

      if (!result.message && result.actions?.length) {
        const lastAssistant = [...next]
          .map((message, index) => ({ message, index }))
          .reverse()
          .find(({ message }) => message.role === 'assistant');
        if (lastAssistant) {
          next[lastAssistant.index] = {
            ...lastAssistant.message,
            actions: result.actions,
          };
        }
      }
      return next;
    });
  };

  const streamIntoMessage = (id: string, content: string) => {
    setMessages((current) => {
      const index = current.findIndex((message) => message.id === id);
      if (index < 0) {
        return [
          ...current,
          { id, role: 'assistant' as const, content },
        ];
      }

      const next = [...current];
      next[index] = { ...next[index], content };
      return next;
    });
  };

  const startSession = async (
    suggestion: AgentSuggestion,
    selectedProblem?: AgentProblem,
    initialMessage?: string,
  ) => {
    if (!agentReady) {
      toast.error(copy.offline);
      return null;
    }

    setIsStarting(true);
    setIsThinking(true);
    setAgentActivity(copy.preparingContext);
    setProblem(selectedProblem);
    setMessages(
      initialMessage
        ? [
            {
              id: createId('user'),
              role: 'user',
              content: initialMessage,
            },
          ]
        : [],
    );
    setProposal(undefined);

    try {
      const result = await createAgentSession({
        mode: suggestion.mode,
        problemId:
          selectedProblem?.progressId ||
          selectedProblem?.id ||
          suggestion.problemId,
        sessionId: suggestion.sessionId,
        message: initialMessage,
      });
      if (result.error) throw new Error(result.error);
      if (!result.session) throw new Error(copy.startError);

      setSession(result.session);
      setProblem(result.problem || selectedProblem);
      applyResult(result);
      return result;
    } catch (error) {
      setMessages([]);
      toast.error(error instanceof Error ? error.message : copy.startError);
      return null;
    } finally {
      setIsStarting(false);
      setIsThinking(false);
      setAgentActivity(null);
    }
  };

  const sendToSession = async (
    text: string,
    targetSession: AgentSession,
    appendUser = true,
    activityLabel = copy.thinking,
  ) => {
    const streamingId = createId('assistant-stream');
    if (appendUser) {
      setMessages((current) => [
        ...current,
        { id: createId('user'), role: 'user', content: text },
      ]);
    }
    setIsThinking(true);
    setAgentActivity(activityLabel);

    try {
      const result = await sendAgentMessage(
        { sessionId: targetSession.id, message: text },
        (content) => streamIntoMessage(streamingId, content),
      );
      applyResult(result, streamingId);
      return result;
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== streamingId || message.content.trim().length > 0,
        ),
      );
      toast.error(error instanceof Error ? error.message : copy.chatError);
      return undefined;
    } finally {
      setIsThinking(false);
      setAgentActivity(null);
    }
  };

  const selectSuggestion = async (suggestion: AgentSuggestion) => {
    if (suggestion.mode === 'manual') {
      setPickerOpen(true);
      return;
    }
    await startSession(suggestion);
  };

  const selectProblem = async (selectedProblem: AgentProblem) => {
    setPickerOpen(false);
    await startSession(
      {
        id: `manual-${selectedProblem.id}`,
        mode: 'manual',
        title: copy.manualTitle,
        problemId: selectedProblem.progressId || selectedProblem.id,
      },
      selectedProblem,
    );
  };

  const startCustomReview = async (event: FormEvent) => {
    event.preventDefault();
    const message = customPrompt.trim();
    if (!message) return;
    setCustomPrompt('');

    const result = await startSession(
      { id: 'custom', mode: 'custom', title: message },
      undefined,
      message,
    );
    if (result?.session && !result.message && !result.messages?.length) {
      await sendToSession(message, result.session, false);
    }
  };

  const submitCode = async (input: {
    language: string;
    code: string;
    executionOutput: string | null;
  }) => {
    if (!session) return;
    const streamingId = createId('assistant-stream');
    setIsSubmittingCode(true);
    setIsThinking(true);
    setAgentActivity(copy.analyzingCode);
    setMessages((current) => [
      ...current,
      {
        id: createId('user-code'),
        role: 'user',
        content: `${copy.codeSubmitted} · ${input.language}`,
      },
    ]);

    try {
      const result = await submitCodeToAgent(
        {
          sessionId: session.id,
          language: input.language,
          code: input.code,
          executionOutput: input.executionOutput,
        },
        (content) => streamIntoMessage(streamingId, content),
        (activity) => setAgentActivity(activity),
      );
      if (result.error) throw new Error(result.error);
      setProblem((current) =>
        current
          ? {
              ...current,
              language: input.language,
              code: input.code,
              notes: result.notes || current.notes,
            }
          : current,
      );
      if (result.testReport) {
        const report = result.testReport;
        const details = report.results.map((test) => {
          const icon = test.status === 'observed' ? '🔎' : test.passed ? '✅' : '❌';
          const outcome = test.error
            ? test.error
            : test.status === 'observed'
              ? `输入=${JSON.stringify(test.input)}\n\n实际=${JSON.stringify(test.actual)}`
              : `输入=${JSON.stringify(test.input)}\n\n期望=${JSON.stringify(test.expected)}\n\n实际=${JSON.stringify(test.actual)}`;
          return `### ${icon} ${test.name}\n\n${outcome}`;
        });
        setMessages((current) => [
          ...current,
          {
            id: createId('tool-auto-test-result'),
            role: 'tool',
            content: report.observed
              ? `**${report.observed} ${copy.testsObserved}**\n\n${details.join('\n\n')}`
              : `**${report.passed} ${copy.testsPassed} · ${report.failed} ${copy.testsFailed}**\n\n${details.join('\n\n')}`,
          },
        ]);
      }
      applyResult(result, streamingId);
      if (result.memorySaved) toast.success(copy.memorySaved);
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== streamingId || message.content.trim().length > 0,
        ),
      );
      toast.error(error instanceof Error ? error.message : copy.codeError);
      throw error;
    } finally {
      setIsSubmittingCode(false);
      setIsThinking(false);
      setAgentActivity(null);
    }
  };

  const openCompletionFromAction = (action: AgentAction) => {
    const rating =
      typeof action.rating === 'number'
        ? Math.round(action.rating)
        : typeof action.suggestedRating === 'number'
          ? Math.round(action.suggestedRating)
          : 3;
    const summary =
      typeof action.summary === 'string' ? action.summary : proposal?.summary || '';
    setProposal({ rating: Math.min(5, Math.max(0, rating)), summary });
    setCompletionOpen(true);
  };

  const runTestsFromAction = async (action: AgentAction) => {
    if (!session || !problem?.code || !problem.language || isRunningTests) return;
    if (!action.testPlan) {
      toast.error(copy.invalidTestPlan);
      return;
    }

    const streamingId = createId('assistant-test-stream');
    const runningMessageId = createId('tool-test-running');
    setIsRunningTests(true);
    setIsThinking(true);
    setAgentActivity(copy.runningAgentTests);

    try {
      const result = await executeAgentTests(
        {
          sessionId: session.id,
          language: problem.language,
          code: problem.code,
          testPlan: action.testPlan,
        },
        (content) => streamIntoMessage(streamingId, content),
      );

      if (result.testReport) {
        const report = result.testReport;
        const details = report.results.map((test) => {
          const icon = test.status === 'observed' ? '🔎' : test.passed ? '✅' : '❌';
          const resultText = test.error
            ? test.error
            : test.status === 'observed'
              ? `input=${JSON.stringify(test.input)}, actual=${JSON.stringify(test.actual)}`
              : `expected=${JSON.stringify(test.expected)}, actual=${JSON.stringify(test.actual)}`;
          return `### ${icon} ${test.name}\n\n${resultText}`;
        });
        setMessages((current) => [
          ...current.filter((message) => message.id !== runningMessageId),
          {
            id: createId('tool-test-result'),
            role: 'tool',
            content: report.observed
              ? `**${report.observed} ${copy.testsObserved}**\n\n${details.join('\n\n')}`
              : `**${report.passed} ${copy.testsPassed} · ${report.failed} ${copy.testsFailed}**\n\n${details.join('\n\n')}`,
          },
        ]);
      }

      if (result.notes) {
        setProblem((current) => current ? { ...current, notes: result.notes } : current);
      }
      applyResult(result, streamingId);
      if (result.memorySaved) toast.success(copy.memorySaved);
    } catch (error) {
      setMessages((current) => current.filter(
        (message) => message.id !== runningMessageId && message.id !== streamingId,
      ));
      toast.error(error instanceof Error ? error.message : copy.codeError);
    } finally {
      setIsRunningTests(false);
      setIsThinking(false);
      setAgentActivity(null);
    }
  };

  const handleAction = (action: AgentAction) => {
    if (isEditorAction(action.type)) {
      setEditorOpen(true);
    } else if (isTestAction(action.type)) {
      void runTestsFromAction(action);
    } else if (isCompletionAction(action.type)) {
      openCompletionFromAction(action);
    }
  };

  const prepareCompletion = async () => {
    if (!session || session.status === 'completed') return;
    if (proposal?.summary) {
      setCompletionOpen(true);
      return;
    }

    const prompt =
      uiLanguage === 'en'
        ? 'Please summarize this review and propose a mastery rating from 0 to 5.'
        : '请总结本次复习，并提出 0 到 5 的掌握度建议。';
    const result = await sendToSession(prompt, session, true, copy.preparingSummary);
    const nextProposal = result?.proposal ||
      (result?.message?.content
        ? { rating: 3, summary: result.message.content }
        : {
            rating: 3,
            summary:
              uiLanguage === 'en'
                ? 'Completed a guided Agent review session.'
                : '完成了一次 Agent 引导复习。',
          });
    setProposal(nextProposal);
    setCompletionOpen(true);
  };

  const completeReview = async (input: {
    rating: number;
    summary: string;
    appendToNotes: boolean;
  }) => {
    if (!session || isCompleting) return;
    setIsCompleting(true);
    try {
      const result = await completeAgentReview({
        sessionId: session.id,
        ...input,
      });
      setSession((current) =>
        current ? { ...current, status: 'completed' } : current,
      );
      setProposal({ rating: input.rating, summary: input.summary });
      setCompletionOpen(false);
      if (result.message) {
        applyResult(result);
      } else {
        setMessages((current) => [
          ...current,
          {
            id: createId('assistant-completed'),
            role: 'assistant',
            content: `✅ ${copy.finishSuccess}`,
          },
        ]);
      }
      toast.success(copy.finishSuccess);
      void refreshSuggestions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.completeError);
    } finally {
      setIsCompleting(false);
    }
  };

  const resetSession = () => {
    setSession(null);
    setProblem(undefined);
    setMessages([]);
    setProposal(undefined);
    setEditorOpen(false);
    setCompletionOpen(false);
    setAgentActivity(null);
    void refreshSuggestions();
  };

  return (
    <div className="relative min-h-full w-full pb-20 md:pb-2">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.28) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />
      <div className="pointer-events-none absolute left-[8%] top-10 size-72 rounded-full bg-orange-200/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[8%] top-32 size-80 rounded-full bg-violet-200/15 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-lg shadow-gray-900/15">
              <BrainCircuit className="size-6" />
              <Sparkles className="absolute -right-1 -top-1 size-4 rounded-full bg-[#ffa116] p-0.5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 rounded-full border bg-white/80 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur',
              status === null
                ? 'border-gray-200 text-gray-500'
                : agentReady
                  ? 'border-emerald-100 text-emerald-700'
                  : 'border-rose-100 text-rose-700',
            )}
          >
            {status === null ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : agentReady ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <CloudOff className="size-3.5" />
            )}
            {status === null
              ? copy.checking
              : agentReady
                ? `${copy.online}${status.model ? ` · ${status.model}` : ''}`
                : copy.offline}
          </div>
        </header>

        {!session && !isStarting ? (
          <div className="mx-auto max-w-5xl">
            {!bootstrapLoading && !agentReady && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-2xl border border-rose-100 bg-rose-50/90 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
                    <div>
                      <h2 className="text-sm font-semibold text-rose-900">
                        {copy.setupTitle}
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-rose-700/80">
                        {status?.message || copy.setupDescription}
                      </p>
                      <code className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-rose-800">
                        <TerminalSquare className="size-3.5" />
                        {status?.serviceReachable &&
                        !status.modelInstalled &&
                        status.model
                          ? `ollama pull ${status.model}`
                          : copy.setupCommand}
                      </code>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void retryStatus()}
                    className="shrink-0 rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                  >
                    <RefreshCw className="size-3.5" />
                    {copy.retry}
                  </Button>
                </div>
              </motion.div>
            )}

            <section className="overflow-hidden rounded-[2rem] border border-white/90 bg-white/75 shadow-[0_24px_90px_rgba(15,23,42,0.09)] backdrop-blur-xl">
              <div className="border-b border-gray-100/80 bg-linear-to-br from-white via-white to-orange-50/60 px-5 py-7 sm:px-8 sm:py-9">
                <div className="flex max-w-2xl items-start gap-3">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-[#e8900f]">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                      {copy.suggestionsTitle}
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-gray-500">
                      {copy.suggestionsDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                {bootstrapLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
                      />
                    ))}
                  </div>
                ) : (
                  <SuggestionBubbles
                    suggestions={displayedSuggestions}
                    disabled={!agentReady || isStarting}
                    onSelect={(suggestion) => void selectSuggestion(suggestion)}
                  />
                )}

                {suggestionsWarning && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                    <AlertCircle className="size-3.5" />
                    {copy.suggestionsError}
                  </p>
                )}

                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-100" />
                  <Sparkles className="size-3.5 text-gray-300" />
                  <span className="h-px flex-1 bg-gray-100" />
                </div>

                <form
                  onSubmit={(event) => void startCustomReview(event)}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-2 transition-all focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-50"
                >
                  <Sparkles className="ml-2 size-4 shrink-0 text-[#ffa116]" />
                  <Input
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    disabled={!agentReady || isStarting}
                    placeholder={copy.customPlaceholder}
                    className="h-10 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="submit"
                    disabled={!agentReady || isStarting || !customPrompt.trim()}
                    className="size-10 rounded-xl bg-gray-900 px-0 text-white hover:bg-gray-800"
                    aria-label={copy.send}
                  >
                    {isStarting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="size-4" />
                    )}
                  </Button>
                </form>
              </div>
            </section>

            <div className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-gray-400">
              <LockKeyhole className="size-3.5" />
              {copy.privacyDescription}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'items-start gap-5',
              session
                ? 'grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]'
                : 'mx-auto max-w-5xl',
            )}
          >
            <AgentConversation
              copy={copy}
              messages={messages}
              isThinking={isThinking}
              activity={agentActivity}
              disabled={!session || session.status === 'completed'}
              onSend={(message) => session
                ? sendToSession(message, session).then(() => undefined)
                : undefined}
              onAction={handleAction}
              onFinish={() => session && void prepareCompletion()}
            />
            {session && (
              <AgentContextPanel
                copy={copy}
                status={status}
                session={session}
                problem={problem}
                onOpenEditor={() => setEditorOpen(true)}
                onFinish={() => void prepareCompletion()}
                onReset={resetSession}
              />
            )}
          </div>
        )}
      </div>

      <ProblemPickerDialog
        open={pickerOpen}
        copy={copy}
        problems={problems}
        onOpenChange={setPickerOpen}
        onSelect={(selected) => void selectProblem(selected)}
      />

      {session && (
        <CodeEditorDialog
          key={session.id}
          open={editorOpen}
          copy={copy}
          sessionId={session.id}
          problem={problem}
          initialLanguage={problem?.language || preferredLang || 'typescript'}
          initialCode={problem?.code || ''}
          submitting={isSubmittingCode}
          onOpenChange={setEditorOpen}
          onSubmit={submitCode}
        />
      )}

      {session && (
        <ReviewCompletionDialog
          key={`${session.id}:${proposal?.rating ?? 3}:${proposal?.summary ?? ''}`}
          open={completionOpen}
          copy={copy}
          proposal={proposal}
          submitting={isCompleting}
          onOpenChange={setCompletionOpen}
          onConfirm={completeReview}
        />
      )}

    </div>
  );
}
