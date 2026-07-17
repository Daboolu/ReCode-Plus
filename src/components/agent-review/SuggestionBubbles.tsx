'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarClock,
  CircleGauge,
  Dices,
  History,
  Search,
  Sparkles,
} from 'lucide-react';

import type { AgentSuggestion, AgentSuggestionMode } from './types';

interface SuggestionBubblesProps {
  suggestions: AgentSuggestion[];
  disabled?: boolean;
  onSelect: (suggestion: AgentSuggestion) => void;
}

const iconByMode = {
  due: CalendarClock,
  weakest: CircleGauge,
  random: Dices,
  continue: History,
  manual: Search,
  custom: Sparkles,
} satisfies Record<AgentSuggestionMode, typeof Sparkles>;

const colorByMode = {
  due: 'from-orange-50 to-amber-50 text-orange-600 border-orange-100',
  weakest: 'from-rose-50 to-orange-50 text-rose-600 border-rose-100',
  random: 'from-violet-50 to-fuchsia-50 text-violet-600 border-violet-100',
  continue: 'from-blue-50 to-cyan-50 text-blue-600 border-blue-100',
  manual: 'from-emerald-50 to-teal-50 text-emerald-600 border-emerald-100',
  custom: 'from-slate-50 to-gray-50 text-slate-600 border-slate-100',
} satisfies Record<AgentSuggestionMode, string>;

export default function SuggestionBubbles({
  suggestions,
  disabled,
  onSelect,
}: SuggestionBubblesProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {suggestions.map((suggestion, index) => {
        const Icon = iconByMode[suggestion.mode] || Sparkles;
        const color = colorByMode[suggestion.mode] || colorByMode.custom;

        return (
          <motion.button
            key={suggestion.id}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.055 }}
            whileHover={disabled || suggestion.disabled ? undefined : { y: -3, scale: 1.01 }}
            whileTap={disabled || suggestion.disabled ? undefined : { scale: 0.985 }}
            disabled={disabled || suggestion.disabled}
            onClick={() => onSelect(suggestion)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 text-left shadow-[0_10px_32px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)] disabled:cursor-not-allowed disabled:opacity-55 sm:p-5"
          >
            <div
              className={`mb-4 flex size-11 items-center justify-center rounded-2xl border bg-linear-to-br ${color}`}
            >
              <Icon className="size-5" />
            </div>

            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                  {suggestion.title}
                </h3>
                {typeof suggestion.count === 'number' && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                    {suggestion.count}
                  </span>
                )}
              </div>
              {suggestion.description && (
                <p className="mt-1.5 text-xs leading-5 text-gray-500 sm:text-sm">
                  {suggestion.description}
                </p>
              )}
            </div>

            <ArrowUpRight className="absolute right-4 top-4 size-4 text-gray-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#ffa116]" />
          </motion.button>
        );
      })}
    </div>
  );
}
