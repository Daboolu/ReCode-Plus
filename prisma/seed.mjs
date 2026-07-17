import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PLATFORM = "DEMO";
const DEMO_NOTE_PREFIX = "[Demo seed]";

const hoursFromNow = (hours) =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

const daysAgo = (days) => hoursFromNow(-days * 24);

const demoProblems = [
  {
    pid: "D-001",
    title: "Two Sum",
    slug: "two-sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    difficultyLevel: 1,
    tags: "Array,Hash Table",
    status: "Reviewing",
    notes:
      "调试重点：复述为什么哈希表能把 O(n²) 降到 O(n)，并说明重复元素的处理顺序。",
    masteryLevel: 4,
    interval: 14,
    easiness: 2.7,
    reviewCount: 4,
    lastReview: daysAgo(16),
    nextReview: daysAgo(2),
    createdAt: daysAgo(35),
    submission: {
      language: "python",
      code: `def two_sum(nums, target):
    seen = {}
    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]
        seen[value] = index
    return []`,
    },
  },
  {
    pid: "D-002",
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    url: "https://leetcode.com/problems/valid-parentheses/",
    difficulty: "Easy",
    difficultyLevel: 1,
    tags: "String,Stack",
    status: "Reviewing",
    notes:
      "当前代码有一个边界问题：遍历结束以后还需要判断栈是否为空，适合让 Agent 帮忙定位。",
    masteryLevel: 2,
    interval: 1,
    easiness: 2.35,
    reviewCount: 2,
    lastReview: daysAgo(3),
    nextReview: daysAgo(1),
    createdAt: daysAgo(12),
    submission: {
      language: "python",
      code: `def is_valid(s):
    stack = []
    pairs = {"(": ")", "[": "]", "{": "}"}

    for char in s:
        if char in pairs:
            stack.append(char)
        elif not stack or pairs[stack.pop()] != char:
            return False

    return True  # TODO: 这里遗漏了一个边界条件`,
    },
  },
  {
    pid: "D-003",
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal",
    url: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    difficulty: "Medium",
    difficultyLevel: 2,
    tags: "Tree,Binary Tree,Breadth-First Search",
    status: "Reviewing",
    notes:
      "需要能解释：为什么每一轮先保存 queue.length，不能直接使用不断变化的队列长度。",
    masteryLevel: 3,
    interval: 3,
    easiness: 2.5,
    reviewCount: 3,
    lastReview: daysAgo(3),
    nextReview: hoursFromNow(-2),
    createdAt: daysAgo(20),
    submission: {
      language: "typescript",
      code: `function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];

  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const size = queue.length;
    const level: number[] = [];

    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}`,
    },
  },
  {
    pid: "D-004",
    title: "Coin Change",
    slug: "coin-change",
    url: "https://leetcode.com/problems/coin-change/",
    difficulty: "Medium",
    difficultyLevel: 2,
    tags: "Array,Dynamic Programming,Breadth-First Search",
    status: "Reviewing",
    notes:
      "薄弱点：dp[x] 的含义和初始值容易混淆。先用 amount=6、coins=[1,3,4] 手推状态转移。",
    masteryLevel: 1,
    interval: 1,
    easiness: 2.2,
    reviewCount: 2,
    lastReview: daysAgo(8),
    nextReview: daysAgo(7),
    createdAt: daysAgo(18),
    submission: null,
  },
  {
    pid: "D-005",
    title: "Merge Intervals",
    slug: "merge-intervals",
    url: "https://leetcode.com/problems/merge-intervals/",
    difficulty: "Medium",
    difficultyLevel: 2,
    tags: "Array,Sorting",
    status: "Solved",
    notes:
      "已经基本掌握。复习时重点说明排序为什么是必要步骤，以及相邻区间的判断条件。",
    masteryLevel: 5,
    interval: 21,
    easiness: 2.75,
    reviewCount: 5,
    lastReview: daysAgo(14),
    nextReview: hoursFromNow(7 * 24),
    createdAt: daysAgo(42),
    submission: {
      language: "cpp",
      code: `vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> result;

    for (const auto& interval : intervals) {
        if (result.empty() || result.back()[1] < interval[0]) {
            result.push_back(interval);
        } else {
            result.back()[1] = max(result.back()[1], interval[1]);
        }
    }

    return result;
}`,
    },
  },
  {
    pid: "D-006",
    title: "LRU Cache",
    slug: "lru-cache",
    url: "https://leetcode.com/problems/lru-cache/",
    difficulty: "Medium",
    difficultyLevel: 2,
    tags: "Hash Table,Linked List,Design,Doubly-Linked List",
    status: "Reviewing",
    notes:
      "当前最薄弱题。目标是说清楚哈希表与双向链表各自负责什么，并完成 get/put 的 O(1) 实现。",
    masteryLevel: 0,
    interval: 0,
    easiness: 2.1,
    reviewCount: 1,
    lastReview: daysAgo(4),
    nextReview: daysAgo(4),
    createdAt: daysAgo(4),
    submission: {
      language: "python",
      code: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        # TODO: 初始化哈希表和双向链表

    def get(self, key: int) -> int:
        raise NotImplementedError

    def put(self, key: int, value: int) -> None:
        raise NotImplementedError`,
    },
  },
];

async function clearDemoData() {
  const problems = await prisma.problem.findMany({
    where: { platform: DEMO_PLATFORM },
    select: { id: true },
  });
  const problemIds = problems.map((problem) => problem.id);

  if (problemIds.length === 0) {
    console.log("No demo data to remove.");
    return;
  }

  const progressRows = await prisma.progress.findMany({
    where: { problemId: { in: problemIds } },
    select: { id: true },
  });
  const progressIds = progressRows.map((progress) => progress.id);
  const sessions = await prisma.agentReviewSession.findMany({
    where: { progressId: { in: progressIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  await prisma.$transaction([
    prisma.agentMessage.deleteMany({
      where: { sessionId: { in: sessionIds } },
    }),
    prisma.agentReviewSession.deleteMany({
      where: { id: { in: sessionIds } },
    }),
    prisma.reviewEvent.deleteMany({
      where: { progressId: { in: progressIds } },
    }),
    prisma.submission.deleteMany({
      where: { progressId: { in: progressIds } },
    }),
    prisma.progress.deleteMany({
      where: { id: { in: progressIds } },
    }),
    prisma.problem.deleteMany({
      where: { id: { in: problemIds } },
    }),
  ]);

  console.log(`Removed ${problemIds.length} demo problems.`);
}

async function seedDemoData() {
  let user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: "local-debugger",
        preferredLang: "python",
        uiLanguage: "en",
      },
    });
    console.log(`Created local user: ${user.username}`);
  }

  for (const item of demoProblems) {
    const {
      submission,
      status,
      notes,
      masteryLevel,
      interval,
      easiness,
      reviewCount,
      lastReview,
      nextReview,
      createdAt,
      ...problemData
    } = item;

    const problem = await prisma.problem.upsert({
      where: {
        platform_pid: {
          platform: DEMO_PLATFORM,
          pid: item.pid,
        },
      },
      update: problemData,
      create: {
        platform: DEMO_PLATFORM,
        ...problemData,
      },
    });

    const progressData = {
      status,
      notes,
      masteryLevel,
      interval,
      easiness,
      reviewCount,
      lastReview,
      nextReview,
    };

    const progress = await prisma.progress.upsert({
      where: {
        userId_problemId: {
          userId: user.id,
          problemId: problem.id,
        },
      },
      update: progressData,
      create: {
        userId: user.id,
        problemId: problem.id,
        createdAt,
        ...progressData,
      },
    });

    if (submission) {
      await prisma.submission.upsert({
        where: { progressId: progress.id },
        update: { ...submission, isMain: true },
        create: {
          progressId: progress.id,
          ...submission,
          isMain: true,
        },
      });
    } else {
      await prisma.submission.deleteMany({ where: { progressId: progress.id } });
    }

    await prisma.reviewEvent.deleteMany({
      where: {
        progressId: progress.id,
        note: { startsWith: DEMO_NOTE_PREFIX },
      },
    });

    const events = [
      {
        progressId: progress.id,
        type: "created",
        masteryAfter: 0,
        intervalAfter: 1,
        easinessAfter: 2.5,
        note: `${DEMO_NOTE_PREFIX} Problem added`,
        createdAt,
      },
    ];

    if (lastReview) {
      events.push({
        progressId: progress.id,
        type: "reviewed",
        rating: masteryLevel,
        masteryBefore: Math.max(0, masteryLevel - 1),
        masteryAfter: masteryLevel,
        intervalBefore: Math.max(0, interval - 1),
        intervalAfter: interval,
        easinessBefore: Math.max(1.3, easiness - 0.1),
        easinessAfter: easiness,
        note: `${DEMO_NOTE_PREFIX} Review history`,
        createdAt: lastReview,
      });
    }

    if (submission) {
      events.push({
        progressId: progress.id,
        type: "submission",
        masteryBefore: masteryLevel,
        masteryAfter: masteryLevel,
        intervalBefore: interval,
        intervalAfter: interval,
        easinessBefore: easiness,
        easinessAfter: easiness,
        note: `${DEMO_NOTE_PREFIX} ${submission.language} solution saved`,
        createdAt: new Date(lastReview.getTime() + 60 * 1000),
      });
    }

    await prisma.reviewEvent.createMany({ data: events });
  }

  const dueCount = await prisma.progress.count({
    where: {
      userId: user.id,
      problem: { platform: DEMO_PLATFORM },
      nextReview: { lte: new Date() },
      status: { not: "Todo" },
    },
  });

  console.log(
    `Seeded ${demoProblems.length} demo problems for ${user.username}; ${dueCount} are due now.`,
  );
}

async function main() {
  if (process.argv.includes("--clear")) {
    await clearDemoData();
    return;
  }

  await seedDemoData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
