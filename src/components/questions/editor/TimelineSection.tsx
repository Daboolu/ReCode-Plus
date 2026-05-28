"use client";

import { CalendarClock, CheckCircle2, Code2, PlusCircle, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ReviewTimelineEvent } from "@/types/editor";
import type { ElementType } from "react";

interface TimelineSectionProps {
  events: ReviewTimelineEvent[];
}

const eventStyles: Record<string, { icon: ElementType; color: string }> = {
  created: {
    icon: PlusCircle,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  reviewed: {
    icon: CheckCircle2,
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  submission: {
    icon: Code2,
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
};

function getEventTitle(type: string, lang: string) {
  if (type === "created") return lang === "zh" ? "加入题库" : "Added";
  if (type === "reviewed") return lang === "zh" ? "完成复习" : "Reviewed";
  if (type === "submission") return lang === "zh" ? "保存代码" : "Code Saved";
  return type;
}

function formatDate(value: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TimelineSection({ events }: TimelineSectionProps) {
  const { lang } = useTranslation();

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 text-white rounded-xl">
            <CalendarClock size={18} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              {lang === "zh" ? "刷题回放时间线" : "Practice Replay"}
            </h2>
            <p className="text-xs font-medium text-gray-400">
              {lang === "zh" ? "记录这道题的保存、复习和掌握变化" : "Saved code, reviews, and mastery changes"}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {events.length}
        </span>
      </div>

      <div className="p-6">
        <div className="relative space-y-5 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
          {events.map((event) => {
            const style = eventStyles[event.type] ?? eventStyles.reviewed;
            const Icon = style.icon;

            return (
              <div key={event.id} className="relative flex gap-4">
                <div
                  className={cn(
                    "relative z-10 h-10 w-10 rounded-xl border flex items-center justify-center shrink-0",
                    style.color
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0 bg-white/70 border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      {getEventTitle(event.type, lang)}
                    </h3>
                    <time className="text-xs font-mono text-gray-400">
                      {formatDate(event.createdAt, lang)}
                    </time>
                  </div>

                  {event.note && (
                    <p className="mt-2 text-sm text-gray-500">{event.note}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.rating !== null && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                        {lang === "zh" ? "评分" : "Rating"} {event.rating}
                      </span>
                    )}
                    {event.masteryAfter !== null && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-100 inline-flex items-center gap-1">
                        <TrendingUp size={12} />
                        Lv.{event.masteryBefore ?? "-"} {"->"} Lv.{event.masteryAfter}
                      </span>
                    )}
                    {event.intervalAfter !== null && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        {lang === "zh" ? "间隔" : "Interval"} {event.intervalBefore ?? "-"} {"->"} {event.intervalAfter}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
