import { NextResponse } from "next/server";
import {
  scoreSpaceProgramFit,
  searchSpacePrograms
} from "@bidscout/shared";
import {
  getCompanyProfileValue,
  parseCompanyProfile,
  parseJsonRecord,
  parseSearchBody,
  RequestValidationError
} from "../../../../lib/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let profile;
  let input;
  try {
    const body = await parseJsonRecord(request);
    profile = parseCompanyProfile(getCompanyProfileValue(body));
    const parsedSearch = parseSearchBody(body);
    input = { ...parsedSearch, limit: parsedSearch.limit ?? 10 };
  } catch (error) {
    const message = error instanceof RequestValidationError ? error.message : "Invalid request";
    return NextResponse.json({ error: "Invalid request", message }, { status: 400 });
  }

  const programs = searchSpacePrograms(input);
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
