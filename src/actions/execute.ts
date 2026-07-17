"use server";

import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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
  cwd?: string,
  input?: string,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      cwd,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
    }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
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
        result = await runCommand("node", [filepath], undefined, input);
        break;
      }
      case "typescript": {
        const filepath = path.join(tmpDir, `${uuid}.ts`);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("npx", ["tsx", filepath], undefined, input);
        break;
      }
      case "python": {
        const filepath = path.join(tmpDir, `${uuid}.py`);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        result = await runCommand("python3", [filepath], undefined, input);
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
        result = await runCommand("java", ["Solution"], javaDir, input);
        break;
      }
      case "cpp": {
        const filepath = path.join(tmpDir, `${uuid}.cpp`);
        const binPath = path.join(tmpDir, uuid);
        cleanupPath = filepath;
        await fs.writeFile(filepath, code, "utf-8");
        await runCommand("g++", [filepath, "-o", binPath]);
        result = await runCommand(binPath, [], undefined, input);
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
