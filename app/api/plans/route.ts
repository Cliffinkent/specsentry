import { NextResponse } from "next/server";
import { generatePlanWithUsage } from "@/lib/ai/services";
import { getRepository } from "@/lib/repository";
import { newTestInputSchema } from "@/lib/schemas";
import { PublicDemoConfigurationError, PublicDemoRequestError, assertPublicDemoInput } from "@/lib/security/public-demo";
import { takePlanningRateLimit } from "@/lib/security/rate-limit";
import { logServerError, safeUserError } from "@/lib/security/redaction";
import { assertSameOriginRequest, readJsonBody } from "@/lib/security/request-policy";
import { assertApprovedUrl, developmentLocalhostAllowed } from "@/lib/security/url-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = takePlanningRateLimit(request);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many plan requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    assertSameOriginRequest(request);
    const input = newTestInputSchema.parse(await readJsonBody(request));
    assertPublicDemoInput(input);
    assertApprovedUrl(input.stagingUrl, input.allowedHostname, {
      allowDevelopmentLocalhost: developmentLocalhostAllowed(),
    });
    const { plan, usage } = await generatePlanWithUsage(input);
    const planId = getRepository().createPlanReceipt(input, usage);
    return NextResponse.json({ plan, planId });
  } catch (error) {
    logServerError("plan", error);
    const validationError = error instanceof PublicDemoRequestError || error instanceof Error && (error.name === "ZodError" || /JSON request body|Cross-origin/.test(error.message));
    if (error instanceof PublicDemoConfigurationError) {
      return NextResponse.json({ error: "The public demo is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json(
      { error: validationError ? "Check the test details and try again." : safeUserError(error, "The plan could not be generated. Try again shortly.") },
      { status: validationError ? 400 : 502 },
    );
  }
}
