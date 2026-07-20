import { describe, expect, it } from "vitest";
import { assertMutationIntent, assertSameOriginRequest } from "@/lib/security/request-policy";

describe("same-origin request policy", () => {
  it("uses the browser-visible Host header behind a local framework proxy", () => {
    const request = new Request("http://localhost:3100/api/plans", {
      headers: { origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100" },
    });
    expect(() => assertSameOriginRequest(request)).not.toThrow();
  });

  it("rejects a different browser origin", () => {
    const request = new Request("https://internal:3000/api/plans", {
      headers: { origin: "https://evil.example", host: "specsentry.example" },
    });
    expect(() => assertSameOriginRequest(request)).toThrow("Cross-origin requests are not allowed.");
  });

  it("requires an exact action header for state-changing review requests", () => {
    const allowed = new Request("https://specsentry.example/api/runs/id/review", {
      headers: { origin: "https://specsentry.example", host: "specsentry.example", "x-specsentry-action": "review-save" },
    });
    expect(() => assertMutationIntent(allowed, "review-save")).not.toThrow();
    expect(() => assertMutationIntent(allowed, "github-export-confirmed")).toThrow("confirmation header");
  });
});
