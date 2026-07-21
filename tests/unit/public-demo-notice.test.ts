import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const notice = "Public demo mode is restricted to Sentry Shop. Deploy your own instance to test an approved staging domain.";

afterEach(() => vi.unstubAllEnvs());

describe("public demo notice", () => {
  it("renders the restriction notice from the server-provided public-demo flag", () => {
    vi.stubEnv("SPECSENTRY_PUBLIC_DEMO", "true");
    const markup = renderToStaticMarkup(HomePage());

    expect(markup).toContain('aria-label="Public demo restriction"');
    expect(markup).toContain(notice);
  });

  it("omits the restriction notice in normal self-hosted mode", () => {
    vi.stubEnv("SPECSENTRY_PUBLIC_DEMO", "false");
    const markup = renderToStaticMarkup(HomePage());

    expect(markup).not.toContain('aria-label="Public demo restriction"');
    expect(markup).not.toContain(notice);
  });
});
