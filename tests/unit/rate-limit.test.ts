import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitsForTests, takePlanningRateLimit, takeRateLimit, takeRunCreationRateLimit } from "@/lib/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(resetRateLimitsForTests);
  afterEach(() => vi.unstubAllEnvs());

  it("blocks requests above the route budget until the window resets", () => {
    expect(takeRateLimit("plan:local", 2, 1_000, 100).allowed).toBe(true);
    expect(takeRateLimit("plan:local", 2, 1_000, 101).allowed).toBe(true);
    expect(takeRateLimit("plan:local", 2, 1_000, 102).allowed).toBe(false);
    expect(takeRateLimit("plan:local", 2, 1_000, 1_100).allowed).toBe(true);
  });

  it("uses strict public-demo plan and run budgets", () => {
    vi.stubEnv("SPECSENTRY_PUBLIC_DEMO", "true");
    const request = new Request("https://specsentry.example/api/plans", { headers: { "x-forwarded-for": "203.0.113.9" } });
    for (let attempt = 0; attempt < 4; attempt += 1) expect(takePlanningRateLimit(request).allowed).toBe(true);
    expect(takePlanningRateLimit(request).allowed).toBe(false);
    expect(takeRunCreationRateLimit(request).allowed).toBe(true);
    expect(takeRunCreationRateLimit(request).allowed).toBe(true);
    expect(takeRunCreationRateLimit(request).allowed).toBe(false);
  });
});
