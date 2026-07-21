import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublicDemoConfigurationError,
  PublicDemoExportDisabledError,
  PublicDemoRequestError,
  assertGitHubIssueCreationAllowed,
  assertPublicDemoInput,
  assertPublicDemoNavigationUrl,
  assertPublicDemoNetworkUrl,
} from "@/lib/security/public-demo";
import type { NewTestInput } from "@/lib/schemas";

const input: NewTestInput = {
  stagingUrl: "https://specsentry-production.example/demo/shop?mode=defective",
  allowedHostname: "specsentry-production.example",
  userStory: "As a guest shopper, I can review the complete price before payment.",
  acceptanceCriteria: "The delivery charge and final total are visible before payment.",
  startingInstructions: "Stop on order review.",
};

afterEach(() => vi.unstubAllEnvs());

function enablePublicDemo() {
  vi.stubEnv("SPECSENTRY_PUBLIC_DEMO", "true");
  vi.stubEnv("PUBLIC_APP_URL", "https://specsentry-production.example");
}

describe("public demo policy", () => {
  it("accepts only an exact deployed Sentry Shop fixture URL", () => {
    enablePublicDemo();
    expect(() => assertPublicDemoInput(input)).not.toThrow();
    expect(() => assertPublicDemoInput({ ...input, stagingUrl: "https://specsentry-production.example/" })).toThrow(PublicDemoRequestError);
    expect(() => assertPublicDemoInput({ ...input, stagingUrl: `${input.stagingUrl}&next=https://external.example` })).toThrow(PublicDemoRequestError);
    expect(() => assertPublicDemoNavigationUrl("https://specsentry-production.example/")).toThrow(PublicDemoRequestError);
    expect(() => assertPublicDemoNetworkUrl("https://external.example/script.js")).toThrow(PublicDemoRequestError);
    expect(() => assertPublicDemoNetworkUrl("https://specsentry-production.example/_next/static/app.js")).not.toThrow();
  });

  it("rejects external staging URLs in public demo mode", () => {
    enablePublicDemo();
    expect(() => assertPublicDemoInput({ ...input, stagingUrl: "https://external.example/demo/shop?mode=defective", allowedHostname: "external.example" })).toThrow(PublicDemoRequestError);
  });

  it("requires an HTTPS root PUBLIC_APP_URL", () => {
    enablePublicDemo();
    vi.stubEnv("PUBLIC_APP_URL", "http://specsentry-production.example");
    expect(() => assertPublicDemoInput(input)).toThrow(PublicDemoConfigurationError);
  });

  it("leaves standard mode unchanged", () => {
    expect(() => assertPublicDemoInput({ ...input, stagingUrl: "https://external.example/test", allowedHostname: "external.example" })).not.toThrow();
  });

  it("blocks issue creation at the service boundary", () => {
    enablePublicDemo();
    expect(() => assertGitHubIssueCreationAllowed()).toThrow(PublicDemoExportDisabledError);
  });
});
