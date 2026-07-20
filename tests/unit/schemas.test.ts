import { describe, expect, it } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { evaluationSchema, testPlanSchema } from "@/lib/schemas";

describe("planner schema", () => {
  it("accepts the strict demo plan", () => {
    expect(testPlanSchema.parse(demoPlan)).toEqual(demoPlan);
  });

  it("rejects duplicate step IDs and retry limits above two", () => {
    const invalid = {
      ...demoPlan,
      steps: [
        { ...demoPlan.steps[0], retryLimit: 3 },
        { ...demoPlan.steps[1], id: demoPlan.steps[0].id },
      ],
    };
    expect(testPlanSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires at least one evidence checkpoint", () => {
    expect(testPlanSchema.safeParse({ ...demoPlan, steps: demoPlan.steps.map((step) => ({ ...step, checkpoint: false })) }).success).toBe(false);
  });
});

describe("evaluator schema", () => {
  const finding = {
    title: "Delivery cost is missing",
    severity: "high" as const,
    confidence: 0.98,
    expectedResult: "Delivery and final total are visible.",
    actualResult: "Only subtotal was visible.",
    reproductionSteps: ["Open review."],
    evidenceReferences: ["run/screenshot.png"],
    lastSuccessfulStep: "review",
    suggestedNextTest: "Repeat on passing mode.",
  };

  it("accepts a failed result with a complete finding", () => {
    expect(evaluationSchema.parse({ criterionId: "AC-01", status: "fail", summary: "Failed.", finding }).finding).toEqual(finding);
  });

  it("rejects a failed result without a finding", () => {
    expect(evaluationSchema.safeParse({ criterionId: "AC-01", status: "fail", summary: "Failed.", finding: null }).success).toBe(false);
  });

  it("rejects findings for passed criteria", () => {
    expect(evaluationSchema.safeParse({ criterionId: "AC-01", status: "pass", summary: "Passed.", finding }).success).toBe(false);
  });
});
