import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { assertSameOriginRequest } from "@/lib/security/request-policy";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginRequest(request);
    const { id } = await params;
    const repository = getRepository();
    if (!repository.getRun(id)) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    repository.requestCancellation(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Cancellation could not be requested." }, { status: 400 });
  }
}
