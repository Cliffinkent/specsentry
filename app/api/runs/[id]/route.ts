import { NextResponse } from "next/server";
import { buildRunReport } from "@/lib/report";
import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRepository().getRun(id);
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  return NextResponse.json({ report: buildRunReport(run) }, { headers: { "Cache-Control": "no-store" } });
}
