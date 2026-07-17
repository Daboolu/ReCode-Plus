import { TAG_MAPPING } from "@/constants/tagMapping";
import { prisma } from "@/lib/db";
import type { AgentProblemSummary, AgentReviewMode, AgentSuggestion } from "@/types/agent";
import { serializeAgentProblem, serializeAgentSession } from "./serialization";

export const agentSessionInclude = {
  progress: {
    include: {
      problem: true,
      submission: {
        select: {
          language: true,
          code: true,
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const progressInclude = {
  problem: true,
  submission: {
    select: {
      language: true,
      code: true,
    },
  },
} as const;

export async function getLocalAgentUser() {
  return prisma.user.findFirst();
}

export async function getOwnedAgentSession(sessionId: string, userId: string) {
  return prisma.agentReviewSession.findFirst({
    where: { id: sessionId, userId },
    include: agentSessionInclude,
  });
}

export async function selectProgressForMode({
  userId,
  mode,
  requestedId,
  query,
}: {
  userId: string;
  mode: AgentReviewMode;
  requestedId?: string;
  query?: string;
}) {
  if (requestedId) {
    return prisma.progress.findFirst({
      where: {
        userId,
        OR: [{ id: requestedId }, { problemId: requestedId }],
      },
      include: progressInclude,
    });
  }

  if (mode === "due") {
    return prisma.progress.findFirst({
      where: {
        userId,
        status: { not: "Todo" },
        nextReview: { lte: new Date() },
      },
      orderBy: { nextReview: "asc" },
      include: progressInclude,
    });
  }

  if (mode === "weakest") {
    return prisma.progress.findFirst({
      where: { userId, status: { not: "Todo" } },
      orderBy: [{ masteryLevel: "asc" }, { lastReview: "asc" }],
      include: progressInclude,
    });
  }

  if (mode === "random") {
    const where = { userId, status: { not: "Todo" } } as const;
    const count = await prisma.progress.count({ where });
    if (count === 0) return null;

    return prisma.progress.findFirst({
      where,
      orderBy: { id: "asc" },
      skip: Math.floor(Math.random() * count),
      include: progressInclude,
    });
  }

  if (mode === "custom") {
    const candidates = await prisma.progress.findMany({
      where: { userId, status: { not: "Todo" } },
      orderBy: { nextReview: "asc" },
      take: 250,
      include: progressInclude,
    });
    if (candidates.length === 0) return null;

    const normalizedQuery = query?.trim().toLocaleLowerCase() ?? "";
    const queryTokens = normalizedQuery
      .split(/[\s,，。.!！?？:：;；/\\]+/)
      .filter((token) => token.length >= 2);
    let best: (typeof candidates)[number] | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const title = candidate.problem.title.toLocaleLowerCase();
      const pid = candidate.problem.pid.toLocaleLowerCase();
      const tags = candidate.problem.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      let score = 0;

      if (normalizedQuery) {
        if (normalizedQuery.includes(pid)) score += 30;
        if (normalizedQuery.includes(title) || title.includes(normalizedQuery)) {
          score += 20;
        }
        for (const tag of tags) {
          const englishTag = tag.toLocaleLowerCase();
          const translatedTag = TAG_MAPPING[tag]?.toLocaleLowerCase();
          if (
            normalizedQuery.includes(englishTag) ||
            (translatedTag && normalizedQuery.includes(translatedTag))
          ) {
            score += 15;
          }
        }
        for (const token of queryTokens) {
          if (title.includes(token) || pid === token) score += 5;
          if (
            tags.some((tag) =>
              `${tag} ${TAG_MAPPING[tag] ?? ""}`
                .toLocaleLowerCase()
                .includes(token),
            )
          ) {
            score += 4;
          }
        }
      }

      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    if (best) return best;

    // A free-form request can still start a useful session when it has no exact
    // text match: prefer an already-due problem, then the weakest candidate.
    const now = new Date();
    const due = candidates.find((candidate) => candidate.nextReview <= now);
    if (due) return due;
    return [...candidates].sort(
      (a, b) =>
        a.masteryLevel - b.masteryLevel ||
        (a.lastReview?.getTime() ?? 0) - (b.lastReview?.getTime() ?? 0),
    )[0];
  }

  return null;
}

export async function getAgentSuggestions(userId: string, uiLanguage: string) {
  const now = new Date();
  const baseWhere = { userId, status: { not: "Todo" } } as const;

  const [dueCount, firstDue, weakest, eligibleCount, activeSession, pickerRows] =
    await Promise.all([
      prisma.progress.count({
        where: { ...baseWhere, nextReview: { lte: now } },
      }),
      prisma.progress.findFirst({
        where: { ...baseWhere, nextReview: { lte: now } },
        orderBy: { nextReview: "asc" },
        select: { id: true },
      }),
      prisma.progress.findFirst({
        where: baseWhere,
        orderBy: [{ masteryLevel: "asc" }, { lastReview: "asc" }],
        select: { id: true, problem: { select: { title: true } } },
      }),
      prisma.progress.count({ where: baseWhere }),
      prisma.agentReviewSession.findFirst({
        where: { userId, status: "active" },
        orderBy: { updatedAt: "desc" },
        include: agentSessionInclude,
      }),
      prisma.progress.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 250,
        include: progressInclude,
      }),
    ]);

  const isChinese = uiLanguage.toLowerCase().startsWith("zh");
  const suggestions: AgentSuggestion[] = [];

  if (activeSession) {
    suggestions.push({
      id: "continue",
      mode: "continue",
      label: isChinese
        ? `继续复习「${activeSession.progress.problem.title}」`
        : `Continue “${activeSession.progress.problem.title}”`,
      description: isChinese
        ? "恢复上次未完成的对话"
        : "Resume your unfinished conversation",
      progressId: activeSession.progressId,
    });
  }

  suggestions.push({
    id: "due",
    mode: "due",
    label: isChinese
      ? dueCount > 0
        ? `开始今日到期的 ${dueCount} 道题`
        : "今天没有到期题目"
      : dueCount > 0
        ? `Review ${dueCount} due problem${dueCount === 1 ? "" : "s"}`
        : "Nothing is due today",
    description: isChinese
      ? "沿用现有 SRS 的到期顺序"
      : "Uses the existing SRS due order",
    count: dueCount,
    progressId: firstDue?.id,
    disabled: dueCount === 0,
  });

  if (weakest) {
    suggestions.push({
      id: "weakest",
      mode: "weakest",
      label: isChinese
        ? `复习薄弱题「${weakest.problem.title}」`
        : `Review weak problem “${weakest.problem.title}”`,
      description: isChinese
        ? "从当前掌握度最低的题目开始"
        : "Start with your lowest-mastery problem",
      count: eligibleCount,
      progressId: weakest.id,
    });
  }

  if (eligibleCount > 0) {
    suggestions.push({
      id: "random",
      mode: "random",
      label: isChinese ? "随机复习一道题" : "Review a random problem",
      description: isChinese
        ? "从已记录的复习题中随机选择"
        : "Pick from your recorded review problems",
      count: eligibleCount,
    });
  }

  suggestions.push({
    id: "manual",
    mode: "manual",
    label: isChinese ? "自己选择一道题" : "Choose a problem",
    description: isChinese
      ? "按题号、标题或标签搜索"
      : "Search by ID, title, or tag",
    count: pickerRows.length,
    disabled: pickerRows.length === 0,
  });

  // Picker responses deliberately omit potentially large notes and code. Full
  // context is returned only after a session has been created.
  const problems: AgentProblemSummary[] = pickerRows.map((row) => ({
    ...serializeAgentProblem(row),
    notes: null,
    code: null,
  }));

  return {
    suggestions,
    problems,
    resumableSession: activeSession
      ? serializeAgentSession(activeSession)
      : null,
  };
}
