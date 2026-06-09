import { appendFile, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";

const generatedPath = "data/space-programs.generated.json";
const excludedPath = "data/space-programs.excluded.json";
const diffPath = "data/space-refresh-diff.json";
const historyPath = "data/space-refresh-history.jsonl";

const loadJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const runNpmScript = async (script) => {
  const child = execFile("npm", ["run", script], {
    maxBuffer: 32 * 1024 * 1024
  });

  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);

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

const byId = (items) => new Map(items.map((item) => [item.id, item]));

const pickProgramSummary = (program) => ({
  id: program.id,
  sourceFamily: program.sourceFamily,
  title: program.title,
  status: program.status,
  applicationEndDate: program.applicationEndDate,
  sourceUrl: program.sourceUrl
});

const pickExcludedSummary = (program) => ({
  id: program.id,
  sourceFamily: program.sourceFamily,
  title: program.title,
  reason: program.reason,
  sourceUrl: program.sourceUrl
});

const diffPrograms = (before, after) => {
  const previous = byId(before);
  const current = byId(after);

  const added = after
    .filter((program) => !previous.has(program.id))
    .map(pickProgramSummary);
  const removed = before
    .filter((program) => !current.has(program.id))
    .map(pickProgramSummary);
  const deadlineChanged = after
    .filter((program) => previous.has(program.id) && previous.get(program.id).applicationEndDate !== program.applicationEndDate)
    .map((program) => ({
      ...pickProgramSummary(program),
      previousApplicationEndDate: previous.get(program.id).applicationEndDate
    }));
  const statusChanged = after
    .filter((program) => previous.has(program.id) && previous.get(program.id).status !== program.status)
    .map((program) => ({
      ...pickProgramSummary(program),
      previousStatus: previous.get(program.id).status
    }));

  return {
    added,
    removed,
    deadlineChanged,
    statusChanged
  };
};

const diffExcluded = (before, after) => {
  const previous = byId(before);
  const current = byId(after);

  return {
    newExcluded: after
      .filter((program) => !previous.has(program.id))
      .map(pickExcludedSummary),
    resolvedExcluded: before
      .filter((program) => !current.has(program.id))
      .map(pickExcludedSummary)
  };
};

const printDiffSummary = (diff) => {
  console.log("");
  console.log("Space refresh diff");
  console.log("");
  console.log(`Generated: ${diff.previousGeneratedCount} -> ${diff.currentGeneratedCount}`);
  console.log(`Excluded: ${diff.previousExcludedCount} -> ${diff.currentExcludedCount}`);
  console.log(`Added: ${diff.added.length}`);
  console.log(`Removed: ${diff.removed.length}`);
  console.log(`Deadline changed: ${diff.deadlineChanged.length}`);
  console.log(`Status changed: ${diff.statusChanged.length}`);
  console.log(`New exclusions: ${diff.newExcluded.length}`);
  console.log(`Resolved exclusions: ${diff.resolvedExcluded.length}`);

  for (const [label, items] of [
    ["Added", diff.added],
    ["Removed", diff.removed],
    ["Deadline changed", diff.deadlineChanged],
    ["New exclusions", diff.newExcluded],
    ["Resolved exclusions", diff.resolvedExcluded]
  ]) {
    if (items.length === 0) continue;
    console.log("");
    console.log(`${label}:`);
    for (const item of items.slice(0, 8)) {
      console.log(`  - [${item.sourceFamily}] ${item.title}`);
    }
    if (items.length > 8) console.log(`  ... ${items.length - 8} more`);
  }

  console.log("");
  console.log(`Wrote ${diffPath}`);
  console.log(`Appended ${historyPath}`);
};

const startedAt = new Date();
const previousGenerated = await loadJson(generatedPath, []);
const previousExcluded = await loadJson(excludedPath, []);

await runNpmScript("ingest:space");
await runNpmScript("check:space");
await runNpmScript("check:space-search");
await runNpmScript("report:space");

const currentGenerated = await loadJson(generatedPath, []);
const currentExcluded = await loadJson(excludedPath, []);
const programDiff = diffPrograms(previousGenerated, currentGenerated);
const excludedDiff = diffExcluded(previousExcluded, currentExcluded);
const diff = {
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  previousGeneratedCount: previousGenerated.length,
  currentGeneratedCount: currentGenerated.length,
  previousExcludedCount: previousExcluded.length,
  currentExcludedCount: currentExcluded.length,
  ...programDiff,
  ...excludedDiff
};

const historyEntry = {
  startedAt: diff.startedAt,
  finishedAt: diff.finishedAt,
  durationMs: diff.durationMs,
  previousGeneratedCount: diff.previousGeneratedCount,
  currentGeneratedCount: diff.currentGeneratedCount,
  previousExcludedCount: diff.previousExcludedCount,
  currentExcludedCount: diff.currentExcludedCount,
  addedCount: diff.added.length,
  removedCount: diff.removed.length,
  deadlineChangedCount: diff.deadlineChanged.length,
  statusChangedCount: diff.statusChanged.length,
  newExcludedCount: diff.newExcluded.length,
  resolvedExcludedCount: diff.resolvedExcluded.length
};

await writeFile(diffPath, `${JSON.stringify(diff, null, 2)}\n`);
await appendFile(historyPath, `${JSON.stringify(historyEntry)}\n`);
printDiffSummary(diff);
