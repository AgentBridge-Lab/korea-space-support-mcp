import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const generatedPath = "data/space-programs.generated.json";
const excludedPath = "data/space-programs.excluded.json";
const ingestReportPath = "data/space-ingest-report.json";
const knownCategories = new Set([
  "core_space",
  "satellite",
  "launch_vehicle",
  "space_data",
  "astronomy_space_science",
  "space_observation_infrastructure",
  "defense_space",
  "defense_aerospace",
  "space_parts_materials",
  "space_commercialization",
  "aerospace",
  "aviation_industry",
  "aviation_safety",
  "drone_uam_adjacent",
  "defense_aerospace_adjacent",
  "adjacent_space",
  "unknown"
]);
const sampleOnlyIds = new Set([
  "space-kari-sample-family",
  "space-kasa-001",
  "space-kasi-002",
  "space-dapa-003",
  "space-molit-004",
  "space-motie-005"
]);
const forbiddenGeneratedIds = new Set([
  "space-kari-actual-2024-family",
  "space-kaia-2024-kuam-safety"
]);
const excludedGeneratedTitlePattern = /입찰공고|민간투자사업|BTL|제3자\s*제안공고|전시관\s*참가|전시회\s*참가|박람회\s*참가|경진대회|비용분석서\s*작성\s*지침/;
const researcherEvidencePattern = /위탁연구|연구개발기관|관심\s*있는\s*연구자|전문가\s*지원|대학\s*연구실|출연연|연구팀/;
const knownDeadlineSources = new Set([
  "source_metadata",
  "html",
  "attachment",
  "html_no_year_deadline",
  "page_date_fallback"
]);

const loadPrograms = async () => {
  try {
    const parsed = JSON.parse(await readFile(generatedPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error(`Cannot read ${generatedPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const loadJsonFile = async (path, fallback) => {
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

const koreaDateStartOfDayTime = (value) => {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const isPastDate = (value) => {
  const time = koreaDateEndOfDayTime(value);
  return time !== undefined && time < Date.now();
};

const expectedStatusForDeadline = (value) => {
  const time = koreaDateEndOfDayTime(value);
  if (time === undefined) return "stale";
  return time < Date.now() ? "closed" : "active";
};

const loadRuntimePrograms = async () => {
  const distEntry = "packages/shared/dist/index.js";
  if (!existsSync(distEntry)) return undefined;
  const shared = await import(`../${distEntry}`);
  return shared.getSpacePrograms();
};

const uniqueCount = (items) => new Set(items).size;

const programs = await loadPrograms();
const excludedPrograms = await loadJsonFile(excludedPath, []);
const ingestReport = await loadJsonFile(ingestReportPath, undefined);
const ids = programs.map((program) => program.id).filter(Boolean);
const sourceUrls = programs.map((program) => program.sourceUrl).filter(Boolean);
const failures = [];
const warnings = [];

if (programs.length === 0) {
  failures.push("No generated space programs found.");
}

if (!Array.isArray(excludedPrograms)) {
  failures.push(`${excludedPath} must be an array.`);
}

if (Array.isArray(excludedPrograms)) {
  for (const program of excludedPrograms) {
    if (program.reason === "no_readable_application_deadline") {
      if (typeof program.reasonCategory !== "string" || program.reasonCategory.length === 0) {
        failures.push(`${program.id ?? "unknown"} is excluded without a reasonCategory.`);
      }
      if (typeof program.deadlineExtractionStatus !== "string" || program.deadlineExtractionStatus.length === 0) {
        failures.push(`${program.id ?? "unknown"} is excluded without deadlineExtractionStatus.`);
      }
      if (typeof program.deadlineExtractionNote !== "string" || program.deadlineExtractionNote.length < 8) {
        failures.push(`${program.id ?? "unknown"} is excluded without a useful deadlineExtractionNote.`);
      }
    }
  }
}

if (!ingestReport || typeof ingestReport !== "object") {
  failures.push(`${ingestReportPath} is missing or invalid.`);
}

if (uniqueCount(ids) !== ids.length) {
  failures.push("Duplicate program IDs found.");
}

if (sourceUrls.length !== programs.length) {
  failures.push("Every generated program must include sourceUrl.");
}

for (const program of programs) {
  if (!program.id) failures.push("A generated program is missing id.");
  if (forbiddenGeneratedIds.has(program.id)) {
    failures.push(`${program.id} is a forbidden hand-authored real notice ID.`);
  }
  if (!program.title) failures.push(`${program.id ?? "unknown"} is missing title.`);
  if (excludedGeneratedTitlePattern.test(`${program.title ?? ""} ${program.summary ?? ""}`)) {
    failures.push(`${program.id ?? "unknown"} appears to be procurement, PPP, or exhibition-only rather than a program notice.`);
  }
  if (!program.sourceFamily) failures.push(`${program.id ?? "unknown"} is missing sourceFamily.`);
  if (!knownCategories.has(program.spaceCategory)) {
    failures.push(`${program.id ?? "unknown"} has unknown category: ${program.spaceCategory}`);
  }
  if (typeof program.relevanceScore !== "number" || program.relevanceScore < 0 || program.relevanceScore > 100) {
    failures.push(`${program.id ?? "unknown"} has invalid relevanceScore.`);
  }
  if (isPastDate(program.applicationEndDate) && program.status !== "closed") {
    failures.push(`${program.id ?? "unknown"} has past deadline but status is not closed.`);
  }
  if (program.applicationEndDate) {
    const expectedStatus = expectedStatusForDeadline(program.applicationEndDate);
    if (program.status !== expectedStatus) {
      failures.push(`${program.id ?? "unknown"} status is ${program.status ?? "missing"} but deadline implies ${expectedStatus}.`);
    }
  }
  if (program.announcementDate && program.applicationEndDate) {
    const announcementTime = koreaDateStartOfDayTime(program.announcementDate);
    const deadlineTime = koreaDateEndOfDayTime(program.applicationEndDate);
    if (announcementTime !== undefined && deadlineTime !== undefined && deadlineTime < announcementTime) {
      failures.push(`${program.id ?? "unknown"} has applicationEndDate before announcementDate.`);
    }
  }
  if (program.defenseOrDualUse && !Array.isArray(program.securityRequirements)) {
    failures.push(`${program.id ?? "unknown"} is defense/dual-use but securityRequirements is not an array.`);
  }
  if (!program.applicationEndDate) {
    failures.push(`${program.id ?? "unknown"} has no applicationEndDate; generated records must be deadline-bearing program notices.`);
  }
  if (program.applicationEndDate) {
    if (!knownDeadlineSources.has(program.deadlineSource)) {
      failures.push(`${program.id ?? "unknown"} has applicationEndDate but no valid deadlineSource.`);
    }
    if (typeof program.deadlineEvidenceText !== "string" || program.deadlineEvidenceText.length < 8) {
      failures.push(`${program.id ?? "unknown"} has applicationEndDate but no useful deadlineEvidenceText.`);
    }
    if (typeof program.deadlineEvidenceUrl !== "string" || program.deadlineEvidenceUrl.length === 0) {
      failures.push(`${program.id ?? "unknown"} has applicationEndDate but no deadlineEvidenceUrl.`);
    }
  }
  if (program.error) {
    failures.push(`${program.id ?? "unknown"} was generated from an ingestion error fallback.`);
  }
  if (
    ["KARI", "KASI"].includes(program.sourceFamily)
    && researcherEvidencePattern.test(`${program.title ?? ""} ${program.targetCompanyType ?? ""} ${program.eligibilityText ?? ""} ${program.rawText ?? ""}`)
    && program.universityOrResearchPartnerRequired !== true
  ) {
    failures.push(`${program.id ?? "unknown"} has researcher-oriented evidence but universityOrResearchPartnerRequired is not true.`);
  }
  if (program.dataReusePolicy !== "metadata_only_until_terms_reviewed" && program.dataReusePolicy !== "metadata_and_short_summary") {
    warnings.push(`${program.id ?? "unknown"} has uncommon dataReusePolicy: ${program.dataReusePolicy ?? "missing"}`);
  }
}

const sourceFamilies = [...new Set(programs.map((program) => program.sourceFamily).filter(Boolean))].sort();
const runtimePrograms = await loadRuntimePrograms();
const runtimeSampleIds = runtimePrograms
  ?.map((program) => program.id)
  .filter((id) => typeof id === "string" && sampleOnlyIds.has(id));

if (runtimeSampleIds?.length) {
  failures.push(`Runtime space dataset includes sample-only program IDs: ${runtimeSampleIds.join(", ")}`);
}

if (ingestReport && typeof ingestReport === "object") {
  if (ingestReport.generatedCount !== programs.length) {
    failures.push(`${ingestReportPath} generatedCount does not match generated program count.`);
  }
  if (Array.isArray(excludedPrograms) && ingestReport.excludedCount !== excludedPrograms.length) {
    failures.push(`${ingestReportPath} excludedCount does not match excluded record count.`);
  }
  if (ingestReport.sourceFamilyAudit !== undefined) {
    if (!Array.isArray(ingestReport.sourceFamilyAudit)) {
      failures.push(`${ingestReportPath} sourceFamilyAudit must be an array when present.`);
    } else {
      const auditGeneratedCount = ingestReport.sourceFamilyAudit.reduce((sum, item) => sum + (item.generatedCount ?? 0), 0);
      const auditExcludedCount = ingestReport.sourceFamilyAudit.reduce((sum, item) => sum + (item.excludedCount ?? 0), 0);
      const auditDiscoveredCount = ingestReport.sourceFamilyAudit.reduce((sum, item) => sum + (item.discoveredCount ?? 0), 0);
      if (auditGeneratedCount !== programs.length) {
        failures.push(`${ingestReportPath} sourceFamilyAudit generatedCount total does not match generated program count.`);
      }
      if (Array.isArray(excludedPrograms) && auditExcludedCount !== excludedPrograms.length) {
        failures.push(`${ingestReportPath} sourceFamilyAudit excludedCount total does not match excluded record count.`);
      }
      if (auditDiscoveredCount !== ingestReport.discoveredSourceCount) {
        failures.push(`${ingestReportPath} sourceFamilyAudit discoveredCount total does not match discoveredSourceCount.`);
      }
    }
  }
  if (ingestReport.discoveryRunAudit !== undefined) {
    if (!Array.isArray(ingestReport.discoveryRunAudit)) {
      failures.push(`${ingestReportPath} discoveryRunAudit must be an array when present.`);
    } else {
      const runDiscoveredCount = ingestReport.discoveryRunAudit.reduce((sum, item) => sum + (item.discoveredCount ?? 0), 0);
      if (runDiscoveredCount !== ingestReport.discoveredSourceCount) {
        failures.push(`${ingestReportPath} discoveryRunAudit discoveredCount total does not match discoveredSourceCount.`);
      }
      for (const item of ingestReport.discoveryRunAudit) {
        if (typeof item.label !== "string" || item.label.length === 0) {
          failures.push(`${ingestReportPath} discoveryRunAudit contains an item without label.`);
        }
        if (!["ok", "error"].includes(item.status)) {
          failures.push(`${ingestReportPath} discoveryRunAudit ${item.label ?? "unknown"} has invalid status.`);
        }
        if (typeof item.durationMs !== "number" || item.durationMs < 0) {
          failures.push(`${ingestReportPath} discoveryRunAudit ${item.label ?? "unknown"} has invalid durationMs.`);
        }
        if (item.status === "error" && typeof item.error !== "string") {
          failures.push(`${ingestReportPath} discoveryRunAudit ${item.label ?? "unknown"} has error status without error message.`);
        }
      }
    }
  }
}

if (programs.length < 5) {
  warnings.push("Generated program count is below the first ingestion target of 5 records.");
}

if (sourceFamilies.length < 3) {
  warnings.push("Generated source family count is below the MVP minimum target of 3 source families.");
}

const report = {
  generated_count: programs.length,
  source_family_count: sourceFamilies.length,
  source_families: sourceFamilies,
  source_url_coverage: programs.length === 0 ? 0 : Math.round((sourceUrls.length / programs.length) * 100),
  runtime_count: runtimePrograms?.length,
  excluded_count: Array.isArray(excludedPrograms) ? excludedPrograms.length : undefined,
  duplicate_id_count: ids.length - uniqueCount(ids),
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
