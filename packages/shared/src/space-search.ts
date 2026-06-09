import { getSpacePrograms } from "./space-data.js";
import { koreaDateEndOfDayTime, koreaDateStartOfDayTime } from "./date-utils.js";
import type { SpaceProgram, SpaceProgramSearchInput } from "./types.js";

const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

const compact = (value: string): string => value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(/[^a-z0-9가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const deadlineWithin = (deadline: string | undefined, days: number): boolean => {
  if (!deadline) return false;
  const deadlineTime = koreaDateEndOfDayTime(deadline);
  if (deadlineTime === undefined) return false;
  const now = Date.now();
  return deadlineTime >= now && deadlineTime <= now + days * 24 * 60 * 60 * 1000;
};

const dateTimeOrInfinity = (date: string | undefined): number => {
  return koreaDateEndOfDayTime(date) ?? Number.POSITIVE_INFINITY;
};

const dateTimeOrZero = (date: string | undefined): number => {
  return koreaDateStartOfDayTime(date) ?? 0;
};

const textMatches = (haystack: string, query: string): boolean => {
  const normalizedHaystack = normalize(haystack);
  const normalizedQuery = normalize(query);
  if (normalizedHaystack.includes(normalizedQuery)) return true;
  if (compact(normalizedHaystack).includes(compact(normalizedQuery))) return true;

  const tokens = tokenize(normalizedQuery);
  if (tokens.length === 0) return true;
  const matched = tokens.filter((token) => normalizedHaystack.includes(token)).length;
  return matched >= Math.max(1, Math.ceil(tokens.length / 2));
};

const applicantText = (program: SpaceProgram): string => [
  program.title,
  program.summary,
  program.eligibilityText,
  program.rawText,
  program.targetCompanyStage,
  program.targetCompanyType,
  program.participationType,
  program.industries.join(" ")
].join(" ");

const isResearcherOrLabProgram = (program: SpaceProgram): boolean =>
  program.universityOrResearchPartnerRequired === true
  || /위탁연구|연구개발기관|대학|연구실|출연연|연구기관|연구팀|연구책임자|전문가|신규과제|공모/.test(applicantText(program));

const isStartupOrPrefounderProgram = (program: SpaceProgram): boolean =>
  /예비창업|창업자|창업기업|스타트업|벤처|초기기업|창업\s*지원|pre[-\s]?startup/i.test(applicantText(program));

const isCompanyProgram = (program: SpaceProgram): boolean =>
  /기업|중소|중견|벤처|스타트업|예비창업|사업화|상용화|입주기업|수혜기업/.test(applicantText(program));

const matchesApplicantType = (program: SpaceProgram, applicantType: SpaceProgramSearchInput["applicantType"]): boolean => {
  if (!applicantType) return true;
  if (applicantType === "researcher_or_lab") return isResearcherOrLabProgram(program);
  if (applicantType === "startup_or_prefounder") return isStartupOrPrefounderProgram(program);
  if (applicantType === "company") return isCompanyProgram(program);
  return true;
};

export function searchSpacePrograms(input: SpaceProgramSearchInput): SpaceProgram[] {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const effectiveStatus = input.status ?? (input.includeClosed ? undefined : "active");

  return getSpacePrograms()
    .filter((program) => {
      if (input.adjacentOnly && !program.spaceCategory.includes("adjacent")) {
        return false;
      }

      if (!input.includeAdjacent && !input.adjacentOnly && !input.defenseOnly && program.spaceCategory.includes("adjacent")) {
        return false;
      }

      const explicitlyRequestedDefense =
        input.includeDefense ||
        input.defenseOnly ||
        (input.sourceFamily !== undefined && input.sourceFamily === program.sourceFamily) ||
        input.spaceCategory?.includes("defense");

      if (!explicitlyRequestedDefense && program.defenseOrDualUse) {
        return false;
      }

      if (input.defenseOnly && !program.defenseOrDualUse && !program.spaceCategory.includes("defense")) {
        return false;
      }

      if (input.spaceCategory && program.spaceCategory !== input.spaceCategory) {
        return false;
      }

      if (input.sourceFamily && program.sourceFamily !== input.sourceFamily) {
        return false;
      }

      if (effectiveStatus && program.status !== effectiveStatus) {
        return false;
      }

      if (input.region && program.region && program.region !== "전국" && !program.region.includes(input.region)) {
        return false;
      }

      if (input.technologyAreas?.length) {
        const hasTechnology = input.technologyAreas.some((area) =>
          program.technologyAreas.some((programArea) => programArea.includes(area) || area.includes(programArea))
        );
        if (!hasTechnology) return false;
      }

      if (!matchesApplicantType(program, input.applicantType)) {
        return false;
      }

      if (input.companyStage) {
        if (!textMatches(applicantText(program), input.companyStage)) return false;
      }

      if (input.deadlineWithinDays && !deadlineWithin(program.applicationEndDate, input.deadlineWithinDays)) {
        return false;
      }

      if (input.query) {
        const haystack = [
          program.title,
          program.agency,
          program.summary,
          program.eligibilityText,
          program.rawText,
          program.technologyAreas.join(" "),
          program.industries.join(" ")
        ].join(" ");
        if (!textMatches(haystack, input.query)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (input.sortBy === "deadline") {
        return dateTimeOrInfinity(a.applicationEndDate) - dateTimeOrInfinity(b.applicationEndDate);
      }

      if (input.sortBy === "recent") {
        return dateTimeOrZero(b.announcementDate ?? b.lastCheckedAt) - dateTimeOrZero(a.announcementDate ?? a.lastCheckedAt);
      }

      return b.relevanceScore - a.relevanceScore || dateTimeOrInfinity(a.applicationEndDate) - dateTimeOrInfinity(b.applicationEndDate);
    })
    .slice(0, limit);
}

export function getSpaceProgramById(id: string): SpaceProgram | undefined {
  return getSpacePrograms().find((program) => program.id === id);
}
