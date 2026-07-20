import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ReviewPageClient from '@/components/review/ReviewPageClient';
import { ReviewTask } from '@/types/review';

export default async function ReviewPage() {
  const user = await prisma.user.findFirst();
  if (!user) {
    redirect('/onboarding');
  }

  const now = new Date();

  // Query pending review tasks
  // Condition: The status is not "Todo" and the next review time is less than or equal to the current time.
  const rawReviews = await prisma.progress.findMany({
    where: {
      userId: user.id,
      status: { not: 'Todo' },
      nextReview: { lte: now },
    },
    include: {
      problem: true,
      submission: {
        select: {
          language: true,
          code: true,
        },
      },
      reviewEvents: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: {
      nextReview: 'asc',
    },
  });

  const reviews: ReviewTask[] = rawReviews.map((p) => ({
    id: p.id,
    questionId: p.problem.pid,
    title: p.problem.title,
    difficulty: p.problem.difficulty,
    url: p.problem.url,
    slug: p.problem.slug,
    masteryLevel: p.masteryLevel,
    // Format the date to avoid serialization issues
    lastReviewDate: p.lastReview
      ? p.lastReview.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null,
    lastReview: p.lastReview?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    nextReview: p.nextReview.toISOString(),
    notes: p.notes,
    tags: p.problem.tags,
    submissions: p.submission ? [p.submission] : [],
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

  return <ReviewPageClient initialReviews={reviews} />;
}
