import { NextResponse } from "next/server";
import { executeRun } from "@/lib/executor/run-executor";
import { buildRunReport } from "@/lib/report";
import { getRepository } from "@/lib/repository";
import { runCreationRequestSchema } from "@/lib/schemas";
import { rateLimitKey, takeRateLimit } from "@/lib/security/rate-limit";
import { logServerError, safeUserError } from "@/lib/security/redaction";
import { assertSameOriginRequest, readJsonBody } from "@/lib/security/request-policy";
import { assertSafeNetworkTarget, developmentLocalhostAllowed } from "@/lib/security/url-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = getRepository().listRecentRuns(12).map(buildRunReport);
  return NextResponse.json({ runs }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const limit = takeRateLimit(rateLimitKey(request, "runs"), 6, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many run requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    assertSameOriginRequest(request);
    const runRequest = runCreationRequestSchema.parse(await readJsonBody(request));
    await assertSafeNetworkTarget(runRequest.input.stagingUrl, runRequest.input.allowedHostname, {
      allowDevelopmentLocalhost: developmentLocalhostAllowed(),
    });
    const repository = getRepository();
    const id = crypto.randomUUID();
    repository.createRun(id, runRequest);
    void executeRun(id, { repository }).catch((error) => {
      logServerError(`run:${id}`, error);
      repository.appendError(id, "The run stopped because of an internal error.");
      repository.setStatus(id, "error", true);
    });
    return NextResponse.json({ id }, { status: 202 });
  } catch (error) {
    logServerError("run-create", error);
    const validationError = error instanceof Error && (error.name === "ZodError" || /JSON request body|Cross-origin/.test(error.message));
    return NextResponse.json(
      { error: validationError ? "The approved plan or project details are invalid." : safeUserError(error, "The run could not be started.") },
      { status: validationError ? 400 : 422 },
    );
  }
}
