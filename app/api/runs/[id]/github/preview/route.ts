import { NextResponse } from "next/server";
import { GitHubConfigurationError } from "@/lib/github/config";
import { previewGitHubIssue } from "@/lib/github/export-service";
import { reviewTransitionSchema } from "@/lib/schemas";
import { rateLimitKey, takeRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/redaction";
import { assertMutationIntent, readJsonBody } from "@/lib/security/request-policy";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = takeRateLimit(rateLimitKey(request, "github-preview"), 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many preview requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const { id } = await params;
  try {
    assertMutationIntent(request, "github-preview");
    reviewTransitionSchema.parse(await readJsonBody(request));
    const preview = previewGitHubIssue(id);
    return NextResponse.json({ preview: { title: preview.title, body: preview.body, repository: preview.repository, previewToken: preview.previewToken } });
  } catch (error) {
    logServerError(`github-preview:${id}`, error);
    if (error instanceof GitHubConfigurationError) return NextResponse.json({ error: "GitHub export is not configured for an allowed repository." }, { status: 503 });
    return NextResponse.json({ error: "An approved failed finding is required before preview." }, { status: 409 });
  }
}
