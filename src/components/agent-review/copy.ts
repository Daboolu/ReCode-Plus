export type AgentCopy = ReturnType<typeof getAgentCopy>;

export function getAgentCopy(language: 'zh' | 'en' | string) {
  const zh = language !== 'en';

  return {
    title: zh ? 'Agent 复习' : 'Agent Review',
    subtitle: zh
      ? '你的本地对话式算法复习教练'
      : 'Your local, conversational algorithm coach',
    local: zh ? '本地运行' : 'Runs locally',
    online: zh ? '模型已就绪' : 'Model ready',
    offline: zh ? '本地模型未就绪' : 'Local model unavailable',
    checking: zh ? '正在检测本地模型…' : 'Checking local model…',
    retry: zh ? '重新检测' : 'Check again',
    setupTitle: zh ? '需要启动本地 Agent' : 'Start your local Agent',
    setupDescription: zh
      ? '请先启动 Ollama，并确认已下载项目配置的模型。普通复习功能不受影响。'
      : 'Start Ollama and make sure the configured model is installed. Regular review remains available.',
    setupCommand: 'ollama serve',
    suggestionsTitle: zh ? '今天想怎么复习？' : 'How would you like to review?',
    suggestionsDescription: zh
      ? '选择一个建议后，Agent 才会读取相关题目并开始推理。'
      : 'The Agent only loads problem context and starts reasoning after you choose.',
    dueTitle: zh ? '开始今日到期的题目' : 'Review questions due today',
    dueDescription: zh ? '沿用现有复习队列和顺序' : 'Uses your existing review queue and order',
    weakestTitle: zh ? '复习掌握度最低的题目' : 'Review your weakest question',
    weakestDescription: zh ? '优先巩固薄弱知识点' : 'Focus on your weakest knowledge',
    randomTitle: zh ? '随机复习一道题' : 'Review a random question',
    randomDescription: zh ? '给今天一点意外挑战' : 'Add a surprise challenge to today',
    manualTitle: zh ? '自己选择一道题' : 'Choose a question',
    manualDescription: zh ? '按题号、名称或标签搜索' : 'Search by ID, title, or tag',
    customPlaceholder: zh
      ? '也可以直接说：帮我复习动态规划…'
      : 'Or say: Help me review dynamic programming…',
    send: zh ? '发送' : 'Send',
    starting: zh ? 'Agent 正在准备复习上下文…' : 'Agent is preparing your review context…',
    thinking: zh ? '正在思考' : 'Thinking',
    preparingContext: zh ? '正在读取题目、最新代码和 Note…' : 'Reading the problem, latest code, and Note…',
    analyzingCode: zh ? '已接收代码，正在分析并准备测试…' : 'Code received. Analyzing it and preparing tests…',
    preparingSummary: zh ? '正在整理本次复习证据和总结…' : 'Organizing review evidence and preparing a summary…',
    inputPlaceholder: zh ? '回复 Agent，或描述你卡住的地方…' : 'Reply to the Agent or describe where you are stuck…',
    openEditor: zh ? '打开编程编辑器' : 'Open code editor',
    reviewResult: zh ? '查看复习总结' : 'View review summary',
    endReview: zh ? '完成本次复习' : 'Finish review',
    backToSuggestions: zh ? '返回复习建议' : 'Back to suggestions',
    currentProblem: zh ? '当前题目' : 'Current problem',
    mastery: zh ? '当前掌握度' : 'Current mastery',
    session: zh ? '复习 Session' : 'Review session',
    active: zh ? '进行中' : 'Active',
    completed: zh ? '已完成' : 'Completed',
    privacyTitle: zh ? '本机私密运行' : 'Private and local',
    privacyDescription: zh
      ? '题目、代码和笔记只会发送给本机 Ollama。代码仅在你点击运行或提交时处理。'
      : 'Problems, code, and notes are only sent to local Ollama. Code is processed only when you run or submit it.',
    pickerTitle: zh ? '选择一道题开始复习' : 'Choose a question to review',
    pickerDescription: zh ? '搜索已记录的题目' : 'Search your saved questions',
    searchPlaceholder: zh ? '搜索题号、标题或标签…' : 'Search ID, title, or tag…',
    noProblems: zh ? '没有找到匹配的题目' : 'No matching questions found',
    choose: zh ? '选择' : 'Choose',
    editorTitle: zh ? '编程练习' : 'Coding exercise',
    editorPrompt: zh ? '独立完成代码，运行后再提交给 Agent。' : 'Work independently, run it, then submit to the Agent.',
    language: zh ? '语言' : 'Language',
    run: zh ? '运行代码' : 'Run code',
    running: zh ? '运行中…' : 'Running…',
    console: zh ? '运行输出' : 'Output',
    noOutput: zh ? '运行结果会显示在这里。' : 'Execution output will appear here.',
    saveDraft: zh ? '保存草稿' : 'Save draft',
    submitCode: zh ? '提交给 Agent' : 'Submit to Agent',
    submittingCode: zh ? '提交中…' : 'Submitting…',
    runAgentTests: zh ? '运行 Agent 测试' : 'Run Agent tests',
    runningAgentTests: zh ? '正在执行 Agent 生成的测试…' : 'Running Agent-generated tests…',
    testsPassed: zh ? '个测试通过' : 'tests passed',
    testsFailed: zh ? '个测试失败' : 'tests failed',
    testsObserved: zh ? '次调用已观察' : 'calls observed',
    memorySaved: zh ? '测试结论已写入题目 Note，后续对话会继续读取' : 'Test findings were saved to Note for future context',
    invalidTestPlan: zh ? 'Agent 没有返回可执行的结构化测试计划' : 'The Agent did not return a valid structured test plan',
    draftSaved: zh ? '草稿已保存在当前浏览器' : 'Draft saved in this browser',
    completionTitle: zh ? '确认本次复习结果' : 'Confirm review result',
    completionDescription: zh
      ? 'Agent 只能提出建议，最终评分和总结由你确认。'
      : 'The Agent can only make a suggestion. You confirm the final rating and summary.',
    suggestedMastery: zh ? '本次掌握度' : 'Mastery this time',
    summary: zh ? '复习总结' : 'Review summary',
    summaryPlaceholder: zh ? '记录本次掌握的内容和下次重点…' : 'What did you learn, and what should you revisit next time?',
    appendNotes: zh ? '同时追加到题目 Note' : 'Also append to the problem note',
    appendNotesHint: zh ? '默认只保存到复习时间线，不覆盖原 Note。' : 'By default this is saved only to the review timeline and never overwrites your note.',
    cancel: zh ? '取消' : 'Cancel',
    confirm: zh ? '确认并完成复习' : 'Confirm and finish',
    completing: zh ? '正在保存…' : 'Saving…',
    finishSuccess: zh ? '本次 Agent 复习已保存' : 'Agent review saved',
    chatError: zh ? 'Agent 暂时没有响应，请重试。' : 'The Agent did not respond. Please try again.',
    startError: zh ? '无法开始 Agent 复习。' : 'Could not start Agent review.',
    codeError: zh ? '代码提交失败，请重试。' : 'Could not submit code. Please try again.',
    completeError: zh ? '保存复习结果失败。' : 'Could not save the review result.',
    suggestionsError: zh ? '动态建议暂时不可用，仍可使用基础复习入口。' : 'Dynamic suggestions are unavailable; basic options are still available.',
    codeSubmitted: zh ? '已提交代码供 Agent 分析' : 'Submitted code for Agent analysis',
    newSession: zh ? '开始新的复习' : 'Start a new review',
    emptyConversation: zh ? 'Agent 正在准备第一条消息…' : 'The Agent is preparing the first message…',
  };
}
