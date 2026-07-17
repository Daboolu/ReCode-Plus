'use client';

import {
  Bot,
  CheckCircle2,
  Code2,
  LockKeyhole,
  RotateCcw,
  Tag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { AgentCopy } from './copy';
import type { AgentProblem, AgentSession, AgentStatus } from './types';

interface AgentContextPanelProps {
  copy: AgentCopy;
  status: AgentStatus | null;
  session: AgentSession;
  problem?: AgentProblem;
  onOpenEditor: () => void;
  onFinish: () => void;
  onReset: () => void;
}

function difficultyClass(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'bg-emerald-50 text-emerald-700';
    case 'hard':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

export default function AgentContextPanel({
  copy,
  status,
  session,
  problem,
  onOpenEditor,
  onFinish,
  onReset,
}: AgentContextPanelProps) {
  const completed = session.status === 'completed';

  return (
    <aside className="space-y-4 lg:sticky lg:top-0">
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/75 shadow-[0_16px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <div className="border-b border-gray-100 bg-linear-to-br from-gray-950 to-gray-800 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
              <Bot className="size-4 text-[#ffa116]" />
              {copy.session}
            </div>
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                completed
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-orange-400/15 text-orange-300',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  completed ? 'bg-emerald-400' : 'bg-orange-400',
                )}
              />
              {completed ? copy.completed : copy.active}
            </span>
          </div>
          <div className="mt-3 truncate font-mono text-[11px] text-gray-500">
            {session.id}
          </div>
        </div>

        {problem ? (
          <div className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              {copy.currentProblem}
            </div>
            <div className="mt-2 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-[#e8900f]">
                {problem.pid}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-5 text-gray-900">
                  {problem.title}
                </h3>
                <span
                  className={cn(
                    'mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    difficultyClass(problem.difficulty),
                  )}
                >
                  {problem.difficulty}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500">{copy.mastery}</span>
                <span className="font-bold text-gray-800">
                  {problem.masteryLevel}/5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <span
                    key={level}
                    className={cn(
                      'h-1.5 rounded-full',
                      level <= problem.masteryLevel
                        ? 'bg-linear-to-r from-[#ffa116] to-amber-400'
                        : 'bg-gray-100',
                    )}
                  />
                ))}
              </div>
            </div>

            {problem.tags.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                  <Tag className="size-3.5" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {problem.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-400">—</div>
        )}

        <div className="space-y-2 border-t border-gray-100 p-4">
          {completed ? (
            <Button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800"
            >
              <RotateCcw className="size-4" />
              {copy.newSession}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={onOpenEditor}
                className="w-full rounded-xl bg-[#ffa116] text-white hover:bg-orange-500"
              >
                <Code2 className="size-4" />
                {copy.openEditor}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onFinish}
                className="w-full rounded-xl border-gray-200 bg-white text-gray-600"
              >
                <CheckCircle2 className="size-4" />
                {copy.endReview}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <h4 className="text-xs font-semibold text-emerald-900">
              {copy.privacyTitle}
            </h4>
            <p className="mt-1 text-[11px] leading-5 text-emerald-700/80">
              {copy.privacyDescription}
            </p>
            {status?.model && (
              <div className="mt-2 inline-flex rounded-md bg-white/70 px-2 py-1 font-mono text-[10px] text-emerald-700">
                {status.model}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
