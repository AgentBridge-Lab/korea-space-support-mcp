import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";

const lockDir = "data/.space-refresh.lock";
const schedulerLogPath = "data/space-refresh-scheduler.log";
const schedulerStatePath = "data/space-refresh-scheduler-last.json";
const staleLockMinutes = Number.parseInt(process.env.SPACE_REFRESH_LOCK_STALE_MINUTES ?? "240", 10);
const isDryRun = process.argv.includes("--dry-run");

const nowIso = () => new Date().toISOString();

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
};

const appendLog = async (message) => {
  await mkdir("data", { recursive: true });
  await appendFile(schedulerLogPath, `${message}\n`);
};

const writeState = async (state) => {
  await mkdir("data", { recursive: true });
  await writeFile(schedulerStatePath, `${JSON.stringify(state, null, 2)}\n`);
};

const acquireLock = async () => {
  await mkdir("data", { recursive: true });

  try {
    await mkdir(lockDir);
    await writeFile(`${lockDir}/lock.json`, `${JSON.stringify({
      pid: process.pid,
      startedAt: nowIso()
    }, null, 2)}\n`);
    return { acquired: true };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  const lock = await readJson(`${lockDir}/lock.json`);
  const startedAtTime = lock?.startedAt ? new Date(lock.startedAt).getTime() : undefined;
  const lockAgeMs = Number.isFinite(startedAtTime) ? Date.now() - startedAtTime : Number.POSITIVE_INFINITY;
  const staleMs = Math.max(1, staleLockMinutes) * 60 * 1000;

  if (lockAgeMs <= staleMs) {
    return {
      acquired: false,
      reason: `Another scheduled refresh appears to be running since ${lock?.startedAt ?? "unknown"}.`
    };
  }

  await rm(lockDir, { recursive: true, force: true });
  await mkdir(lockDir);
  await writeFile(`${lockDir}/lock.json`, `${JSON.stringify({
    pid: process.pid,
    startedAt: nowIso(),
    replacedStaleLock: lock
  }, null, 2)}\n`);
  return { acquired: true, replacedStaleLock: true };
};

const releaseLock = async () => {
  await rm(lockDir, { recursive: true, force: true });
};

const runNpmScript = async (script) => {
  const child = execFile("npm", ["run", script], {
    maxBuffer: 64 * 1024 * 1024
  });

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run ${script} exited with code ${code ?? "unknown"}`));
      }
    });
  });
};

const startedAt = nowIso();

if (isDryRun) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    lockDir,
    schedulerLogPath,
    schedulerStatePath,
    staleLockMinutes,
    lockExists: existsSync(lockDir)
  }, null, 2));
  process.exit(0);
}

const lock = await acquireLock();
if (!lock.acquired) {
  const skippedAt = nowIso();
  const state = {
    status: "skipped",
    reason: lock.reason,
    startedAt,
    finishedAt: skippedAt,
    durationMs: new Date(skippedAt).getTime() - new Date(startedAt).getTime()
  };
  await appendLog(`[${skippedAt}] skipped: ${lock.reason}`);
  await writeState(state);
  console.log(lock.reason);
  process.exit(0);
}

await appendLog(`[${startedAt}] scheduled refresh started${lock.replacedStaleLock ? " after stale lock replacement" : ""}`);

try {
  await runNpmScript("refresh:space");
  const finishedAt = nowIso();
  const state = {
    status: "success",
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  };
  await appendLog(`[${finishedAt}] scheduled refresh succeeded in ${state.durationMs}ms`);
  await writeState(state);
} catch (error) {
  const finishedAt = nowIso();
  const state = {
    status: "failed",
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    error: error instanceof Error ? error.message : String(error)
  };
  await appendLog(`[${finishedAt}] scheduled refresh failed in ${state.durationMs}ms: ${state.error}`);
  await writeState(state);
  process.exitCode = 1;
} finally {
  await releaseLock();
}
