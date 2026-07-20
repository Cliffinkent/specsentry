import { NextResponse } from "next/server";
import { generatePlanWithUsage } from "@/lib/ai/services";
import { getRepository } from "@/lib/repository";
import { newTestInputSchema } from "@/lib/schemas";
import { rateLimitKey, takeRateLimit } from "@/lib/security/rate-limit";
import { logServerError, safeUserError } from "@/lib/security/redaction";
import { assertSameOriginRequest, readJsonBody } from "@/lib/security/request-policy";
import { assertApprovedUrl, developmentLocalhostAllowed } from "@/lib/security/url-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = takeRateLimit(rateLimitKey(request, "plans"), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many plan requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    assertSameOriginRequest(request);
    const input = newTestInputSchema.parse(await readJsonBody(request));
    assertApprovedUrl(input.stagingUrl, input.allowedHostname, {
      allowDevelopmentLocalhost: developmentLocalhostAllowed(),
    });
    const { plan, usage } = await generatePlanWithUsage(input);
    const planId = getRepository().createPlanReceipt(input, usage);
    return NextResponse.json({ plan, planId });
  } catch (error) {
    logServerError("plan", error);
    const validationError = error instanceof Error && (error.name === "ZodError" || /JSON request body|Cross-origin/.test(error.message));
    return NextResponse.json(
      { error: validationError ? "Check the test details and try again." : safeUserError(error, "The plan could not be generated. Try again shortly.") },
      { status: validationError ? 400 : 502 },
    );
  }
}
