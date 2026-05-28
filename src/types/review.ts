import type { ReviewTimelineEvent } from "@/types/editor";

export interface ReviewTask {
  id: string;
  questionId: string;
  title: string;
  difficulty: string;
  url: string | null;
  slug: string | null;
  masteryLevel: number;
  lastReviewDate: string | null;
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
  nextReview: string;
  notes?: string | null;
  tags?: string;
  submissions?: {
    language: string;
    code: string;
  }[];
  reviewEvents?: ReviewTimelineEvent[];
}

export interface ReviewClientProps {
  initialReviews: ReviewTask[];
}
