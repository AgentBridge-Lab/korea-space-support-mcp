import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSpaceProgramStatus } from "./date-utils.js";
import { sampleSpacePrograms } from "./space-sample-data.js";
import type {
  ExcludedSpaceProgram,
  SpaceCategory,
  SpaceIngestReport,
  SpaceProgram,
  SpaceProgramStatus
} from "./types.js";

const requiredString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const numberRecord = (value: unknown): Record<string, number> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const sanitizeSourceFamilyAudit = (value: unknown): SpaceIngestReport["sourceFamilyAudit"] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const audit = value
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      const sourceFamily = optionalString(record.sourceFamily);
      if (!sourceFamily) return undefined;
      return {
        sourceFamily,
        discoveredCount: typeof record.discoveredCount === "number" ? record.discoveredCount : 0,
        normalizedCount: typeof record.normalizedCount === "number" ? record.normalizedCount : 0,
        generatedCount: typeof record.generatedCount === "number" ? record.generatedCount : 0,
        excludedCount: typeof record.excludedCount === "number" ? record.excludedCount : 0,
        errorCount: typeof record.errorCount === "number" ? record.errorCount : 0,
        activeCount: typeof record.activeCount === "number" ? record.activeCount : 0,
        closedCount: typeof record.closedCount === "number" ? record.closedCount : 0
      };
    })
    .filter((item): item is NonNullable<SpaceIngestReport["sourceFamilyAudit"]>[number] => Boolean(item));
  return audit.length > 0 ? audit : undefined;
};

const sanitizeDiscoveryRunAudit = (value: unknown): SpaceIngestReport["discoveryRunAudit"] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const audit = value
    .map((item): NonNullable<SpaceIngestReport["discoveryRunAudit"]>[number] | undefined => {
      if (!item || typeof item !== "object") return undefined;
      const record = item as Record<string, unknown>;
      const label = optionalString(record.label);
      const status = record.status === "ok" || record.status === "error" ? record.status : undefined;
      if (!label || !status) return undefined;
      const sanitized: NonNullable<SpaceIngestReport["discoveryRunAudit"]>[number] = {
        label,
        status,
        discoveredCount: typeof record.discoveredCount === "number" ? record.discoveredCount : 0,
        durationMs: typeof record.durationMs === "number" ? record.durationMs : 0
      };
      const error = optionalString(record.error);
      if (error) sanitized.error = error;
      return sanitized;
    })
    .filter((item): item is NonNullable<SpaceIngestReport["discoveryRunAudit"]>[number] => Boolean(item));
  return audit.length > 0 ? audit : undefined;
};

const sanitizeSpaceProgram = (value: unknown): SpaceProgram | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const id = optionalString(record.id);
  const title = optionalString(record.title);
  const sourceUrl = optionalString(record.sourceUrl);
  if (!id || !title || !sourceUrl) return undefined;

  const storedStatus = requiredString(record.status, "active") as SpaceProgramStatus;

  return {
    id,
    source: requiredString(record.source, "generated_space_source"),
    externalId: optionalString(record.externalId),
    title,
    agency: optionalString(record.agency),
    sourceUrl,
    sourceType: optionalString(record.sourceType),
    sourceFamily: requiredString(record.sourceFamily, "UNKNOWN"),
    spaceCategory: requiredString(record.spaceCategory, "unknown") as SpaceCategory,
    relevanceScore: typeof record.relevanceScore === "number" ? record.relevanceScore : 50,
    dataReusePolicy: optionalString(record.dataReusePolicy),
    commercialUseAllowed: optionalBoolean(record.commercialUseAllowed),
    defenseOrDualUse: record.defenseOrDualUse === true,
    restrictedNotice: record.restrictedNotice === true,
    region: optionalString(record.region),
    targetRegions: stringArray(record.targetRegions),
    industries: stringArray(record.industries),
    technologyAreas: stringArray(record.technologyAreas),
    targetCompanyStage: optionalString(record.targetCompanyStage),
    targetCompanyType: optionalString(record.targetCompanyType),
    supportAmountText: optionalString(record.supportAmountText),
    applicationStartDate: optionalString(record.applicationStartDate),
    applicationEndDate: optionalString(record.applicationEndDate),
    deadlineSource: optionalString(record.deadlineSource),
    deadlineEvidenceText: optionalString(record.deadlineEvidenceText),
    deadlineEvidenceUrl: optionalString(record.deadlineEvidenceUrl),
    announcementDate: optionalString(record.announcementDate),
    summary: optionalString(record.summary),
    eligibilityText: optionalString(record.eligibilityText),
    requiredDocuments: stringArray(record.requiredDocuments),
    restrictions: stringArray(record.restrictions),
    securityRequirements: stringArray(record.securityRequirements),
    exportControlNotes: optionalString(record.exportControlNotes),
    qualificationNotes: optionalString(record.qualificationNotes),
    participationType: optionalString(record.participationType),
    leadApplicantAllowed: optionalString(record.leadApplicantAllowed),
    consortiumRequired: optionalBoolean(record.consortiumRequired),
    universityOrResearchPartnerRequired: optionalBoolean(record.universityOrResearchPartnerRequired),
    rawText: optionalString(record.rawText),
    attachmentUrls: stringArray(record.attachmentUrls),
    originalAgencyUrl: optionalString(record.originalAgencyUrl),
    status: deriveSpaceProgramStatus(optionalString(record.applicationEndDate), storedStatus),
    lastCheckedAt: requiredString(record.lastCheckedAt, new Date().toISOString())
  };
};

const packageDir = dirname(fileURLToPath(import.meta.url));
const candidateDataPaths = (filename: string): string[] => [
  resolve(process.cwd(), `data/${filename}`),
  resolve(process.cwd(), `../../data/${filename}`),
  join(packageDir, `../../../data/${filename}`),
  join(packageDir, `../../../../data/${filename}`)
];

const readJsonFile = (filename: string): unknown | undefined => {
  const path = candidateDataPaths(filename).find((candidate) => existsSync(candidate));
  if (!path) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
};

const loadGeneratedPrograms = (): SpaceProgram[] => {
  const parsed = readJsonFile("space-programs.generated.json");
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => sanitizeSpaceProgram(item))
    .filter((item): item is SpaceProgram => Boolean(item));
};

const sanitizeExcludedSpaceProgram = (value: unknown): ExcludedSpaceProgram | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const id = optionalString(record.id);
  const sourceFamily = optionalString(record.sourceFamily);
  const title = optionalString(record.title);
  const sourceUrl = optionalString(record.sourceUrl);
  const reason = optionalString(record.reason);
  if (!id || !sourceFamily || !title || !sourceUrl || !reason) return undefined;

  return {
    id,
    sourceFamily,
    title,
    sourceUrl,
    status: optionalString(record.status) as SpaceProgramStatus | undefined,
    reason,
    reasonCategory: optionalString(record.reasonCategory),
    deadlineExtractionStatus: optionalString(record.deadlineExtractionStatus),
    deadlineExtractionNote: optionalString(record.deadlineExtractionNote),
    lastCheckedAt: optionalString(record.lastCheckedAt)
  };
};

export function getExcludedSpacePrograms(): ExcludedSpaceProgram[] {
  const parsed = readJsonFile("space-programs.excluded.json");
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => sanitizeExcludedSpaceProgram(item))
    .filter((item): item is ExcludedSpaceProgram => Boolean(item));
}

export function getSpaceIngestReport(): SpaceIngestReport | undefined {
  const parsed = readJsonFile("space-ingest-report.json");
  if (!parsed || typeof parsed !== "object") return undefined;
  const record = parsed as Record<string, unknown>;
  const lastCheckedAt = optionalString(record.lastCheckedAt);
  if (!lastCheckedAt) return undefined;

  return {
    generatedCount: typeof record.generatedCount === "number" ? record.generatedCount : 0,
    discoveredSourceCount: typeof record.discoveredSourceCount === "number" ? record.discoveredSourceCount : 0,
    excludedCount: typeof record.excludedCount === "number" ? record.excludedCount : 0,
    sourceFamilies: stringArray(record.sourceFamilies),
    discoveredSourceFamilies: numberRecord(record.discoveredSourceFamilies),
    generatedSourceFamilies: numberRecord(record.generatedSourceFamilies),
    excludedSourceFamilies: numberRecord(record.excludedSourceFamilies),
    discoveryRunAudit: sanitizeDiscoveryRunAudit(record.discoveryRunAudit),
    sourceFamilyAudit: sanitizeSourceFamilyAudit(record.sourceFamilyAudit),
    activeCount: typeof record.activeCount === "number" ? record.activeCount : 0,
    closedCount: typeof record.closedCount === "number" ? record.closedCount : 0,
    lastCheckedAt
  };
}

export function getSpacePrograms(): SpaceProgram[] {
  const byId = new Map<string, SpaceProgram>();

  if (process.env.BIDSCOUT_INCLUDE_SAMPLE_SPACE_PROGRAMS === "true") {
    for (const program of sampleSpacePrograms) {
      byId.set(program.id, program);
    }
  }

  for (const program of loadGeneratedPrograms()) {
    byId.set(program.id, program);
  }

  return [...byId.values()];
}
