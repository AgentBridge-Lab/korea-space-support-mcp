import { NextResponse } from "next/server";
import { searchSpacePrograms } from "@bidscout/shared";
import {
  parseJsonRecord,
  parseSearchBody,
  RequestValidationError
} from "../../../../lib/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let input;
  try {
    input = parseSearchBody(await parseJsonRecord(request));
  } catch (error) {
    const message = error instanceof RequestValidationError ? error.message : "Invalid request";
    return NextResponse.json({ error: "Invalid request", message }, { status: 400 });
  }
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

  return NextResponse.json({ results });
}
