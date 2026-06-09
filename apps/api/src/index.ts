import Fastify from "fastify";
import { z } from "zod";
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

const server = Fastify({ logger: true });

server.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      error: "Invalid request",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  requestLogSafe(error);
  return reply.status(500).send({ error: "Internal server error" });
});

const requestLogSafe = (error: unknown): void => {
  if (error instanceof Error) {
    server.log.error({ name: error.name, message: error.message }, "Unhandled API error");
    return;
  }

  server.log.error({ error }, "Unhandled API error");
};

const searchSchema = z.object({
  query: z.string().optional(),
  region: z.string().optional(),
  cpvCodes: z.array(z.string()).optional(),
  deadlineWithinDays: z.number().int().positive().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  limit: z.number().int().positive().max(50).optional()
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

server.get("/health", async () => ({
  ok: true,
  service: "bidscout-api"
}));

server.get("/space-sources", async () => ({
  sources: spaceSourceReviews
}));

server.get("/space-programs/ingest-report", async () => ({
  report: getSpaceIngestReport(),
  excluded: getExcludedSpacePrograms()
}));

server.post("/space-programs/classify", async (request, reply) => {
  const body = spaceClassificationSchema.parse(request.body);
  return reply.send(classifySpaceRelevance(body.text, body.sourceFamily));
});

server.post("/tenders/search", async (request, reply) => {
  const input = searchSchema.parse(request.body);
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

  return reply.send({ results });
});

server.get("/tenders/:id", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const tender = getTenderById(params.id);

  if (!tender) {
    return reply.status(404).send({ error: "Tender not found" });
  }

  return reply.send({ tender });
});

server.post("/tenders/match", async (request, reply) => {
  const body = z.object({
    companyProfile: companyProfileSchema,
    query: z.string().optional(),
    region: z.string().optional(),
    deadlineWithinDays: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(50).optional()
  }).parse(request.body);

  const profile: CompanyProfile = body.companyProfile;
  const tenders = searchTenders({
    query: body.query,
    region: body.region,
    deadlineWithinDays: body.deadlineWithinDays,
    limit: body.limit ?? 10
  });

  const matches = tenders
    .map((tender) => scoreTenderFit(tender, profile))
    .sort((a, b) => b.fitScore - a.fitScore);

  return reply.send({ matches });
});

server.post("/tenders/:id/explain", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const tender = getTenderById(params.id);

  if (!tender) {
    return reply.status(404).send({ error: "Tender not found" });
  }

  return reply.send({
    summary: tender.description ?? tender.title,
    key_requirements: tender.normalizedText.split(/\s+/).slice(0, 12),
    likely_required_documents: [
      "Company profile",
      "Relevant project examples",
      "Insurance evidence",
      "Certification evidence if required by official documents"
    ],
    open_questions: [
      "Confirm exact requirements in the official tender documents.",
      "Confirm certification and insurance requirements before bidding."
    ],
    status: tender.status,
    source_url: tender.sourceUrl,
    last_checked_at: tender.lastCheckedAt
  });
});

server.post("/space-programs/search", async (request, reply) => {
  const input = normalizeSpaceSearchRequest(spaceSearchSchema.parse(request.body));
  const results = searchSpacePrograms(input).map((program) => ({
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

  return reply.send({ results });
});

server.get("/space-programs/:id", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const program = getSpaceProgramById(params.id);

  if (!program) {
    return reply.status(404).send({ error: "Space program not found" });
  }

  return reply.send({ program });
});

server.post("/space-programs/match", async (request, reply) => {
  const body = z.object({
    companyProfile: spaceCompanyProfileSchema.optional(),
    company_profile: spaceCompanyProfileSchema.optional(),
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
  }).parse(request.body);

  const profile = body.companyProfile ?? body.company_profile;
  if (!profile) {
    return reply.status(400).send({ error: "companyProfile or company_profile is required" });
  }

  const programs = searchSpacePrograms({
    ...normalizeSpaceSearchRequest(body),
    limit: body.limit ?? 10
  });

  const matches = programs
    .map((program) => scoreSpaceProgramFit(program, profile))
    .sort((a, b) => b.fitScore - a.fitScore);

  return reply.send({ matches });
});

server.post("/space-programs/:id/check-eligibility", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const body = z.object({
    companyProfile: spaceCompanyProfileSchema
  }).parse(request.body);
  const program = getSpaceProgramById(params.id);

  if (!program) {
    return reply.status(404).send({ error: "Space program not found" });
  }

  const result = scoreSpaceProgramFit(program, body.companyProfile);
  return reply.send({
    ...result,
    disclaimer:
      "최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다."
  });
});

server.post("/space-programs/:id/summarize", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const program = getSpaceProgramById(params.id);

  if (!program) {
    return reply.status(404).send({ error: "Space program not found" });
  }

  return reply.send(summarizeSpaceProgram(program));
});

const port = Number(process.env.PORT ?? 4000);
await server.listen({ port, host: "0.0.0.0" });
