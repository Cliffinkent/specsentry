import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { saveFindingReviewSchema } from "@/lib/schemas";
import { logServerError } from "@/lib/security/redaction";
import { assertMutationIntent, readJsonBody } from "@/lib/security/request-policy";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMutationIntent(request, "review-save");
    const { id } = await params;
    const body = saveFindingReviewSchema.parse(await readJsonBody(request));
    const review = getRepository().saveFindingReview(id, body.current, body.evidenceReferences);
    return NextResponse.json({ review });
  } catch (error) {
    logServerError("review-save", error);
    const missing = error instanceof Error && /not found/i.test(error.message);
    return NextResponse.json({ error: missing ? "Run not found." : "The draft could not be saved. Check the editable fields and evidence." }, { status: missing ? 404 : 400 });
  }
}
