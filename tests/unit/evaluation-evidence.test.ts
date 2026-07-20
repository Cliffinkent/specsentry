import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { verifyReportEvidence } from "@/lib/evaluation/evidence";
import { buildRunReport } from "@/lib/report";
import type { RunRecord } from "@/lib/repository";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

function runRecord(runId: string, evidenceReference: string): RunRecord {
  const screenshotReference = `${runId}/001-review.png`;
  return {
    id: runId,
    status: "failed",
    request: {
      input: {
        stagingUrl: "http://127.0.0.1:3127/demo/shop?mode=defective",
        allowedHostname: "127.0.0.1",
        userStory: "As a shopper, I need full costs before payment.",
        acceptanceCriteria: "Delivery charge and final total must be visible before payment.",
        startingInstructions: "Stop on review.",
        evaluationCaseId: "SS-EVAL-06",
      },
      approvedPlan: demoPlan,
    },
    actions: [{
      id: crypto.randomUUID(),
      sequence: 0,
      stepId: "inspect-costs",
      actionType: "observe",
      description: "Captured review.",
      observation: "URL: http://127.0.0.1:3127/demo/shop?mode=defective",
      timestamp: "2026-07-20T15:00:00.000Z",
      screenshotRef: screenshotReference,
    }],
    observations: ["Review captured."],
    evaluation: {
      criterionId: "SS-EVAL-06",
      status: "fail",
      summary: "Costs missing.",
      finding: {
        title: "Costs missing",
        severity: "high",
        confidence: 0.98,
        expectedResult: "Costs visible.",
        actualResult: "Costs absent.",
        reproductionSteps: ["Open review."],
        evidenceReferences: [evidenceReference],
        lastSuccessfulStep: "open-order-review",
        suggestedNextTest: "Repeat.",
      },
    },
    aiUsage: {
      planner: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
      executor: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
      evaluator: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
    },
    findingReview: null,
    errors: [],
    startedAt: "2026-07-20T15:00:00.000Z",
    completedAt: "2026-07-20T15:00:01.000Z",
    cancelRequested: false,
  };
}

describe("evaluation evidence integrity", () => {
  it("maps finding references to actions and persisted non-empty files", async () => {
    const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-evidence-"));
    temporaryDirectories.push(runtime);
    const runId = crypto.randomUUID();
    const reference = `${runId}/001-review.png`;
    const screenshotDirectory = path.join(runtime, "screenshots", runId);
    await fs.mkdir(screenshotDirectory, { recursive: true });
    await fs.writeFile(path.join(screenshotDirectory, "001-review.png"), Buffer.from("png"));
    await expect(verifyReportEvidence(buildRunReport(runRecord(runId, reference)), runtime)).resolves.toEqual({
      actionMapped: true,
      filesPresent: true,
      hasAtLeastOneScreenshot: true,
      missingActionReferences: [],
      missingFiles: [],
    });
  });

  it("reports invented evaluator references and missing files", async () => {
    const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-evidence-"));
    temporaryDirectories.push(runtime);
    const runId = crypto.randomUUID();
    const integrity = await verifyReportEvidence(buildRunReport(runRecord(runId, `${runId}/invented.png`)), runtime);
    expect(integrity.actionMapped).toBe(false);
    expect(integrity.filesPresent).toBe(false);
    expect(integrity.missingActionReferences).toEqual([`${runId}/invented.png`]);
  });
});
