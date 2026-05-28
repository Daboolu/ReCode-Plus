import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import QuestionsPageClient from "@/components/questions/QuestionsPageClient";

import { QuestionRowData } from "@/types";

export default async function QuestionsPage() {
  const user = await prisma.user.findFirst();
  if (!user) redirect("/onboarding");

  // get all Progress of this user
  const rawProgress = await prisma.progress.findMany({
    where: {
      userId: user.id,
      status: { not: "Todo" },
    },
    include: {
      problem: true,
      submission: true,
      reviewEvents: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const questions: QuestionRowData[] = rawProgress.map((p) => ({
    id: p.id,
    status: p.status,
    masteryLevel: p.masteryLevel,
    notes: p.notes,
    updatedAt: p.updatedAt,
    nextReview: p.nextReview,
    lastReview: p.lastReview,
    createdAt: p.createdAt,

    problem: {
      id: p.problem.id,
      pid: p.problem.pid,
      title: p.problem.title,
      difficulty: p.problem.difficulty,
      // the data in database is "DP,Array"
      tags: p.problem.tags,
      url: p.problem.url || "",
    },

    submissions: p.submission
      ? [
          {
            language: p.submission.language,
            code: p.submission.code,
          },
        ]
      : [],
    reviewEvents: p.reviewEvents.map((event) => ({
      id: event.id,
      type: event.type,
      rating: event.rating,
      masteryBefore: event.masteryBefore,
      masteryAfter: event.masteryAfter,
      intervalBefore: event.intervalBefore,
      intervalAfter: event.intervalAfter,
      easinessBefore: event.easinessBefore,
      easinessAfter: event.easinessAfter,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  }));

  return (
    <Suspense>
      <QuestionsPageClient initialQuestions={questions} />
    </Suspense>
  );
}
