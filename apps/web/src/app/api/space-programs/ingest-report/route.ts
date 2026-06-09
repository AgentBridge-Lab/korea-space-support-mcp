import { NextResponse } from "next/server";
import { getExcludedSpacePrograms, getSpaceIngestReport } from "@bidscout/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ report: getSpaceIngestReport(), excluded: getExcludedSpacePrograms() });
}
