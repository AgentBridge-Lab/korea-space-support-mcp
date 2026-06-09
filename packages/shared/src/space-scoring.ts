import { isPastKoreaDate } from "./date-utils.js";
import type { EligibilityStatus, SpaceCompanyProfile, SpaceProgram, SpaceProgramFit } from "./types.js";

const includesAny = (haystack: string, needles: string[]): string[] => {
  const normalizedHaystack = haystack.toLowerCase();
  return needles.filter((needle) => needle.trim() && normalizedHaystack.includes(needle.toLowerCase()));
};

const monthsSince = (date?: string): number | undefined => {
  if (!date) return undefined;
  const started = new Date(date).getTime();
  if (Number.isNaN(started)) return undefined;
  return Math.floor((Date.now() - started) / (30 * 24 * 60 * 60 * 1000));
};

export function scoreSpaceProgramFit(program: SpaceProgram, company: SpaceCompanyProfile): SpaceProgramFit {
  const reasons: string[] = [];
  const risks: string[] = [];
  const missingInformation: string[] = [];
  let score = 0;

  if (program.relevanceScore >= 90) {
    score += 25;
    reasons.push("우주/항공우주 핵심 공고로 분류됩니다.");
  } else if (program.relevanceScore >= 70) {
    score += 15;
    reasons.push("우주 또는 항공우주 관련성이 높습니다.");
  } else {
    score += 5;
    risks.push("우주 핵심 공고가 아니라 인접 분야일 수 있습니다.");
  }

  const haystack = [
    program.title,
    program.summary,
    program.eligibilityText,
    program.rawText,
    program.technologyAreas.join(" "),
    program.industries.join(" ")
  ].join(" ");
  const companyTerms = [
    company.industry,
    ...company.technologyAreas,
    ...company.keywords
  ].filter((term): term is string => Boolean(term));
  const matchedTerms = includesAny(haystack, companyTerms);

  if (matchedTerms.length > 0) {
    score += Math.min(25, matchedTerms.length * 8);
    reasons.push(`기술분야가 공고와 일치합니다: ${matchedTerms.slice(0, 4).join(", ")}`);
  } else {
    risks.push("회사 기술분야와 공고 키워드의 직접 일치가 약합니다.");
  }

  if (program.region === "전국" || (company.region && program.targetRegions.includes(company.region))) {
    score += 8;
    reasons.push("지역 조건이 충돌하지 않습니다.");
  } else if (company.region && program.targetRegions.length > 0) {
    risks.push("지역 조건이 맞지 않을 수 있습니다.");
  } else {
    missingInformation.push("지역 조건 확인이 필요합니다.");
  }

  const companyAgeMonths = monthsSince(company.foundedAt);
  if (companyAgeMonths !== undefined && program.targetCompanyStage?.includes("창업")) {
    score += 8;
    reasons.push("창업기업 대상 조건과 관련이 있습니다.");
  } else if (!company.foundedAt) {
    missingInformation.push("창업일 정보가 없어 창업연차 조건을 확인할 수 없습니다.");
  }

  if (program.consortiumRequired && company.canJoinConsortium) {
    score += 8;
    reasons.push("컨소시엄 참여 가능 조건과 일치합니다.");
  } else if (program.consortiumRequired && company.canJoinConsortium === false) {
    score -= 25;
    risks.push("컨소시엄이 필요해 보이나 회사가 컨소시엄 참여가 어렵습니다.");
  } else if (program.consortiumRequired) {
    missingInformation.push("컨소시엄 참여 가능 여부 확인이 필요합니다.");
  }

  if (program.universityOrResearchPartnerRequired && company.hasResearchPartner) {
    score += 8;
    reasons.push("연구기관/대학 파트너 필요 조건과 맞습니다.");
  } else if (program.universityOrResearchPartnerRequired && company.hasResearchPartner === false) {
    score -= 20;
    risks.push("연구기관 또는 대학 파트너가 필요할 수 있습니다.");
  } else if (program.universityOrResearchPartnerRequired) {
    missingInformation.push("연구기관/대학 파트너 보유 여부 확인이 필요합니다.");
  }

  if (program.defenseOrDualUse) {
    risks.push("국방/방산 또는 dual-use 공고입니다. 보안요건, 수출통제, 참여자격을 원문에서 확인해야 합니다.");
    missingInformation.push("국방/방산 참여자격 및 보안요건 확인 필요");
    score -= 5;
  }

  if (program.restrictedNotice) {
    risks.push("제한 공고로 표시되어 원문 metadata 중심 검토가 필요합니다.");
    score -= 35;
  }

  if (program.applicationEndDate) {
    if (isPastKoreaDate(program.applicationEndDate)) {
      score -= 40;
      risks.push("공고 마감일이 지난 것으로 보입니다.");
    } else {
      score += 10;
      reasons.push("공고 마감 전입니다.");
    }
  } else {
    missingInformation.push("마감일 정보가 없습니다.");
  }

  const fitScore = Math.max(0, Math.min(100, Math.round(score)));
  const eligibilityStatus: EligibilityStatus =
    program.restrictedNotice ||
    program.defenseOrDualUse ||
    missingInformation.length >= 3
      ? "needs_review"
      : fitScore >= 65
        ? "likely"
        : fitScore < 30
          ? "unlikely"
          : "needs_review";

  return {
    programId: program.id,
    title: program.title,
    fitScore,
    eligibilityStatus,
    spaceRelevance: program.spaceCategory,
    reasons,
    risks,
    missingInformation,
    sourceUrl: program.sourceUrl
  };
}
