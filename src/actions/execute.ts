"use server";

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

type RunResult = {
  stdout: string;
  stderr: string;
};

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_CODE_BYTES = 1024 * 1024;
const MAX_INPUT_BYTES = 256 * 1024;

function getErrorOutput(error: unknown) {
  if (error && typeof error === "object") {
    const maybeError = error as {
      stdout?: unknown;
      stderr?: unknown;
      message?: unknown;
    };
    return (
      (typeof maybeError.stderr === "string" && maybeError.stderr) ||
      (typeof maybeError.stdout === "string" && maybeError.stdout) ||
      (typeof maybeError.message === "string" && maybeError.message)
    );
  }

  return undefined;
}

async function runCommand(
  command: string,
  args: string[],
  cwd?: string,
  input?: string,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: process.platform !== "win32",
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let outputBytes = 0;
    let outputLimitExceeded = false;
    let timedOut = false;

    const killProcess = () => {
      if (child.pid && process.platform !== "win32") {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // The process may have exited between the check and the kill call.
        }
      }
      child.kill("SIGKILL");
    };

    const collectOutput = (chunks: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > 1024 * 1024) {
        outputLimitExceeded = true;
        killProcess();
        return;
      }
      chunks.push(chunk);
    };

    child.stdout.on("data", (chunk: Buffer) => collectOutput(stdoutChunks, chunk));
    child.stderr.on("data", (chunk: Buffer) => collectOutput(stderrChunks, chunk));

    const timeout = setTimeout(() => {
      timedOut = true;
      killProcess();
    }, EXECUTION_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (exitCode !== 0 || signal || outputLimitExceeded) {
        const message = timedOut
          ? `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000} seconds.`
          : outputLimitExceeded
            ? "Execution output exceeded 1 MB."
            : `Process exited with code ${exitCode ?? "unknown"}${signal ? ` (${signal})` : ""}.`;
        reject(Object.assign(new Error(message), { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });

    child.stdin?.end(input ?? "");
  });
}

export async function executeCodeAction(
  language: string,
  code: string,
  input = "",
) {
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return { success: false, output: "Code must be 1 MB or smaller.", error: true };
  }
  if (Buffer.byteLength(input, "utf8") > MAX_INPUT_BYTES) {
    return { success: false, output: "Input must be 256 KB or smaller.", error: true };
  }

  const uuid = crypto.randomUUID();
  let tmpDir = "";

  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `recall-agent-${uuid}-`));

    let result: RunResult;

    switch (language) {
      case "javascript": {
        const filepath = path.join(tmpDir, `${uuid}.js`);
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("node", [filepath], undefined, input);
        break;
      }
      case "typescript": {
        const filepath = path.join(tmpDir, `${uuid}.ts`);
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("npx", ["tsx", filepath], undefined, input);
        break;
      }
      case "python": {
        const filepath = path.join(tmpDir, `${uuid}.py`);
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("python3", [filepath], undefined, input);
        break;
      }
      case "java": {
        // Java requires filename to match public class, or just a generic class name.
        // We'll replace the public class name with a unique one, or just assume no public class
        // To be safe, let's just create a folder, name it Solution.java, and hope they named their class Solution.
        const javaDir = path.join(tmpDir, uuid);
        await fs.mkdir(javaDir, { recursive: true });
        const filepath = path.join(javaDir, "Solution.java");
        await fs.writeFile(filepath, code, "utf-8");
        await runCommand("javac", [filepath]);
        result = await runCommand("java", ["Solution"], javaDir, input);
        break;
      }
      case "cpp": {
        const filepath = path.join(tmpDir, `${uuid}.cpp`);
        const binPath = path.join(tmpDir, uuid);
        await fs.writeFile(filepath, code, "utf-8");
        await runCommand("g++", [filepath, "-o", binPath]);
        result = await runCommand(binPath, [], undefined, input);
        break;
      }
      default:
        return { success: false, output: `Unsupported language: ${language}` };
    }

    return {
      success: true,
      output: result.stdout || result.stderr || "Execution finished with no output.",
      error: Boolean(result.stderr),
    };
  } catch (err: unknown) {
    return {
      success: false,
      output: getErrorOutput(err) || "Unknown error occurred",
      error: true,
    };
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch((cleanupError) => {
        console.error("Cleanup failed:", cleanupError);
      });
    }
  }
}
