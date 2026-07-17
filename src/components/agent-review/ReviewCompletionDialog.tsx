'use client';

import { useState } from 'react';
import { Check, Loader2, NotebookPen, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { AgentCopy } from './copy';
import type { ReviewProposal } from './types';

interface ReviewCompletionDialogProps {
  open: boolean;
  copy: AgentCopy;
  proposal?: ReviewProposal;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    rating: number;
    summary: string;
    appendToNotes: boolean;
  }) => Promise<void> | void;
}

export default function ReviewCompletionDialog({
  open,
  copy,
  proposal,
  submitting,
  onOpenChange,
  onConfirm,
}: ReviewCompletionDialogProps) {
  const [rating, setRating] = useState(proposal?.rating ?? 3);
  const [summary, setSummary] = useState(proposal?.summary ?? '');
  const [appendToNotes, setAppendToNotes] = useState(false);

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="border-white/80 bg-white/95 shadow-2xl sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-amber-50 text-[#ffa116]">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{copy.completionTitle}</DialogTitle>
          <DialogDescription>{copy.completionDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <label className="text-sm font-semibold text-gray-800">
              {copy.suggestedMastery}
            </label>
            <div className="mt-2 grid grid-cols-6 gap-1.5 sm:gap-2">
              {[0, 1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRating(score)}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-all',
                    rating === score
                      ? 'border-[#ffa116] bg-orange-50 text-[#e8900f] shadow-[0_0_0_3px_rgba(255,161,22,0.1)]'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-orange-200 hover:bg-orange-50/50',
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="agent-review-summary" className="text-sm font-semibold text-gray-800">
              {copy.summary}
            </label>
            <Textarea
              id="agent-review-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={copy.summaryPlaceholder}
              className="mt-2 min-h-32 resize-y rounded-xl border-gray-200 bg-gray-50/60 shadow-none focus-visible:border-orange-300 focus-visible:ring-orange-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setAppendToNotes((value) => !value)}
            className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-left transition-colors hover:bg-gray-100/80"
          >
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                appendToNotes
                  ? 'border-[#ffa116] bg-[#ffa116] text-white'
                  : 'border-gray-300 bg-white text-transparent',
              )}
            >
              <Check className="size-3.5" />
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <NotebookPen className="size-4 text-gray-400" />
                {copy.appendNotes}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                {copy.appendNotesHint}
              </span>
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={submitting || !summary.trim()}
            onClick={() =>
              void onConfirm({
                rating,
                summary: summary.trim(),
                appendToNotes,
              })
            }
            className="rounded-xl bg-[#ffa116] text-white hover:bg-orange-500"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {submitting ? copy.completing : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
