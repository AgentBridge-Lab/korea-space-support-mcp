import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  classifySpaceRelevance,
  getExcludedSpacePrograms,
  getSpaceIngestReport,
  getTenderById,
  getSpaceProgramById,
  scoreTenderFit,
  scoreSpaceProgramFit,
  searchSpacePrograms,
  searchTenders,
  spaceSourceReviews,
  summarizeSpaceProgram,
  type CompanyProfile,
  type SpaceCompanyProfile
} from "@bidscout/shared";

const server = new McpServer({
  name: "bidscout-mcp",
  version: "0.1.0"
});

const companyProfileSchema = z.object({
  name: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  companySize: z.string().optional(),
  employeeCount: z.number().int().optional(),
  certifications: z.array(z.string()).default([]),
  pastProjects: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  preferredContractValueMin: z.number().optional(),
  preferredContractValueMax: z.number().optional(),
  excludedKeywords: z.array(z.string()).default([])
});

const spaceCategorySchema = z.enum([
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

const spaceProgramStatusSchema = z.enum(["active", "closed", "cancelled", "stale"]);
const spaceProgramSortSchema = z.enum(["relevance", "deadline", "recent"]);
const spaceApplicantTypeSchema = z.enum(["researcher_or_lab", "company", "startup_or_prefounder"]);

const spaceSearchSchema = z.object({
  query: z.string().optional(),
  spaceCategory: spaceCategorySchema.optional(),
  space_category: spaceCategorySchema.optional(),
  sourceFamily: z.string().optional(),
  source_family: z.string().optional(),
  status: spaceProgramStatusSchema.optional(),
  region: z.string().optional(),
  technologyAreas: z.array(z.string()).optional(),
  technology_areas: z.array(z.string()).optional(),
  companyStage: z.string().optional(),
  company_stage: z.string().optional(),
  applicantType: spaceApplicantTypeSchema.optional(),
  applicant_type: spaceApplicantTypeSchema.optional(),
  deadlineWithinDays: z.number().int().positive().optional(),
  deadline_within_days: z.number().int().positive().optional(),
  includeAdjacent: z.boolean().optional(),
  include_adjacent: z.boolean().optional(),
  includeDefense: z.boolean().optional(),
  include_defense: z.boolean().optional(),
  defenseOnly: z.boolean().optional(),
  defense_only: z.boolean().optional(),
  adjacentOnly: z.boolean().optional(),
  adjacent_only: z.boolean().optional(),
  includeClosed: z.boolean().optional(),
  include_closed: z.boolean().optional(),
  sortBy: spaceProgramSortSchema.optional(),
  sort_by: spaceProgramSortSchema.optional(),
  limit: z.number().int().positive().max(50).optional()
});

type SpaceSearchRequest = z.infer<typeof spaceSearchSchema>;

const normalizeSpaceSearchRequest = (input: SpaceSearchRequest) => ({
  query: input.query,
  spaceCategory: input.spaceCategory ?? input.space_category,
  sourceFamily: input.sourceFamily ?? input.source_family,
  status: input.status,
  region: input.region,
  technologyAreas: input.technologyAreas ?? input.technology_areas,
  companyStage: input.companyStage ?? input.company_stage,
  applicantType: input.applicantType ?? input.applicant_type,
  deadlineWithinDays: input.deadlineWithinDays ?? input.deadline_within_days,
  includeAdjacent: input.includeAdjacent ?? input.include_adjacent,
  includeDefense: input.includeDefense ?? input.include_defense,
  defenseOnly: input.defenseOnly ?? input.defense_only,
  adjacentOnly: input.adjacentOnly ?? input.adjacent_only,
  includeClosed: input.includeClosed ?? input.include_closed,
  sortBy: input.sortBy ?? input.sort_by,
  limit: input.limit
});

const spaceCompanyProfileSchema = z.object({
  name: z.string().optional(),
  businessType: z.string().optional(),
  region: z.string().optional(),
  foundedAt: z.string().optional(),
  industry: z.string().optional(),
  technologyAreas: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  employeeCount: z.number().int().optional(),
  revenue: z.number().optional(),
  previousGrants: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  hasResearchPartner: z.boolean().optional(),
  canJoinConsortium: z.boolean().optional(),
  description: z.string().optional()
});

const spaceClassificationSchema = z.object({
  text: z.string().min(1),
  sourceFamily: z.string().optional()
});

server.registerTool(
  "search_tenders",
  {
    description: "Search Contracts Finder-first UK public tender sample data by query, region, CPV, value, and deadline.",
    inputSchema: z.object({
      query: z.string().optional(),
      region: z.string().optional(),
      cpvCodes: z.array(z.string()).optional(),
      deadlineWithinDays: z.number().int().positive().optional(),
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      limit: z.number().int().positive().max(50).optional()
    })
  },
  async (input) => {
    const results = searchTenders(input).map((tender) => ({
      tender_id: tender.id,
      title: tender.title,
      buyer_name: tender.buyerName,
      deadline: tender.deadlineAt,
      estimated_value: tender.valueMax,
      currency: tender.currency,
      region: tender.region,
      status: tender.status,
      summary: tender.description,
      source: tender.source,
      source_url: tender.sourceUrl,
      last_checked_at: tender.lastCheckedAt
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }]
    };
  }
);

server.registerTool(
  "get_tender_detail",
  {
    description: "Get full details for a tender by ID, including source URL and last checked timestamp.",
    inputSchema: z.object({
      tenderId: z.string()
    })
  },
  async ({ tenderId }) => {
    const tender = getTenderById(tenderId);
    const payload = tender ? { tender } : { error: "Tender not found" };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
    };
  }
);

server.registerTool(
  "match_tenders_to_company",
  {
    description: "Rank tenders against a company profile with explainable fit scores, risks, and missing information.",
    inputSchema: z.object({
      companyProfile: companyProfileSchema,
      query: z.string().optional(),
      region: z.string().optional(),
      deadlineWithinDays: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(50).optional()
    })
  },
  async ({ companyProfile, query, region, deadlineWithinDays, limit }) => {
    const tenders = searchTenders({ query, region, deadlineWithinDays, limit: limit ?? 10 });
    const matches = tenders
      .map((tender) => scoreTenderFit(tender, companyProfile as CompanyProfile))
      .sort((a, b) => b.fitScore - a.fitScore);

    return {
      content: [{ type: "text", text: JSON.stringify({ matches }, null, 2) }]
    };
  }
);

server.registerTool(
  "list_space_sources",
  {
    description:
      "List Korea Space Support MCP source families with MVP status, collection policy, and known gaps.",
    inputSchema: z.object({})
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify({ sources: spaceSourceReviews }, null, 2) }]
  })
);

server.registerTool(
  "classify_space_notice",
  {
    description:
      "Classify raw Korean public-notice text into core space, satellite, launch, space data, defense space, aerospace, or adjacent categories.",
    inputSchema: spaceClassificationSchema
  },
  async ({ text, sourceFamily }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(classifySpaceRelevance(text, sourceFamily), null, 2)
      }
    ]
  })
);

server.registerTool(
  "get_space_ingest_report",
  {
    description:
      "Return the latest Korea Space Support ingestion report, including generated counts and excluded candidates with reasons.",
    inputSchema: z.object({})
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            report: getSpaceIngestReport(),
            excluded: getExcludedSpacePrograms()
          },
          null,
          2
        )
      }
    ]
  })
);

server.registerTool(
  "search_space_programs",
  {
    description:
      "Search Korean space, aerospace, defense-space, astronomy, satellite, launch, UAM, and space-adjacent support/R&D program samples.",
    inputSchema: spaceSearchSchema
  },
  async (input) => {
    const results = searchSpacePrograms(normalizeSpaceSearchRequest(input)).map((program) => ({
      program_id: program.id,
      title: program.title,
      agency: program.agency,
      source_family: program.sourceFamily,
      space_category: program.spaceCategory,
      relevance_score: program.relevanceScore,
      deadline: program.applicationEndDate,
	      support_amount: program.supportAmountText,
	      status: program.status,
	      summary: program.summary,
	      target_company_type: program.targetCompanyType,
	      participation_type: program.participationType,
	      university_or_research_partner_required: program.universityOrResearchPartnerRequired,
	      defense_or_dual_use: program.defenseOrDualUse,
      restricted_notice: program.restrictedNotice,
      source: program.source,
      source_url: program.sourceUrl,
      last_checked_at: program.lastCheckedAt
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }]
    };
  }
);

server.registerTool(
  "get_space_program_detail",
  {
    description:
      "Get detailed source-linked information for a Korean space/aerospace support program.",
    inputSchema: z.object({
      programId: z.string()
    })
  },
  async ({ programId }) => {
    const program = getSpaceProgramById(programId);
    const payload = program ? { program } : { error: "Space program not found" };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
    };
  }
);

server.registerTool(
  "match_space_programs_to_company",
  {
    description:
      "Rank Korean space/aerospace support programs for a company profile with reasons, risks, and missing information.",
    inputSchema: spaceSearchSchema.extend({
      companyProfile: spaceCompanyProfileSchema.optional(),
      company_profile: spaceCompanyProfileSchema.optional()
    })
  },
  async (input) => {
    const companyProfile = input.companyProfile ?? input.company_profile;
    if (!companyProfile) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "companyProfile or company_profile is required" }, null, 2)
          }
        ]
      };
    }

    const programs = searchSpacePrograms({
      ...normalizeSpaceSearchRequest(input),
      limit: input.limit ?? 10
    });
    const matches = programs
      .map((program) => scoreSpaceProgramFit(program, companyProfile as SpaceCompanyProfile))
      .sort((a, b) => b.fitScore - a.fitScore);

    return {
      content: [{ type: "text", text: JSON.stringify({ matches }, null, 2) }]
    };
  }
);

server.registerTool(
  "summarize_space_program",
  {
    description:
      "Summarize a Korean space/aerospace support program with purpose, target, documents, warnings, and source link.",
    inputSchema: z.object({
      programId: z.string()
    })
  },
  async ({ programId }) => {
    const program = getSpaceProgramById(programId);
    const payload = program ? summarizeSpaceProgram(program) : { error: "Space program not found" };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
    };
  }
);

server.registerTool(
  "check_space_program_eligibility",
  {
    description:
      "Check one Korean space/aerospace support program against a company profile. Returns likely, unlikely, or needs_review only.",
    inputSchema: z.object({
      programId: z.string(),
      companyProfile: spaceCompanyProfileSchema
    })
  },
  async ({ programId, companyProfile }) => {
    const program = getSpaceProgramById(programId);
    const payload = program
      ? {
          ...scoreSpaceProgramFit(program, companyProfile as SpaceCompanyProfile),
          disclaimer:
            "최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다."
        }
      : { error: "Space program not found" };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
