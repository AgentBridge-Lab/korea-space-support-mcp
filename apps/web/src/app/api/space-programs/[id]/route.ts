import { NextResponse } from "next/server";
import {
  getSpaceProgramById,
  toPublicSpaceProgram,
  UNTRUSTED_PUBLIC_SOURCE_NOTICE
} from "@bidscout/shared";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = getSpaceProgramById(id);
  if (!program) return NextResponse.json({ error: "Space program not found" }, { status: 404 });
  return NextResponse.json({
    dataTrust: UNTRUSTED_PUBLIC_SOURCE_NOTICE,
    program: toPublicSpaceProgram(program)
  });
}
