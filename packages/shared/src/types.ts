export type TenderStatus = "active" | "closed" | "cancelled" | "awarded" | "stale";

export type FitStatus = "strong" | "possible" | "weak" | "needs_review";

export interface Tender {
  id: string;
  source: string;
  externalId?: string;
  title: string;
  buyerName?: string;
  description?: string;
  cpvCodes: string[];
  region?: string;
  country?: string;
  valueMin?: number;
  valueMax?: number;
  currency: string;
  publishedAt?: string;
  deadlineAt?: string;
  noticeType?: string;
  procurementStage?: string;
  status: TenderStatus;
  isCancelled: boolean;
  isAwarded: boolean;
  sourceUrl: string;
  documentUrls: string[];
  normalizedText: string;
  lastCheckedAt: string;
}

export interface CompanyProfile {
  name?: string;
  industry?: string;
  location?: string;
  companySize?: string;
  employeeCount?: number;
  certifications: string[];
  pastProjects: string[];
  keywords: string[];
  preferredContractValueMin?: number;
  preferredContractValueMax?: number;
  excludedKeywords: string[];
}

export interface TenderSearchInput {
  query?: string;
  region?: string;
  cpvCodes?: string[];
  deadlineWithinDays?: number;
  minValue?: number;
  maxValue?: number;
  limit?: number;
}

export interface TenderFit {
  tenderId: string;
  title: string;
  fitScore: number;
  fitStatus: FitStatus;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
  sourceUrl: string;
}

export type SpaceProgramStatus = "active" | "closed" | "cancelled" | "stale";

export type SpaceCategory =
  | "core_space"
  | "satellite"
  | "launch_vehicle"
  | "space_data"
  | "astronomy_space_science"
  | "space_observation_infrastructure"
  | "defense_space"
  | "defense_aerospace"
  | "space_parts_materials"
  | "space_commercialization"
  | "aerospace"
  | "aviation_industry"
  | "aviation_safety"
  | "drone_uam_adjacent"
  | "defense_aerospace_adjacent"
  | "adjacent_space"
  | "unknown";

export type EligibilityStatus = "likely" | "unlikely" | "needs_review";

export type SpaceSourceReviewStatus = "approved" | "metadata_only" | "needs_legal_review" | "backlog";
export type SpaceSourceLegalReviewStatus =
  | "not_started"
  | "metadata_only_policy"
  | "manual_review_required"
  | "approved";

export interface SpaceSourceReview {
  sourceFamily: string;
  sourceName: string;
  officialUrl: string;
  sourceType: string;
  mvpStatus: SpaceSourceReviewStatus;
  legalReviewStatus?: SpaceSourceLegalReviewStatus;
  collectionPolicy: string;
  storagePolicy?: string;
  commercialUseAllowed?: boolean;
  attributionRequired?: boolean;
  redistributionAllowed?: boolean;
  updateFrequency?: string;
  coverage: string;
  knownGaps: string[];
  notes: string[];
}

export interface SpaceSourceComplianceCheck {
  sourceFamily: string;
  status: SpaceSourceReviewStatus | "unknown";
  allowedForMvp: boolean;
  canStoreFullText: boolean;
  warnings: string[];
}

export interface SpaceClassification {
  spaceCategory: SpaceCategory;
  relevanceScore: number;
  defenseOrDualUse: boolean;
  restrictedNotice: boolean;
  matchedKeywords: string[];
  reasons: string[];
  warnings: string[];
}

export interface SpaceProgram {
  id: string;
  source: string;
  externalId?: string;
  title: string;
  agency?: string;
  sourceUrl: string;
  sourceType?: string;
  sourceFamily: string;
  spaceCategory: SpaceCategory;
  relevanceScore: number;
  dataReusePolicy?: string;
  commercialUseAllowed?: boolean;
  defenseOrDualUse: boolean;
  restrictedNotice: boolean;
  region?: string;
  targetRegions: string[];
  industries: string[];
  technologyAreas: string[];
  targetCompanyStage?: string;
  targetCompanyType?: string;
  supportAmountText?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  deadlineSource?: string;
  deadlineEvidenceText?: string;
  deadlineEvidenceUrl?: string;
  announcementDate?: string;
  summary?: string;
  eligibilityText?: string;
  requiredDocuments: string[];
  restrictions: string[];
  securityRequirements: string[];
  exportControlNotes?: string;
  qualificationNotes?: string;
  participationType?: string;
  leadApplicantAllowed?: string;
  consortiumRequired?: boolean;
  universityOrResearchPartnerRequired?: boolean;
  rawText?: string;
  attachmentUrls: string[];
  originalAgencyUrl?: string;
  status: SpaceProgramStatus;
  lastCheckedAt: string;
}

export interface ExcludedSpaceProgram {
  id: string;
  sourceFamily: string;
  title: string;
  sourceUrl: string;
  status?: SpaceProgramStatus;
  reason: string;
  reasonCategory?: string;
  deadlineExtractionStatus?: string;
  deadlineExtractionNote?: string;
  lastCheckedAt?: string;
}

export interface SpaceIngestReport {
  generatedCount: number;
  discoveredSourceCount: number;
  excludedCount: number;
  sourceFamilies: string[];
  discoveredSourceFamilies?: Record<string, number>;
  generatedSourceFamilies?: Record<string, number>;
  excludedSourceFamilies?: Record<string, number>;
  discoveryRunAudit?: Array<{
    label: string;
    status: "ok" | "error";
    discoveredCount: number;
    durationMs: number;
    error?: string;
  }>;
  sourceFamilyAudit?: Array<{
    sourceFamily: string;
    discoveredCount: number;
    normalizedCount: number;
    generatedCount: number;
    excludedCount: number;
    errorCount: number;
    activeCount: number;
    closedCount: number;
  }>;
  activeCount: number;
  closedCount: number;
  lastCheckedAt: string;
}

export interface SpaceCompanyProfile {
  name?: string;
  businessType?: string;
  region?: string;
  foundedAt?: string;
  industry?: string;
  technologyAreas: string[];
  keywords: string[];
  employeeCount?: number;
  revenue?: number;
  previousGrants: string[];
  certifications: string[];
  hasResearchPartner?: boolean;
  canJoinConsortium?: boolean;
  description?: string;
}

export interface SpaceProgramSearchInput {
  query?: string;
  spaceCategory?: SpaceCategory;
  sourceFamily?: string;
  status?: SpaceProgramStatus;
  region?: string;
  technologyAreas?: string[];
  companyStage?: string;
  applicantType?: "researcher_or_lab" | "company" | "startup_or_prefounder";
  deadlineWithinDays?: number;
  includeAdjacent?: boolean;
  includeDefense?: boolean;
  defenseOnly?: boolean;
  adjacentOnly?: boolean;
  includeClosed?: boolean;
  sortBy?: "relevance" | "deadline" | "recent";
  limit?: number;
}

export interface SpaceProgramFit {
  programId: string;
  title: string;
  fitScore: number;
  eligibilityStatus: EligibilityStatus;
  spaceRelevance: SpaceCategory;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
  sourceUrl: string;
}

export interface SpaceProgramSummary {
  title: string;
  agency?: string;
  purpose: string;
  target: string;
  spaceCategory: SpaceCategory;
  technologyAreas: string[];
  supportAmount?: string;
  applicationDeadline?: string;
  participationType?: string;
  consortiumRequired?: boolean;
  universityOrResearchPartnerRequired?: boolean;
  requiredDocuments: string[];
  restrictions: string[];
  securityRequirements: string[];
  warnings: string[];
  sourceUrl: string;
  lastCheckedAt: string;
  disclaimer: string;
}
