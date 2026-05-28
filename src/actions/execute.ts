"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

type RunResult = {
  stdout: string;
  stderr: string;
};

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
  cwd?: string
): Promise<RunResult> {
  return execFileAsync(command, args, {
    cwd,
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
}

export async function executeCodeAction(language: string, code: string) {
  const tmpDir = path.join(process.cwd(), "tmp");
  const uuid = crypto.randomUUID();
  let cleanupPath = "";

  try {
    // 1. Ensure tmp directory exists
    await fs.mkdir(tmpDir, { recursive: true });

    let result: RunResult;

    switch (language) {
      case "javascript": {
        const filepath = path.join(tmpDir, `${uuid}.js`);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("node", [filepath]);
        break;
      }
      case "typescript": {
        const filepath = path.join(tmpDir, `${uuid}.ts`);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("npx", ["tsx", filepath]);
        break;
      }
      case "python": {
        const filepath = path.join(tmpDir, `${uuid}.py`);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("python3", [filepath]);
        break;
      }
      case "java": {
        // Java requires filename to match public class, or just a generic class name.
        // We'll replace the public class name with a unique one, or just assume no public class
        // To be safe, let's just create a folder, name it Solution.java, and hope they named their class Solution.
        const javaDir = path.join(tmpDir, uuid);
        cleanupPath = javaDir;
        await fs.mkdir(javaDir, { recursive: true });
        const filepath = path.join(javaDir, "Solution.java");
        await fs.writeFile(filepath, code, "utf-8");
        await runCommand("javac", [filepath]);
        result = await runCommand("java", ["Solution"], javaDir);
        break;
      }
      case "cpp": {
        const filepath = path.join(tmpDir, `${uuid}.cpp`);
        const binPath = path.join(tmpDir, uuid);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        await runCommand("g++", [filepath, "-o", binPath]);
        result = await runCommand(binPath, []);
        await fs.unlink(binPath).catch(() => {});
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
    if (cleanupPath) {
      await fs.rm(cleanupPath, { recursive: true, force: true }).catch((cleanupError) => {
        console.error("Cleanup failed:", cleanupError);
      });
    }
  }
}
