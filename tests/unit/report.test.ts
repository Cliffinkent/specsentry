import { describe, expect, it } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { buildRunReport } from "@/lib/report";
import type { RunRecord } from "@/lib/repository";

describe("report creation from recorded evidence", () => {
  it("traces the criterion through the last checkpoint to recorded actions and screenshots", () => {
    const run: RunRecord = {
      id: "11111111-1111-4111-8111-111111111111",
      status: "failed",
      request: {
        input: {
          stagingUrl: "https://staging.example.com/demo",
          allowedHostname: "staging.example.com",
          userStory: "As a guest shopper, I can see the full price before payment.",
          acceptanceCriteria: "Delivery and final total are visible on review before payment.",
          startingInstructions: "Stop on review.",
        },
        approvedPlan: demoPlan,
      },
      actions: [
        {
          id: "action-1",
          sequence: 0,
          stepId: "inspect-costs",
          actionType: "observe",
          description: "Captured review.",
          observation: "Only basket subtotal is visible.",
          timestamp: "2026-07-17T12:00:01.000Z",
          screenshotRef: "11111111-1111-4111-8111-111111111111/001-review.png",
        },
      ],
      observations: ["Only basket subtotal is visible."],
      evaluation: {
        criterionId: "AC-01",
        status: "fail",
        summary: "Failed.",
        finding: {
          title: "Missing costs",
          severity: "high",
          confidence: 0.98,
          expectedResult: "Delivery and total visible.",
          actualResult: "Only subtotal visible.",
          reproductionSteps: ["Open review."],
          evidenceReferences: ["11111111-1111-4111-8111-111111111111/001-review.png"],
          lastSuccessfulStep: "open-order-review",
          suggestedNextTest: "Repeat on passing mode.",
        },
      },
      aiUsage: {
        planner: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3, totalTokens: 13 },
        executor: { inputTokens: 20, cachedInputTokens: 4, outputTokens: 5, totalTokens: 25 },
        evaluator: { inputTokens: 30, cachedInputTokens: 6, outputTokens: 7, totalTokens: 37 },
      },
      findingReview: null,
      errors: [],
      startedAt: "2026-07-17T12:00:00.000Z",
      completedAt: "2026-07-17T12:00:02.000Z",
      cancelRequested: false,
    };

    const report = buildRunReport(run);
    expect(report.durationMs).toBe(2_000);
    expect(report.evidenceTrace.checkpoint?.stepId).toBe("inspect-costs");
    expect(report.evidenceTrace.actions).toHaveLength(1);
    expect(report.evidenceTrace.screenshots).toEqual(["11111111-1111-4111-8111-111111111111/001-review.png"]);
    expect(report.evidenceTrace.judgement).toBe("fail");
    expect(report.aiUsage.executor.totalTokens).toBe(25);
  });
});
