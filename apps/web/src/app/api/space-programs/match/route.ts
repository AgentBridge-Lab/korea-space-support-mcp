import { NextResponse } from "next/server";
import {
  scoreSpaceProgramFit,
  searchSpacePrograms,
  type SpaceCompanyProfile,
  type SpaceProgramSearchInput
} from "@bidscout/shared";

export const dynamic = "force-dynamic";

const normalize = (body: Record<string, unknown>): SpaceProgramSearchInput => ({
  query: body.query as string | undefined,
  spaceCategory: (body.spaceCategory ?? body.space_category) as SpaceProgramSearchInput["spaceCategory"],
  sourceFamily: (body.sourceFamily ?? body.source_family) as string | undefined,
  status: body.status as SpaceProgramSearchInput["status"],
  region: body.region as string | undefined,
  applicantType: (body.applicantType ?? body.applicant_type) as SpaceProgramSearchInput["applicantType"],
  deadlineWithinDays: (body.deadlineWithinDays ?? body.deadline_within_days) as number | undefined,
  includeAdjacent: (body.includeAdjacent ?? body.include_adjacent) as boolean | undefined,
  includeDefense: (body.includeDefense ?? body.include_defense) as boolean | undefined,
  defenseOnly: (body.defenseOnly ?? body.defense_only) as boolean | undefined,
  adjacentOnly: (body.adjacentOnly ?? body.adjacent_only) as boolean | undefined,
  includeClosed: (body.includeClosed ?? body.include_closed) as boolean | undefined,
  sortBy: (body.sortBy ?? body.sort_by) as SpaceProgramSearchInput["sortBy"],
  limit: (body.limit as number | undefined) ?? 10
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const profile = (body.companyProfile ?? body.company_profile) as SpaceCompanyProfile | undefined;
  if (!profile) {
    return NextResponse.json({ error: "companyProfile or company_profile is required" }, { status: 400 });
  }

  const programs = searchSpacePrograms(normalize(body));
  const matches = programs
    .map((program) => {
      const fit = scoreSpaceProgramFit(program, profile);
      return {
        ...fit,
        agency: program.agency,
        sourceFamily: program.sourceFamily,
        deadline: program.applicationEndDate,
        status: program.status,
        defenseOrDualUse: program.defenseOrDualUse,
        universityOrResearchPartnerRequired: program.universityOrResearchPartnerRequired
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return NextResponse.json({ matches });
}
