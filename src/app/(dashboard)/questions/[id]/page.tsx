import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import QuestionEditor from "@/components/questions/QuestionEditor";
import { EditorFormData } from "@/types/editor";

interface QuestionEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionEditPage({
  params,
}: QuestionEditPageProps) {
  const user = await prisma.user.findFirst();
  if (!user) {
    redirect("/onboarding");
  }

  const { id } = await params;

  // get the recent submission
  const progress = await prisma.progress.findFirst({
    where: {
      id: id,
      userId: user.id,
    },
    include: {
      problem: true,
      submission: true,
      reviewEvents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!progress) {
    redirect("/questions");
  }

  const initialData: EditorFormData = {
    pid: progress.problem.pid,
    title: progress.problem.title,
    difficulty: progress.problem.difficulty,
    // the data in database is "DP,Array", tansform to array
    tags: progress.problem.tags ? progress.problem.tags.split(",") : [],
    link: progress.problem.url || "",
    language: progress.submission?.language || user.preferredLang,
    code: progress.submission?.code || "",
    masteryLevel: progress.masteryLevel,
    notes: progress.notes || "",
  };

  const persistedEvents = progress.reviewEvents.map((event) => ({
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
  }));

  const fallbackEvents = [
    ...(persistedEvents.some((event) => event.type === "created")
      ? []
      : [
          {
            id: `${progress.id}-created`,
            type: "created",
            rating: null,
            masteryBefore: null,
            masteryAfter: progress.masteryLevel,
            intervalBefore: null,
            intervalAfter: progress.interval,
            easinessBefore: null,
            easinessAfter: progress.easiness,
            note: "Problem added",
            createdAt: progress.createdAt.toISOString(),
          },
        ]),
    ...(progress.lastReview &&
    !persistedEvents.some((event) => event.type === "reviewed")
      ? [
          {
            id: `${progress.id}-last-review`,
            type: "reviewed",
            rating: progress.masteryLevel,
            masteryBefore: null,
            masteryAfter: progress.masteryLevel,
            intervalBefore: null,
            intervalAfter: progress.interval,
            easinessBefore: null,
            easinessAfter: progress.easiness,
            note: "Latest review",
            createdAt: progress.lastReview.toISOString(),
          },
        ]
      : []),
  ];

  return (
    <QuestionEditor
      mode="edit"
      initialData={initialData}
      preferredLang={user.preferredLang}
      timelineEvents={[...persistedEvents, ...fallbackEvents]}
    />
  );
}
