import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { evaluateEvidence } from "@/lib/ai/services";
import type { EvaluationPackage } from "@/lib/ai/types";
import { evaluationCases, inputForEvaluationCase } from "@/lib/evaluation/cases";
import { testPlanSchema } from "@/lib/schemas";

describe("controlled mock classifications", () => {
  it("classifies all ten cases and creates findings only for failures", async () => {
    const provider = new MockAIProvider();
    for (const entry of evaluationCases) {
      const input = inputForEvaluationCase(entry, "http://127.0.0.1:3127");
      const plan = testPlanSchema.parse((await provider.plan(input)).output);
      const packageInput: EvaluationPackage = {
        input,
        approvedPlan: plan,
        actions: [],
        observations: [entry.expectedVisibleEvidence],
        errors: [],
        screenshots: [{ reference: `${entry.id}/001.png`, dataUrl: "data:image/png;base64,AA==" }],
      };
      const evaluation = await evaluateEvidence(packageInput, provider);
      expect(evaluation.status).toBe(entry.expectedStatus);
      expect(evaluation.finding === null).toBe(entry.expectedStatus !== "fail");
      if (evaluation.finding) {
        expect(evaluation.finding.severity).toBe(entry.expectedSeverity);
        expect(evaluation.finding.evidenceReferences).toEqual([`${entry.id}/001.png`]);
      }
    }
  });

  it("explains the blocker and ambiguity without creating defects", async () => {
    const provider = new MockAIProvider();
    for (const caseId of ["SS-EVAL-09", "SS-EVAL-10"] as const) {
      const entry = evaluationCases.find(({ id }) => id === caseId)!;
      const input = inputForEvaluationCase(entry, "http://127.0.0.1:3127");
      const plan = testPlanSchema.parse((await provider.plan(input)).output);
      const evaluation = await evaluateEvidence({ input, approvedPlan: plan, actions: [], observations: [], errors: [], screenshots: [] }, provider);
      expect(evaluation.finding).toBeNull();
      expect(evaluation.summary).toMatch(caseId === "SS-EVAL-09" ? /prerequisite.*unavailable/i : /clarify|measurable/i);
    }
  });
});
