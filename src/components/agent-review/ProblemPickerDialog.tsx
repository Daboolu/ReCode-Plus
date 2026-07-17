'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import type { AgentCopy } from './copy';
import type { AgentProblem } from './types';

interface ProblemPickerDialogProps {
  open: boolean;
  copy: AgentCopy;
  problems: AgentProblem[];
  onOpenChange: (open: boolean) => void;
  onSelect: (problem: AgentProblem) => void;
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

export default function ProblemPickerDialog({
  open,
  copy,
  problems,
  onOpenChange,
  onSelect,
}: ProblemPickerDialogProps) {
  const [query, setQuery] = useState('');
  const filteredProblems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return problems;

    return problems.filter((problem) =>
      [problem.pid, problem.title, ...problem.tags]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [problems, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] overflow-hidden border-white/80 bg-white/95 p-0 shadow-2xl sm:max-w-2xl">
        <DialogHeader className="border-b border-gray-100 px-6 pb-5 pt-6">
          <DialogTitle>{copy.pickerTitle}</DialogTitle>
          <DialogDescription>{copy.pickerDescription}</DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 rounded-xl border-gray-200 bg-gray-50/70 pl-10 shadow-none"
            />
          </div>
        </div>

        <div className="max-h-[54vh] overflow-y-auto px-3 pb-5 sm:px-6">
          {filteredProblems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center text-sm text-gray-400">
              <Search className="mb-3 size-8 text-gray-300" />
              {copy.noProblems}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {filteredProblems.map((problem) => (
                <button
                  key={problem.progressId || problem.id}
                  type="button"
                  onClick={() => onSelect(problem)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-orange-100 hover:bg-orange-50/60 sm:px-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-bold text-gray-500 group-hover:bg-white">
                    {problem.pid}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-800">
                      {problem.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          difficultyClass(problem.difficulty),
                        )}
                      >
                        {problem.difficulty}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Lv. {problem.masteryLevel}/5
                      </span>
                      {problem.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[11px] text-gray-400">
                          · {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#ffa116] opacity-0 transition-opacity group-hover:opacity-100">
                    {copy.choose}
                    <Check className="size-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
