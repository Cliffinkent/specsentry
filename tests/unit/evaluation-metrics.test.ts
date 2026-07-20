import { describe, expect, it } from "vitest";
import { buildEvaluationMetrics, expectedClassificationMatches, type EvaluationCaseResult } from "@/lib/evaluation/results";
import { evaluationCases } from "@/lib/evaluation/cases";

function result(caseId: string, durationMs: number, actionCount: number): EvaluationCaseResult {
  const entry = evaluationCases.find(({ id }) => id === caseId)!;
  const actualStatus = entry.expectedStatus;
  return {
    caseId,
    title: entry.title,
    runId: crypto.randomUUID(),
    expectedStatus: entry.expectedStatus,
    actualStatus,
    expectedSeverity: entry.expectedSeverity,
    actualSeverity: entry.expectedSeverity,
    confidence: entry.expectedStatus === "fail" ? 0.98 : null,
    durationMs,
    actionCount,
    retries: caseId === "SS-EVAL-06" ? 1 : 0,
    screenshotCount: 2,
    evidenceReferences: entry.expectedStatus === "fail" ? [`run/${caseId}.png`] : [],
    evidenceIntegrity: { actionMapped: true, filesPresent: true, hasAtLeastOneScreenshot: true, missingActionReferences: [], missingFiles: [] },
    usefulFinding: entry.expectedStatus === "fail",
    matchesExpectedClassification: true,
    unexpectedNavigation: [],
    errors: [],
    summary: "Controlled result.",
    usage: {
      planner: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, totalTokens: 2 },
      executor: { inputTokens: 2, cachedInputTokens: 0, outputTokens: 1, totalTokens: 3 },
      evaluator: { inputTokens: 3, cachedInputTokens: 0, outputTokens: 1, totalTokens: 4 },
    },
  };
}

describe("evaluation metrics", () => {
  it("calculates all controlled-set targets, medians, retries, and phase usage", () => {
    const results = evaluationCases.map((entry, index) => result(entry.id, (index + 1) * 1_000, index + 1));
    const metrics = buildEvaluationMetrics(results);
    expect(metrics.clearFailureDetection).toEqual({ value: 3, target: 3 });
    expect(metrics.passingCaseFalseFailures).toEqual({ value: 0, target: 0 });
    expect(metrics.blockedClassification).toEqual({ value: 1, target: 1 });
    expect(metrics.ambiguousClassification).toEqual({ value: 1, target: 1 });
    expect(metrics.evidenceBackedFailedFindings).toEqual({ value: 3, target: 3 });
    expect(metrics.runsWithMissingScreenshots).toEqual({ value: 0, target: 0 });
    expect(metrics.totalDurationMs).toBe(55_000);
    expect(metrics.medianDurationMs).toBe(5_500);
    expect(metrics.totalActionCount).toBe(55);
    expect(metrics.medianActionCount).toBe(5.5);
    expect(metrics.retries).toBe(1);
    expect(metrics.tokenUsageByPhase.planner.totalTokens).toBe(20);
    expect(metrics.tokenUsageByPhase.executor.totalTokens).toBe(30);
    expect(metrics.tokenUsageByPhase.evaluator.totalTokens).toBe(40);
  });

  it("includes failed severity in expected classification matching", () => {
    expect(expectedClassificationMatches("fail", "high", "fail", "high")).toBe(true);
    expect(expectedClassificationMatches("fail", "high", "fail", "medium")).toBe(false);
    expect(expectedClassificationMatches("blocked", null, "blocked", null)).toBe(true);
  });
});
