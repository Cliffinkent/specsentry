import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitsForTests, takeRateLimit } from "@/lib/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(resetRateLimitsForTests);

  it("blocks requests above the route budget until the window resets", () => {
    expect(takeRateLimit("plan:local", 2, 1_000, 100).allowed).toBe(true);
    expect(takeRateLimit("plan:local", 2, 1_000, 101).allowed).toBe(true);
    expect(takeRateLimit("plan:local", 2, 1_000, 102).allowed).toBe(false);
    expect(takeRateLimit("plan:local", 2, 1_000, 1_100).allowed).toBe(true);
  });
});
