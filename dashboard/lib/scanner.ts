import { spawn, type ChildProcess } from "child_process";
import path from "path";
import type { ScanProgress, ScanReport } from "./types";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
// In Docker the venv is at /app/venv; locally it's one level up from dashboard/
const VENV_PYTHON = path.join(PROJECT_ROOT, "venv", "bin", "python3");
const PYTHON_BIN = require("fs").existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";
const SCANNER_PATH = path.join(PROJECT_ROOT, "scanner.py");

type ProgressCallback = (progress: ScanProgress) => void;
type CompleteCallback = (report: ScanReport) => void;
type ErrorCallback = (error: string) => void;

export function runScan(
  url: string,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback,
  cookies?: string,
  quickScan?: boolean,
  skipModules?: string
): ChildProcess {
  const args = [SCANNER_PATH, url, "--json-stdout", "--progress", "--quiet"];
  if (cookies) {
    args.push("--cookies", cookies);
  }
  if (quickScan) {
    args.push("--quick");
  }
  if (skipModules) {
    args.push("--skip-modules", skipModules);
  }

  const proc = spawn(PYTHON_BIN, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  let stdout = "";
  let stderr = "";

  proc.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("PROGRESS:")) {
        try {
          const progress = JSON.parse(line.slice(9)) as ScanProgress;
          onProgress(progress);
        } catch {
          // ignore malformed progress lines
        }
      } else if (line.trim()) {
        stdout += line;
      }
    }
  });

  proc.stderr?.on("data", (data: Buffer) => {
    stderr += data.toString();
  });

  proc.on("close", (code) => {
    if (code === 0 && stdout) {
      try {
        const report = JSON.parse(stdout) as ScanReport;
        onComplete(report);
      } catch {
        onError(`Failed to parse scanner output: ${stdout.slice(0, 200)}`);
      }
    } else {
      onError(stderr || `Scanner exited with code ${code}`);
    }
  });

  return proc;
}
