import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/repository";
import { reviewTransitionSchema } from "@/lib/schemas";
import { logServerError } from "@/lib/security/redaction";
import { assertMutationIntent, readJsonBody } from "@/lib/security/request-policy";

export const runtime = "nodejs";
const transitionSchema = z.enum(["approve", "reject", "reopen"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; transition: string }> }) {
  const { id, transition: rawTransition } = await params;
  try {
    const transition = transitionSchema.parse(rawTransition);
    assertMutationIntent(request, `review-${transition}`);
    reviewTransitionSchema.parse(await readJsonBody(request));
    const review = getRepository().transitionFindingReview(id, transition);
    return NextResponse.json({ review });
  } catch (error) {
    logServerError(`review-transition:${id}`, error);
    const missing = error instanceof Error && /not found/i.test(error.message);
    return NextResponse.json({ error: missing ? "Run not found." : "That review transition is not allowed from the current state." }, { status: missing ? 404 : 409 });
  }
}
