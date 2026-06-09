import { NextResponse } from "next/server";
import { spaceSourceReviews } from "@bidscout/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sources: spaceSourceReviews });
}
