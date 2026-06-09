import { readFile } from "node:fs/promises";

const generatedPath = "data/space-programs.generated.json";
const excludedPath = "data/space-programs.excluded.json";
const ingestReportPath = "data/space-ingest-report.json";

const loadJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const koreaDateEndOfDayTime = (value) => {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+09:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const daysUntil = (deadline) => {
  const time = koreaDateEndOfDayTime(deadline);
  if (time === undefined) return undefined;
  return Math.ceil((time - Date.now()) / (24 * 60 * 60 * 1000));
};

const countBy = (items, getKey) => {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item) ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
};

const formatRows = (rows) => {
  if (rows.length === 0) return "  none";
  return rows.map(([key, value]) => `  ${key}: ${value}`).join("\n");
};

const truncate = (value, length = 88) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};

const programs = await loadJson(generatedPath, []);
const excluded = await loadJson(excludedPath, []);
const ingestReport = await loadJson(ingestReportPath, {});

const activePrograms = programs.filter((program) => program.status === "active");
const closedPrograms = programs.filter((program) => program.status === "closed");
const researcherPrograms = programs.filter((program) =>
  program.universityOrResearchPartnerRequired
  || /연구자|연구팀|대학|출연연|전문가|위탁연구|신규과제|공모/.test(
    `${program.targetCompanyType ?? ""} ${program.eligibilityText ?? ""} ${program.participationType ?? ""} ${program.title ?? ""}`
  )
);

const upcomingPrograms = activePrograms
  .map((program) => ({ ...program, daysLeft: daysUntil(program.applicationEndDate) }))
  .filter((program) => typeof program.daysLeft === "number")
  .sort((left, right) => left.daysLeft - right.daysLeft || right.relevanceScore - left.relevanceScore)
  .slice(0, 10);

const deadlineEvidenceCounts = countBy(programs, (program) => program.deadlineSource);
const fallbackDeadlinePrograms = programs
  .filter((program) => program.deadlineSource === "page_date_fallback")
  .sort((left, right) => String(left.sourceFamily).localeCompare(String(right.sourceFamily)))
  .slice(0, 10);
const discoveryRuns = Array.isArray(ingestReport.discoveryRunAudit) ? ingestReport.discoveryRunAudit : [];
const sourceFamilyAudit = Array.isArray(ingestReport.sourceFamilyAudit) ? ingestReport.sourceFamilyAudit : [];
const operationalWatchpoints = [
  ...discoveryRuns
    .filter((item) => item.status !== "ok")
    .map((item) => `discovery error: ${item.label}${item.error ? ` - ${truncate(item.error, 72)}` : ""}`),
  ...discoveryRuns
    .filter((item) => typeof item.durationMs === "number" && item.durationMs > 15000)
    .map((item) => `slow discovery: ${item.label} ${(item.durationMs / 1000).toFixed(1)}s`),
  ...sourceFamilyAudit
    .filter((item) => item.errorCount > 0)
    .map((item) => `source errors: ${item.sourceFamily} errors ${item.errorCount}`),
  ...sourceFamilyAudit
    .filter((item) => item.excludedCount >= 2)
    .map((item) => `excluded candidates: ${item.sourceFamily} excluded ${item.excludedCount}`),
  ...(fallbackDeadlinePrograms.length > 0
    ? [`page_date_fallback evidence requires review: ${fallbackDeadlinePrograms.length} records shown below`]
    : [])
];

const notableExcluded = excluded
  .slice()
  .sort((left, right) => String(left.sourceFamily).localeCompare(String(right.sourceFamily)))
  .slice(0, 10);

console.log("Space refresh report");
console.log("");
console.log(`Generated: ${programs.length}`);
console.log(`Active: ${activePrograms.length}`);
console.log(`Closed: ${closedPrograms.length}`);
console.log(`Excluded: ${excluded.length}`);
console.log(`Discovered sources: ${ingestReport.discoveredSourceCount ?? "unknown"}`);
console.log(`Last checked: ${ingestReport.lastCheckedAt ?? "unknown"}`);
if (discoveryRuns.length > 0) {
  console.log("");
  console.log("Source discovery runs:");
  for (const item of discoveryRuns) {
    const seconds = typeof item.durationMs === "number" ? `${(item.durationMs / 1000).toFixed(1)}s` : "unknown";
    const error = item.error ? `, error ${truncate(item.error, 64)}` : "";
    console.log(`  - ${item.label}: ${item.status}, discovered ${item.discoveredCount}, ${seconds}${error}`);
  }
}
console.log("");
console.log("Source families:");
console.log(formatRows(countBy(programs, (program) => program.sourceFamily)));
if (sourceFamilyAudit.length > 0) {
  console.log("  Discovery audit:");
  for (const item of sourceFamilyAudit) {
    console.log(
      `    - ${item.sourceFamily}: discovered ${item.discoveredCount}, generated ${item.generatedCount}, excluded ${item.excludedCount}, errors ${item.errorCount}`
    );
  }
}
console.log("");
console.log("Operational watchpoints:");
if (operationalWatchpoints.length === 0) {
  console.log("  none");
} else {
  for (const item of operationalWatchpoints.slice(0, 12)) {
    console.log(`  - ${item}`);
  }
  if (operationalWatchpoints.length > 12) console.log(`  ... ${operationalWatchpoints.length - 12} more`);
}
console.log("");
console.log("Categories:");
console.log(formatRows(countBy(programs, (program) => program.spaceCategory)));
console.log("");
console.log("Deadline evidence:");
console.log(formatRows(deadlineEvidenceCounts));
if (fallbackDeadlinePrograms.length > 0) {
  console.log("  page_date_fallback records to review:");
  for (const program of fallbackDeadlinePrograms) {
    console.log(`    - [${program.sourceFamily}] ${truncate(program.title)} (${program.applicationEndDate})`);
  }
}
console.log("");
console.log(`Researcher/lab/team records: ${researcherPrograms.length}`);
for (const program of researcherPrograms.slice(0, 8)) {
  console.log(`  - [${program.sourceFamily}] ${truncate(program.title)} (${program.applicationEndDate}, ${program.status})`);
}
if (researcherPrograms.length > 8) {
  console.log(`  ... ${researcherPrograms.length - 8} more`);
}
console.log("");
console.log("Upcoming active deadlines:");
if (upcomingPrograms.length === 0) {
  console.log("  none");
} else {
  for (const program of upcomingPrograms) {
    console.log(`  - D-${program.daysLeft} [${program.sourceFamily}] ${truncate(program.title)} (${program.applicationEndDate})`);
  }
}
console.log("");
console.log("Notable exclusions:");
if (notableExcluded.length === 0) {
  console.log("  none");
} else {
  console.log("  Reason categories:");
  console.log(formatRows(countBy(excluded, (program) => program.reasonCategory)));
  console.log("  Deadline extraction status:");
  console.log(formatRows(countBy(excluded, (program) => program.deadlineExtractionStatus)));
  for (const program of notableExcluded) {
    const note = program.deadlineExtractionNote ? ` - ${truncate(program.deadlineExtractionNote, 96)}` : "";
    console.log(`  - [${program.sourceFamily}] ${truncate(program.title)} (${program.reasonCategory ?? program.reason})${note}`);
  }
}
