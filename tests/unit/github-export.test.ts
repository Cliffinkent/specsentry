import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import type { GitHubIssueClient } from "@/lib/github/client";
import { RestGitHubIssueClient } from "@/lib/github/client";
import { readGitHubExportConfig } from "@/lib/github/config";
import { exportGitHubIssue, previewGitHubIssue } from "@/lib/github/export-service";
import { buildGitHubIssuePreview } from "@/lib/github/markdown";
import { RunRepository } from "@/lib/repository";
import type { Evaluation, NewTestInput } from "@/lib/schemas";

const input: NewTestInput = {
  stagingUrl: "https://staging.example.com/demo",
  allowedHostname: "staging.example.com",
  userStory: "As a guest shopper, I can see the full price before payment.",
  acceptanceCriteria: "Delivery and final total are visible on review before payment.",
  startingInstructions: "Stop on review.",
};
const directories: string[] = [];

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "secret-test-token");
  vi.stubEnv("GITHUB_OWNER", "acme");
  vi.stubEnv("GITHUB_REPO", "shop");
  vi.stubEnv("GITHUB_REPOSITORY_ALLOWLIST", "acme/shop,acme/other");
  vi.stubEnv("PUBLIC_APP_URL", "http://127.0.0.1:3100");
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function approvedRun(id = crypto.randomUUID()) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "specsentry-export-"));
  directories.push(directory);
  vi.stubEnv("SPECSENTRY_DATA_DIR", directory);
  const repository = new RunRepository(path.join(directory, "test.sqlite"));
  const reference = `${id}/001-review.png`;
  const evaluation: Evaluation = {
    criterionId: "AC-01", status: "fail", summary: "Generated *summary* with [link](javascript:alert(1)).",
    finding: {
      title: "Missing costs", severity: "high", confidence: 0.98,
      expectedResult: "Delivery and total visible.", actualResult: "Only subtotal visible.",
      reproductionSteps: ["Open review.", "Observe | the costs."], evidenceReferences: [reference],
      lastSuccessfulStep: "open-order-review", suggestedNextTest: "Repeat on passing mode.",
    },
  };
  repository.createRun(id, { input, approvedPlan: demoPlan });
  repository.appendAction(id, { id: "action-1", sequence: 0, stepId: "inspect-costs", actionType: "observe", description: "Captured.", observation: "Subtotal.", timestamp: new Date().toISOString(), screenshotRef: reference });
  repository.setEvaluation(id, evaluation);
  repository.setStatus(id, "failed", true);
  repository.transitionFindingReview(id, "approve");
  return { repository, id };
}

describe("GitHub configuration and issue rendering", () => {
  it("requires an HTTPS public URL in production and an allow-listed repository", () => {
    expect(() => readGitHubExportConfig({ ...process.env, NODE_ENV: "production" })).toThrow("HTTPS");
    expect(() => readGitHubExportConfig({ ...process.env, PUBLIC_APP_URL: "https://specsentry.example", GITHUB_REPOSITORY_ALLOWLIST: "acme/different" })).toThrow("not allow-listed");
    expect(readGitHubExportConfig({ ...process.env, PUBLIC_APP_URL: "https://specsentry.example" }).repository).toBe("acme/shop");
  });

  it("renders escaped approved content, absolute report/evidence links, and source attribution", () => {
    const { repository, id } = approvedRun();
    const preview = buildGitHubIssuePreview(repository.getRun(id)!, readGitHubExportConfig());
    expect(preview.body).toContain(`http://127.0.0.1:3100/?run=${id}`);
    expect(preview.body).toContain(`http://127.0.0.1:3100/api/evidence/${id}/001-review.png`);
    expect(preview.body).toContain("AI-generated");
    expect(preview.body).toContain("Human-edited");
    expect(preview.body).not.toContain("[link](javascript:");
    expect(JSON.stringify(preview)).not.toContain("secret-test-token");
    repository.close();
  });
});

describe("GitHub export service", () => {
  it("creates exactly one issue and returns the stored URL on retry", async () => {
    const { repository, id } = approvedRun();
    const preview = previewGitHubIssue(id, repository);
    const createIssue = vi.fn().mockResolvedValue({ number: 7, htmlUrl: "https://github.com/acme/shop/issues/7" });
    const client: GitHubIssueClient = { findIssueByMarker: vi.fn().mockResolvedValue(null), createIssue };
    await expect(exportGitHubIssue(id, preview.previewToken, { repository, client })).resolves.toEqual({ githubIssueUrl: "https://github.com/acme/shop/issues/7", existing: false });
    await expect(exportGitHubIssue(id, preview.previewToken, { repository, client })).resolves.toEqual({ githubIssueUrl: "https://github.com/acme/shop/issues/7", existing: true });
    expect(createIssue).toHaveBeenCalledTimes(1);
    expect(repository.getRun(id)?.findingReview?.status).toBe("exported");
    repository.close();
  });

  it("recovers an existing marker without creating a duplicate", async () => {
    const { repository, id } = approvedRun();
    const preview = previewGitHubIssue(id, repository);
    const createIssue = vi.fn();
    const client: GitHubIssueClient = { findIssueByMarker: vi.fn().mockResolvedValue({ number: 9, htmlUrl: "https://github.com/acme/shop/issues/9" }), createIssue };
    await expect(exportGitHubIssue(id, preview.previewToken, { repository, client })).resolves.toEqual({ githubIssueUrl: "https://github.com/acme/shop/issues/9", existing: true });
    expect(createIssue).not.toHaveBeenCalled();
    repository.close();
  });

  it("keeps the finding approved after a safe GitHub failure", async () => {
    const { repository, id } = approvedRun();
    const preview = previewGitHubIssue(id, repository);
    const client: GitHubIssueClient = { findIssueByMarker: vi.fn().mockResolvedValue(null), createIssue: vi.fn().mockRejectedValue(new Error("upstream secret body")) };
    await expect(exportGitHubIssue(id, preview.previewToken, { repository, client })).rejects.toThrow("failed safely");
    const review = repository.getRun(id)?.findingReview;
    expect(review?.status).toBe("approved");
    expect(review?.lastExportError).not.toContain("upstream secret body");
    repository.close();
  });

  it("does not leak tokens or GitHub response bodies in client errors", async () => {
    const config = readGitHubExportConfig();
    const request = vi.fn().mockResolvedValue(new Response("private upstream response", { status: 401, headers: { "x-github-request-id": "request-1" } }));
    const client = new RestGitHubIssueClient(config, request);
    await expect(client.createIssue("Title", "Body")).rejects.toThrow("status 401");
    try { await client.createIssue("Title", "Body"); } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("secret-test-token");
      expect(message).not.toContain("private upstream response");
    }
  });
});
