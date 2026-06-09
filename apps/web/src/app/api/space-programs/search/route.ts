import { NextResponse } from "next/server";
import { searchSpacePrograms, type SpaceProgramSearchInput } from "@bidscout/shared";

export const dynamic = "force-dynamic";

const normalize = (body: Record<string, unknown>): SpaceProgramSearchInput => ({
  query: body.query as string | undefined,
  spaceCategory: (body.spaceCategory ?? body.space_category) as SpaceProgramSearchInput["spaceCategory"],
  sourceFamily: (body.sourceFamily ?? body.source_family) as string | undefined,
  status: body.status as SpaceProgramSearchInput["status"],
  region: body.region as string | undefined,
  technologyAreas: (body.technologyAreas ?? body.technology_areas) as string[] | undefined,
  companyStage: (body.companyStage ?? body.company_stage) as string | undefined,
  applicantType: (body.applicantType ?? body.applicant_type) as SpaceProgramSearchInput["applicantType"],
  deadlineWithinDays: (body.deadlineWithinDays ?? body.deadline_within_days) as number | undefined,
  includeAdjacent: (body.includeAdjacent ?? body.include_adjacent) as boolean | undefined,
  includeDefense: (body.includeDefense ?? body.include_defense) as boolean | undefined,
  defenseOnly: (body.defenseOnly ?? body.defense_only) as boolean | undefined,
  adjacentOnly: (body.adjacentOnly ?? body.adjacent_only) as boolean | undefined,
  includeClosed: (body.includeClosed ?? body.include_closed) as boolean | undefined,
  sortBy: (body.sortBy ?? body.sort_by) as SpaceProgramSearchInput["sortBy"],
  limit: body.limit as number | undefined
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const results = searchSpacePrograms(normalize(body)).map((program) => ({
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

  return NextResponse.json({ results });
}
