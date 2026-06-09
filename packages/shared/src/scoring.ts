import type { CompanyProfile, Tender, TenderFit } from "./types.js";

const normalize = (value: string | undefined): string => (value ?? "").toLowerCase();

const containsAny = (haystack: string, needles: string[]): string[] =>
  needles.filter((needle) => needle.trim() && haystack.includes(needle.toLowerCase()));

const ukLocationAliases: Record<string, string[]> = {
  manchester: ["north west", "greater manchester"],
  liverpool: ["north west"],
  birmingham: ["west midlands"],
  coventry: ["west midlands"],
  london: ["london"],
  leeds: ["yorkshire", "yorkshire and the humber"],
  sheffield: ["yorkshire", "yorkshire and the humber"],
  bristol: ["south west"],
  newcastle: ["north east"],
  cardiff: ["wales"],
  edinburgh: ["scotland"],
  glasgow: ["scotland"],
  belfast: ["northern ireland"]
};

const locationMatches = (companyLocation: string | undefined, tenderRegion: string | undefined): boolean => {
  if (!companyLocation || !tenderRegion) return false;

  const company = normalize(companyLocation);
  const region = normalize(tenderRegion);
  if (region.includes(company) || company.includes(region)) return true;

  const aliases = ukLocationAliases[company] ?? [];
  return aliases.some((alias) => region.includes(alias));
};

export function scoreTenderFit(tender: Tender, company: CompanyProfile): TenderFit {
  const reasons: string[] = [];
  const risks: string[] = [];
  const missingInformation: string[] = [];
  let score = 0;

  const haystack = normalize(`${tender.title} ${tender.description ?? ""} ${tender.normalizedText}`);
  const companyTerms = [
    company.industry,
    ...company.keywords,
    ...company.pastProjects
  ].filter((term): term is string => Boolean(term));

  const matchedTerms = containsAny(haystack, companyTerms);
  if (matchedTerms.length > 0) {
    score += Math.min(35, matchedTerms.length * 10);
    reasons.push(`Matches company terms: ${matchedTerms.slice(0, 5).join(", ")}`);
  } else {
    risks.push("No strong keyword match with company industry or past projects.");
  }

  const excludedMatches = containsAny(haystack, company.excludedKeywords);
  if (excludedMatches.length > 0) {
    score -= 25;
    risks.push(`Contains excluded terms: ${excludedMatches.join(", ")}`);
  }

  if (locationMatches(company.location, tender.region)) {
    score += 10;
    reasons.push("Tender region matches company location.");
  } else if (company.location && tender.region) {
    risks.push("Tender region may not match the company location.");
  } else {
    missingInformation.push("Region match could not be fully assessed.");
  }

  if (
    typeof tender.valueMin === "number" &&
    typeof tender.valueMax === "number" &&
    typeof company.preferredContractValueMin === "number" &&
    typeof company.preferredContractValueMax === "number"
  ) {
    const overlaps =
      tender.valueMax >= company.preferredContractValueMin &&
      tender.valueMin <= company.preferredContractValueMax;
    if (overlaps) {
      score += 20;
      reasons.push("Estimated contract value is within the preferred range.");
    } else {
      risks.push("Estimated contract value is outside the preferred range.");
    }
  } else {
    missingInformation.push("Contract value range could not be fully assessed.");
  }

  if (tender.status !== "active" || tender.isCancelled || tender.isAwarded) {
    score -= 40;
    risks.push(`Notice status is ${tender.status}; confirm before acting.`);
  }

  if (!tender.deadlineAt) {
    missingInformation.push("Deadline is missing.");
  } else if (new Date(tender.deadlineAt).getTime() < Date.now()) {
    score -= 40;
    risks.push("Tender deadline appears to have passed.");
  } else {
    score += 10;
    reasons.push("Tender is still before its recorded deadline.");
  }

  const fitScore = Math.max(0, Math.min(100, Math.round(score)));
  const fitStatus =
    missingInformation.length > 2
      ? "needs_review"
      : fitScore >= 70
        ? "strong"
        : fitScore >= 40
          ? "possible"
          : fitScore >= 20
            ? "weak"
            : "needs_review";

  return {
    tenderId: tender.id,
    title: tender.title,
    fitScore,
    fitStatus,
    reasons,
    risks,
    missingInformation,
    sourceUrl: tender.sourceUrl
  };
}
