export type SpaceCategory =
  | "satellite"
  | "launch_vehicle"
  | "space_commercialization"
  | "space_data"
  | "space_parts_materials"
  | "astronomy_space_science"
  | "defense_space"
  | "defense_aerospace"
  | "defense_aerospace_adjacent"
  | "drone_uam_adjacent"
  | "aviation_industry"
  | "rd_general"
  | string;

export type SpaceProgramStatus = "active" | "closed" | "upcoming" | "stale";

export interface SearchResultItem {
  program_id: string;
  title: string;
  agency?: string;
  source_family: string;
  space_category: SpaceCategory;
  relevance_score: number;
  deadline?: string;
  support_amount?: string;
  status: SpaceProgramStatus;
  summary?: string;
  target_company_type?: string;
  participation_type?: string;
  university_or_research_partner_required?: boolean;
  defense_or_dual_use: boolean;
  restricted_notice: boolean;
  source: string;
  source_url: string;
  last_checked_at: string;
}

export interface SpaceProgramDetail {
  id: string;
  title: string;
  agency?: string;
  sourceUrl: string;
  sourceFamily: string;
  spaceCategory: SpaceCategory;
  relevanceScore: number;
  applicationStartDate?: string;
  applicationEndDate?: string;
  announcementDate?: string;
  deadlineSource?: string;
  deadlineEvidenceText?: string;
  deadlineEvidenceUrl?: string;
  status: SpaceProgramStatus;
  summary?: string;
  eligibilityText?: string;
  targetCompanyType?: string;
  participationType?: string;
  universityOrResearchPartnerRequired?: boolean;
  consortiumRequired?: boolean;
  defenseOrDualUse: boolean;
  restrictedNotice: boolean;
  region?: string;
  targetRegions: string[];
  industries: string[];
  technologyAreas: string[];
  supportAmountText?: string;
  attachmentUrls: string[];
  originalAgencyUrl?: string;
  dataReusePolicy?: string;
  restrictions: string[];
  securityRequirements: string[];
  lastCheckedAt: string;
}

export type ApplicantType = "company" | "startup_or_prefounder" | "researcher_or_lab";

export type EligibilityStatus = "likely_eligible" | "needs_review" | "unlikely_eligible";

export interface CompanyProfile {
  name?: string;
  businessType?: string;
  region?: string;
  foundedAt?: string;
  industry?: string;
  technologyAreas: string[];
  keywords: string[];
  employeeCount?: number;
  hasResearchPartner?: boolean;
  canJoinConsortium?: boolean;
}

export interface MatchResultItem {
  programId: string;
  title: string;
  fitScore: number;
  eligibilityStatus: EligibilityStatus;
  spaceRelevance: string;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
  sourceUrl: string;
  agency?: string;
  sourceFamily: string;
  deadline?: string;
  status: SpaceProgramStatus;
  defenseOrDualUse: boolean;
  universityOrResearchPartnerRequired?: boolean;
}

export interface SearchInput {
  query?: string;
  applicantType?: ApplicantType;
  sourceFamily?: string;
  spaceCategory?: string;
  region?: string;
  deadlineWithinDays?: number;
  includeClosed?: boolean;
  includeDefense?: boolean;
  includeAdjacent?: boolean;
  defenseOnly?: boolean;
  sortBy?: "relevance" | "deadline" | "announcement_date";
  limit?: number;
}
