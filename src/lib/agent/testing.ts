import { executeCodeAction } from "@/actions/execute";
import type {
  AgentTestCase,
  AgentTestPlan,
  AgentTestReport,
  AgentTestResult,
} from "@/types/agent";
import { AgentApiError } from "./errors";

const RESULT_MARKER = "__RECODE_TEST_RESULT__";
const MAX_TESTS = 5;
const MAX_TEST_VALUE_LENGTH = 4_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function serializedLength(value: unknown) {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function readAgentTestPlan(value: unknown): AgentTestPlan {
  if (!isRecord(value)) {
    throw new AgentApiError("testPlan must be an object", 400, "INVALID_TEST_PLAN");
  }
  if (value.mode !== "function" && value.mode !== "stdin") {
    throw new AgentApiError("Unknown test mode", 400, "INVALID_TEST_PLAN");
  }
  if (!Array.isArray(value.tests) || value.tests.length === 0) {
    throw new AgentApiError("At least one test is required", 400, "INVALID_TEST_PLAN");
  }

  const mode = value.mode;
  const functionName = typeof value.functionName === "string"
    ? value.functionName.trim()
    : undefined;
  if (
    mode === "function" &&
    (!functionName || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(functionName))
  ) {
    throw new AgentApiError(
      "functionName must be a plain identifier",
      400,
      "INVALID_TEST_PLAN",
    );
  }
  const className = typeof value.className === "string" && value.className.trim()
    ? value.className.trim()
    : undefined;
  if (className && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(className)) {
    throw new AgentApiError("className must be a plain identifier", 400, "INVALID_TEST_PLAN");
  }

  const tests: AgentTestCase[] = value.tests.slice(0, MAX_TESTS).map((item, index) => {
    if (!isRecord(item)) {
      throw new AgentApiError("Each test must be an object", 400, "INVALID_TEST_PLAN");
    }
    const name = typeof item.name === "string" && item.name.trim()
      ? item.name.trim().slice(0, 120)
      : `Test ${index + 1}`;

    if (mode === "function") {
      if (!Array.isArray(item.args) || !("expected" in item)) {
        throw new AgentApiError(
          "Function tests require args and expected",
          400,
          "INVALID_TEST_PLAN",
        );
      }
      if (serializedLength({ args: item.args, expected: item.expected }) > MAX_TEST_VALUE_LENGTH) {
        throw new AgentApiError("Test values are too large", 400, "INVALID_TEST_PLAN");
      }
      return { name, args: item.args, expected: item.expected };
    }

    if (typeof item.input !== "string" || typeof item.expectedOutput !== "string") {
      throw new AgentApiError(
        "Stdin tests require input and expectedOutput",
        400,
        "INVALID_TEST_PLAN",
      );
    }
    if (item.input.length > MAX_TEST_VALUE_LENGTH || item.expectedOutput.length > MAX_TEST_VALUE_LENGTH) {
      throw new AgentApiError("Test values are too large", 400, "INVALID_TEST_PLAN");
    }
    return { name, input: item.input, expectedOutput: item.expectedOutput };
  });

  const oracle = value.oracle === "model" || value.oracle === "trusted"
    ? value.oracle
    : "trusted";
  return { mode, oracle, className, functionName, tests };
}

function functionHarness(
  language: string,
  code: string,
  functionName: string,
  className: string | undefined,
  test: AgentTestCase,
) {
  const argsJson = JSON.stringify(test.args ?? []);
  const expectedJson = JSON.stringify(test.expected);
  const encodedArgs = JSON.stringify(argsJson);
  const encodedExpected = JSON.stringify(expectedJson);
  const hasTreeNode = /\bTreeNode\b/.test(code);
  const hasListNode = /\bListNode\b/.test(code);

  if (language === "python") {
    return `${code}

import json as __recode_json
import inspect as __recode_inspect

def __recode_tree(value):
    if value is None or hasattr(value, "val"):
        return value
    if isinstance(value, dict) and value.get("$type") == "tree":
        value = value.get("levelOrder", [])
    if isinstance(value, dict):
        node = TreeNode(value.get("val", 0))
        node.left = __recode_tree(value.get("left"))
        node.right = __recode_tree(value.get("right"))
        return node
    if not isinstance(value, list) or not value:
        return None
    nodes = [None if item is None else TreeNode(item) for item in value]
    children = iter(nodes[1:])
    for node in nodes:
        if node is not None:
            node.left = next(children, None)
            node.right = next(children, None)
    return nodes[0]

def __recode_list(value):
    if value is None or hasattr(value, "val"):
        return value
    if isinstance(value, dict) and value.get("$type") == "list":
        value = value.get("values", [])
    if isinstance(value, dict):
        node = ListNode(value.get("val", 0))
        node.next = __recode_list(value.get("next"))
        return node
    if not isinstance(value, list):
        return None
    dummy = ListNode(0)
    current = dummy
    for item in value:
        current.next = ListNode(item)
        current = current.next
    return dummy.next

try:
    __recode_args = __recode_json.loads(${encodedArgs})
    __recode_expected = __recode_json.loads(${encodedExpected})
    if ${hasTreeNode ? "True" : "False"} and __recode_args:
        __recode_args[0] = __recode_tree(__recode_args[0])
    elif ${hasListNode ? "True" : "False"} and __recode_args:
        __recode_args[0] = __recode_list(__recode_args[0])
    __recode_callable = globals().get(${JSON.stringify(functionName)})
    __recode_adapter = None
    if __recode_callable is None:
        __recode_solution = globals().get(${JSON.stringify(className || "Solution")})
        if __recode_solution is None:
            raise NameError("No global function or ${className || "Solution"} class method named ${functionName}")
        __recode_callable = getattr(__recode_solution(), ${JSON.stringify(functionName)})
    else:
        __recode_parameters = list(__recode_inspect.signature(__recode_callable).parameters.values())
        __recode_required = [p for p in __recode_parameters if p.default is __recode_inspect.Parameter.empty and p.kind in (__recode_inspect.Parameter.POSITIONAL_ONLY, __recode_inspect.Parameter.POSITIONAL_OR_KEYWORD)]
        if __recode_parameters and __recode_parameters[0].name in ("self", "cls") and len(__recode_args) == len(__recode_required) - 1:
            __recode_args.insert(0, None)
            __recode_adapter = "Top-level function declares self/cls; executor supplied a placeholder receiver"
        elif len(__recode_args) == 1 and isinstance(__recode_args[0], list) and len(__recode_required) > 1 and len(__recode_args[0]) == len(__recode_required):
            __recode_args = __recode_args[0]
            __recode_adapter = "Expanded one accidentally nested argument list to match the function signature"
    __recode_actual = __recode_callable(*__recode_args)
    print(${JSON.stringify(RESULT_MARKER)} + __recode_json.dumps({
        "passed": __recode_actual == __recode_expected,
        "actual": __recode_actual,
        "expected": __recode_expected,
        "adapter": __recode_adapter
    }, ensure_ascii=False, default=str))
except Exception as __recode_error:
    print(${JSON.stringify(RESULT_MARKER)} + __recode_json.dumps({
        "passed": False,
        "actual": None,
        "expected": __recode_json.loads(${encodedExpected}),
        "error": type(__recode_error).__name__ + ": " + str(__recode_error)
    }, ensure_ascii=False))`;
  }

  if (language === "javascript" || language === "typescript") {
    return `${code}

;(async () => {
  try {
    const __recodeArgs = JSON.parse(${encodedArgs});
    const __recodeExpected = JSON.parse(${encodedExpected});
    const __recodeTree = (value) => {
      if (value == null || (typeof value === "object" && "val" in value && value.constructor?.name === "TreeNode")) return value;
      if (value?.$type === "tree") value = value.levelOrder || [];
      if (!Array.isArray(value)) {
        const node = new TreeNode(value?.val ?? 0);
        node.left = __recodeTree(value?.left ?? null);
        node.right = __recodeTree(value?.right ?? null);
        return node;
      }
      if (!value.length) return null;
      const nodes = value.map((item) => item == null ? null : new TreeNode(item));
      let child = 1;
      for (const node of nodes) if (node) {
        node.left = nodes[child++] ?? null;
        node.right = nodes[child++] ?? null;
      }
      return nodes[0];
    };
    const __recodeList = (value) => {
      if (value == null || (typeof value === "object" && "val" in value && value.constructor?.name === "ListNode")) return value;
      if (value?.$type === "list") value = value.values || [];
      if (!Array.isArray(value)) {
        const node = new ListNode(value?.val ?? 0);
        node.next = __recodeList(value?.next ?? null);
        return node;
      }
      const dummy = new ListNode(0);
      let current = dummy;
      for (const item of value) current = current.next = new ListNode(item);
      return dummy.next;
    };
    if (${hasTreeNode} && __recodeArgs.length) __recodeArgs[0] = __recodeTree(__recodeArgs[0]);
    else if (${hasListNode} && __recodeArgs.length) __recodeArgs[0] = __recodeList(__recodeArgs[0]);
    ${className ? `const __recodeInstance = new ${className}();` : ""}
    const __recodeCallable = ${className ? `__recodeInstance[${JSON.stringify(functionName)}].bind(__recodeInstance)` : functionName};
    const __recodeActual = await __recodeCallable(...__recodeArgs);
    console.log(${JSON.stringify(RESULT_MARKER)} + JSON.stringify({
      passed: JSON.stringify(__recodeActual) === JSON.stringify(__recodeExpected),
      actual: __recodeActual,
      expected: __recodeExpected,
    }));
  } catch (__recodeError) {
    console.log(${JSON.stringify(RESULT_MARKER)} + JSON.stringify({
      passed: false,
      actual: null,
      expected: JSON.parse(${encodedExpected}),
      error: __recodeError instanceof Error ? __recodeError.message : String(__recodeError),
    }));
  }
})();`;
  }

  throw new AgentApiError(
    "Function tests currently support Python, JavaScript, and TypeScript",
    400,
    "UNSUPPORTED_TEST_MODE",
  );
}

function parseFunctionResult(
  test: AgentTestCase,
  execution: Awaited<ReturnType<typeof executeCodeAction>>,
): AgentTestResult {
  const markerLine = execution.output
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith(RESULT_MARKER));

  if (!markerLine) {
    return {
      name: test.name,
      passed: false,
      input: test.args,
      expected: test.expected,
      actual: null,
      error: execution.output.slice(0, 2_000),
    };
  }

  try {
    const parsed: unknown = JSON.parse(markerLine.slice(RESULT_MARKER.length));
    if (!isRecord(parsed)) throw new Error("Invalid result object");
    return {
      name: test.name,
      passed: parsed.passed === true,
      input: test.args,
      expected: parsed.expected,
      actual: parsed.actual,
      error: typeof parsed.error === "string" ? parsed.error.slice(0, 2_000) : undefined,
      adapter: typeof parsed.adapter === "string" ? parsed.adapter.slice(0, 500) : undefined,
    };
  } catch (error) {
    return {
      name: test.name,
      passed: false,
      input: test.args,
      expected: test.expected,
      actual: null,
      error: error instanceof Error ? error.message : "Invalid test result",
    };
  }
}

export async function runAgentTestPlan({
  language,
  code,
  testPlan,
  onProgress,
}: {
  language: string;
  code: string;
  testPlan: AgentTestPlan;
  onProgress?: (progress: {
    index: number;
    total: number;
    name: string;
  }) => void;
}): Promise<AgentTestReport> {
  const results: AgentTestResult[] = [];

  for (const [index, test] of testPlan.tests.entries()) {
    onProgress?.({
      index: index + 1,
      total: testPlan.tests.length,
      name: test.name,
    });
    if (testPlan.mode === "function") {
      const harness = functionHarness(
        language,
        code,
        testPlan.functionName!,
        testPlan.className,
        test,
      );
      const execution = await executeCodeAction(language, harness);
      results.push(parseFunctionResult(test, execution));
      continue;
    }

    const execution = await executeCodeAction(language, code, test.input ?? "");
    const actual = execution.success && execution.output === "Execution finished with no output."
      ? ""
      : execution.output.trim();
    const expected = (test.expectedOutput ?? "").trim();
    results.push({
      name: test.name,
      passed: execution.success && actual === expected,
      input: test.input ?? "",
      expected,
      actual,
      error: execution.success ? undefined : execution.output.slice(0, 2_000),
    });
  }

  const passed = results.filter((result) => result.passed).length;
  const exploratory = testPlan.oracle === "model";
  const normalizedResults = results.map((result) => ({
    ...result,
    status: exploratory
      ? "observed" as const
      : result.passed ? "passed" as const : "failed" as const,
  }));
  return {
    mode: testPlan.mode,
    oracle: testPlan.oracle,
    className: testPlan.className,
    functionName: testPlan.functionName,
    passed: exploratory ? 0 : passed,
    failed: exploratory ? 0 : results.length - passed,
    observed: exploratory ? results.length : 0,
    results: normalizedResults,
  };
}

export function explainTestReport(report: AgentTestReport, isChinese: boolean) {
  const total = report.results.length;
  const adapters = [...new Set(report.results.flatMap((result) => result.adapter ? [result.adapter] : []))];
  const adapterNotice = adapters.length
    ? isChinese
      ? `\n\n调用签名提示：${adapters.map((adapter) => adapter.includes("self/cls") ? "当前函数定义在类外，却把 self/cls 写成了第一个参数。测试器临时补了占位值以验证算法；正式提交时应删除 self，或把方法放进 class Solution。" : adapter).join("；")}`
      : `\n\nCall-signature note: ${adapters.join("; ")}`
    : "";
  if (report.observed) {
    const lines = report.results.map((result) =>
      `- ${result.name}: ${isChinese ? "输入" : "input"}=${compactTestValue(result.input)}, ${isChinese ? "实际" : "actual"}=${result.error || compactTestValue(result.actual)}`,
    );
    return isChinese
      ? `Agent 自主选择参数调用了当前代码，并获得 ${total} 条真实观察。下面只展示真实输入和实际输出；这些探测不是权威判题：\n\n${lines.join("\n")}${adapterNotice}`
      : `The Agent chose arguments and called the current code, obtaining ${total} real observations. Only real inputs and actual outputs are shown; these probes are not an authoritative judge:\n\n${lines.join("\n")}`;
  }
  const firstFailure = report.results.find((result) => !result.passed);
  if (!firstFailure) {
    return isChinese
      ? `本轮 ${total} 个测试全部通过。当前用例没有发现错误，但这不等于已经形式化证明代码对所有输入都正确。${adapterNotice}`
      : `All ${total} tests passed. These cases found no bug, although this is not a proof for every possible input.`;
  }

  const input = compactTestValue(firstFailure.input);
  const expected = compactTestValue(firstFailure.expected);
  const actual = firstFailure.error
    ? firstFailure.error
    : compactTestValue(firstFailure.actual);
  return isChinese
    ? `第一个失败用例是「${firstFailure.name}」。\n\n- 输入：${input}\n- 期望：${expected}\n- 实际：${actual}\n\n这表示程序在这个具体输入下没有得到预期结果。请先沿着该输入逐步检查节点构造、访问顺序和返回值；下面是 Agent 的进一步判断。${adapterNotice}`
    : `The first failing case is “${firstFailure.name}”.\n\n- Input: ${input}\n- Expected: ${expected}\n- Actual: ${actual}\n\nTrace this exact input through construction, traversal, and the return value. The Agent's additional analysis follows.`;
}

function compactTestValue(value: unknown) {
  try {
    return (JSON.stringify(value) ?? String(value)).slice(0, 800);
  } catch {
    return String(value).slice(0, 800);
  }
}

export function formatTestExecution(report: AgentTestReport) {
  return `<test_execution>
${JSON.stringify(report)}
</test_execution>
These are real local execution results. Analyze failures precisely and do not invent additional output.`;
}
