import { NextResponse } from "next/server";
import { GitHubConfigurationError } from "@/lib/github/config";
import { exportGitHubIssue } from "@/lib/github/export-service";
import { githubExportRequestSchema } from "@/lib/schemas";
import { rateLimitKey, takeRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/redaction";
import { assertMutationIntent, readJsonBody } from "@/lib/security/request-policy";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = takeRateLimit(rateLimitKey(request, "github-export"), 4, 300_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many export requests. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const { id } = await params;
  try {
    assertMutationIntent(request, "github-export-confirmed");
    const body = githubExportRequestSchema.parse(await readJsonBody(request));
    const result = await exportGitHubIssue(id, body.previewToken);
    return NextResponse.json(result);
  } catch (error) {
    logServerError(`github-export-route:${id}`, error);
    if (error instanceof GitHubConfigurationError) return NextResponse.json({ error: "GitHub export is not configured for an allowed repository." }, { status: 503 });
    const retryable = error instanceof Error && /failed safely/i.test(error.message);
    return NextResponse.json({ error: retryable ? error.message : "Export requires the latest preview and a separate explicit confirmation." }, { status: retryable ? 502 : 409 });
  }
}
