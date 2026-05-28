"use server";

import { prisma } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { revalidatePath } from "next/cache";
import { getNextReviewDate } from "@/lib/utils";

export async function submitReviewAction(progressId: string, rating: number) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return { success: false, error: "Unauthorized" };

    const progress = await prisma.progress.findUnique({
      where: { id: progressId },
      include: { problem: true },
    });

    if (!progress || progress.userId !== user.id) {
      return { success: false, error: "Progress not found" };
    }

    // SRS
    const { nextInterval, nextEasiness, status } = calculateNextReview({
      currentInterval: progress.interval,
      currentEasiness: progress.easiness,
      grade: rating,
      difficulty: progress.problem.difficulty,
      reviewCount: progress.reviewCount,
    });

    const nextReviewDate = getNextReviewDate(nextInterval);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.progress.update({
        where: { id: progressId },
        data: {
          masteryLevel: rating,
          easiness: nextEasiness,
          interval: nextInterval,
          status: status === "Mastered" ? "Solved" : "Reviewing",
          reviewCount: { increment: 1 },
          lastReview: now,
          nextReview: nextReviewDate,
        },
      });

      await tx.reviewEvent.create({
        data: {
          progressId,
          type: "reviewed",
          rating,
          masteryBefore: progress.masteryLevel,
          masteryAfter: rating,
          intervalBefore: progress.interval,
          intervalAfter: nextInterval,
          easinessBefore: progress.easiness,
          easinessAfter: nextEasiness,
          note: `Next review in ${nextInterval} day${nextInterval === 1 ? "" : "s"}`,
          createdAt: now,
        },
      });
    });

    revalidatePath("/home");
    revalidatePath("/review");
    revalidatePath("/questions");

    return {
      success: true,
      nextReview: nextReviewDate,
      interval: nextInterval,
    };
  } catch (error) {
    console.error("Review error:", error);
    return { success: false, error: "Failed to submit review" };
  }
}
