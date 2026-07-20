import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { RunRepository } from "@/lib/repository";
import type { Evaluation, NewTestInput } from "@/lib/schemas";

const input: NewTestInput = {
  stagingUrl: "https://staging.example.com/demo",
  allowedHostname: "staging.example.com",
  userStory: "As a guest shopper, I can see the full price before payment.",
  acceptanceCriteria: "Delivery and final total are visible on review before payment.",
  startingInstructions: "Stop on review.",
};
const evaluation: Evaluation = {
  criterionId: "AC-01",
  status: "fail",
  summary: "Generated summary.",
  finding: {
    title: "Missing costs",
    severity: "high",
    confidence: 0.98,
    expectedResult: "Delivery and total visible.",
    actualResult: "Only subtotal visible.",
    reproductionSteps: ["Open review."],
    evidenceReferences: ["run-1/001-review.png"],
    lastSuccessfulStep: "open-order-review",
    suggestedNextTest: "Repeat on passing mode.",
  },
};

const directories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function repository() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "specsentry-review-"));
  directories.push(directory);
  vi.stubEnv("SPECSENTRY_DATA_DIR", directory);
  return new RunRepository(path.join(directory, "test.sqlite"));
}

function failedRun(repo: RunRepository, id = "run-1") {
  repo.createRun(id, { input, approvedPlan: demoPlan });
  repo.appendAction(id, {
    id: "action-1", sequence: 0, stepId: "inspect-costs", actionType: "observe", description: "Captured review.",
    observation: "Only subtotal visible.", timestamp: new Date().toISOString(), screenshotRef: `${id}/001-review.png`,
  });
  const ownedEvaluation = { ...evaluation, finding: evaluation.finding ? { ...evaluation.finding, evidenceReferences: [`${id}/001-review.png`] } : null };
  repo.setEvaluation(id, ownedEvaluation);
  repo.setStatus(id, "failed", true);
  return repo.getRun(id)!;
}

describe("finding review persistence", () => {
  it("starts failures as drafts, preserves the original, and supports all review transitions", () => {
    const repo = repository();
    const run = failedRun(repo);
    expect(run.findingReview?.status).toBe("draft");
    const current = { ...run.findingReview!.current, title: "Human-edited missing delivery costs", severity: "critical" as const };
    repo.saveFindingReview(run.id, current, run.findingReview!.evidenceReferences);
    expect(repo.getRun(run.id)?.findingReview?.original.title).toBe("Missing costs");
    expect(repo.getRun(run.id)?.findingReview?.current.title).toBe(current.title);
    expect(repo.transitionFindingReview(run.id, "approve").status).toBe("approved");
    expect(repo.getRun(run.id)?.findingReview?.approvedAt).toBeTruthy();
    expect(repo.transitionFindingReview(run.id, "reject").status).toBe("rejected");
    expect(repo.transitionFindingReview(run.id, "reopen").status).toBe("draft");
    repo.close();
  });

  it("rejects fabricated or changed evidence references", () => {
    const repo = repository();
    const run = failedRun(repo);
    expect(() => repo.saveFindingReview(run.id, run.findingReview!.current, ["run-1/invented.png"]))
      .toThrow("read-only and must belong");
    repo.close();
  });

  it("does not create review state for non-failing evaluations", () => {
    const repo = repository();
    repo.createRun("pass-run", { input, approvedPlan: demoPlan });
    repo.setEvaluation("pass-run", { criterionId: "AC-01", status: "pass", summary: "Passed.", finding: null });
    repo.setStatus("pass-run", "passed", true);
    expect(repo.getRun("pass-run")?.findingReview).toBeNull();
    expect(() => repo.transitionFindingReview("pass-run", "approve")).toThrow("failed finding");
    repo.close();
  });

  it("attributes a planner receipt once and accumulates phase usage", () => {
    const repo = repository();
    const planner = { inputTokens: 10, cachedInputTokens: 3, outputTokens: 4, totalTokens: 14 };
    const planId = repo.createPlanReceipt(input, planner);
    repo.createRun("usage-run", { input, approvedPlan: demoPlan, planId });
    repo.addUsage("usage-run", "executor", { inputTokens: 20, cachedInputTokens: 5, outputTokens: 6, totalTokens: 26 });
    expect(repo.getRun("usage-run")?.aiUsage).toEqual({
      planner,
      executor: { inputTokens: 20, cachedInputTokens: 5, outputTokens: 6, totalTokens: 26 },
      evaluator: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
    expect(() => repo.createRun("usage-run-2", { input, approvedPlan: demoPlan, planId })).toThrow("missing, used, or does not match");
    repo.close();
  });
});
