'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  FlaskConical,
  Keyboard,
  SendHorizontal,
  Square,
  UserRound,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { AgentCopy } from './copy';
import type { AgentAction, AgentMessage } from './types';

interface AgentConversationProps {
  copy: AgentCopy;
  messages: AgentMessage[];
  isThinking: boolean;
  activity?: string | null;
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
  onAction: (action: AgentAction) => void;
  onFinish: () => void;
}

function TypingKeyboard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-8 items-center justify-center rounded-lg bg-orange-50 text-[#e8900f]">
        <Keyboard className="size-4.5" />
        <motion.span
          className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-white bg-emerald-500"
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      </div>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="mt-1 flex items-end gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((key) => (
            <motion.span
              key={key}
              className="h-1.5 w-2 rounded-[2px] bg-gray-300"
              animate={{ backgroundColor: ['#d1d5db', '#ffa116', '#d1d5db'], y: [0, -2, 0] }}
              transition={{ duration: 0.65, repeat: Infinity, delay: key * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
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

function AgentActionButton({
  action,
  copy,
  onClick,
}: {
  action: AgentAction;
  copy: AgentCopy;
  onClick: () => void;
}) {
  if (isEditorAction(action.type)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-left text-sm font-semibold text-orange-800 transition-colors hover:bg-orange-100"
      >
        <span className="flex items-center gap-2">
          <Code2 className="size-4 text-[#ffa116]" />
          {action.label || copy.openEditor}
        </span>
        <span className="text-[#ffa116]">→</span>
      </button>
    );
  }

  if (isCompletionAction(action.type)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          {action.label || copy.reviewResult}
        </span>
        <span>→</span>
      </button>
    );
  }

  if (isTestAction(action.type)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-left text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="size-4" />
          {action.label || copy.runAgentTests}
        </span>
        <span>→</span>
      </button>
    );
  }

  return null;
}

function MessageBubble({
  message,
  copy,
  onAction,
}: {
  message: AgentMessage;
  copy: AgentCopy;
  onAction: (action: AgentAction) => void;
}) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const displayContent =
    isUser && message.content.trimStart().startsWith('<code_submission')
      ? copy.codeSubmitted
      : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5 sm:gap-3', isUser && 'flex-row-reverse')}
    >
      <div
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-sm sm:size-9',
          isUser
            ? 'border-gray-200 bg-white text-gray-500'
            : isTool
              ? 'border-blue-100 bg-blue-50 text-blue-600'
            : 'border-orange-100 bg-linear-to-br from-orange-50 to-amber-100 text-[#ffa116]',
        )}
      >
        {isUser ? (
          <UserRound className="size-4" />
        ) : isTool ? (
          <FlaskConical className="size-4" />
        ) : (
          <Bot className="size-4.5" />
        )}
      </div>

      <div
        className={cn(
          'max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]',
          isUser
            ? 'rounded-tr-md bg-gray-900 text-white'
            : isTool
              ? 'rounded-tl-md border border-blue-100 bg-blue-50/70 text-gray-700'
            : 'rounded-tl-md border border-gray-100 bg-white text-gray-700',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{displayContent}</p>
        ) : (
          <div className="prose prose-sm max-w-none break-words prose-headings:mb-2 prose-headings:mt-3 prose-p:my-1.5 prose-pre:my-3 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-gray-900 prose-pre:text-xs prose-code:before:content-none prose-code:after:content-none prose-li:my-0">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        )}

        {!isUser &&
          message.actions?.map((action, index) => (
            <AgentActionButton
              key={`${action.type}-${index}`}
              action={action}
              copy={copy}
              onClick={() => onAction(action)}
            />
          ))}
      </div>
    </motion.div>
  );
}

export default function AgentConversation({
  copy,
  messages,
  isThinking,
  activity,
  disabled,
  onSend,
  onAction,
  onFinish,
}: AgentConversationProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  const submit = async () => {
    const message = draft.trim();
    if (!message || disabled || isThinking) return;
    setDraft('');
    await onSend(message);
  };

  return (
    <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:h-[calc(100vh-11.5rem)] lg:min-h-[650px]">
      <div className="flex items-center justify-between border-b border-gray-100/90 bg-white/70 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
            <BrainCircuit className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              {copy.title}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {copy.active}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFinish}
          className="rounded-xl border-gray-200 bg-white text-xs text-gray-600 shadow-none hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          <CheckCircle2 className="size-3.5" />
          <span className="hidden sm:inline">{copy.endReview}</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 sm:py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                copy={copy}
                onAction={onAction}
              />
            ))}
          </AnimatePresence>

          {messages.length === 0 && !isThinking && (
            <div className="flex min-h-40 items-center justify-center text-sm text-gray-400">
              {copy.emptyConversation}
            </div>
          )}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-[#ffa116]">
                <Bot className="size-4.5" />
              </div>
              <div className="rounded-2xl rounded-tl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <TypingKeyboard label={activity || copy.thinking} />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white/85 p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-2 transition-colors focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-50">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            disabled={disabled}
            placeholder={copy.inputPlaceholder}
            className="max-h-36 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void submit()}
            disabled={!draft.trim() || disabled || isThinking}
            className="size-10 rounded-xl bg-[#ffa116] text-white hover:bg-orange-500"
            aria-label={copy.send}
          >
            {isThinking ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
