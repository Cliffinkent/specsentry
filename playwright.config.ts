import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["line"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ALLOW_LOCALHOST: "true",
      OPENAI_MOCK: "true",
      GITHUB_MOCK: "true",
      GITHUB_TOKEN: "playwright-server-only-token",
      GITHUB_OWNER: "acme",
      GITHUB_REPO: "shop",
      GITHUB_REPOSITORY_ALLOWLIST: "acme/shop",
      PUBLIC_APP_URL: baseURL,
      SPECSENTRY_DATA_DIR: process.env.SPECSENTRY_DATA_DIR ?? "./data/test",
    },
  },
});
