import { describe, expect, it, vi } from "vitest";
import { demoPlan } from "@/lib/ai/mock-provider";
import { evaluateEvidence, generatePlan, generatePlanWithUsage, ModelOutputError } from "@/lib/ai/services";
import type { AIProvider, EvaluationPackage } from "@/lib/ai/types";
import type { NewTestInput } from "@/lib/schemas";

const input: NewTestInput = {
  stagingUrl: "https://staging.example.com/demo",
  allowedHostname: "staging.example.com",
  userStory: "As a guest shopper, I can see the full price before payment.",
  acceptanceCriteria: "Given an item in my basket, delivery and total are visible on review.",
  startingInstructions: "Stop on review.",
};
const usage = { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3, totalTokens: 13 };
const result = (output: unknown) => ({ output, usage });

function provider(overrides: Partial<AIProvider>): AIProvider {
  return {
    plan: async () => result(demoPlan),
    computer: async () => ({ responseId: "response", callId: null, actions: [], observation: "Complete", pendingSafetyChecks: [], usage }),
    evaluate: async () => result({ criterionId: "AC-01", status: "pass", summary: "Passed.", finding: null }),
    ...overrides,
  };
}

const evidencePackage: EvaluationPackage = {
  input,
  approvedPlan: demoPlan,
  actions: [],
  observations: ["Order review"],
  errors: [],
  screenshots: [{ reference: "run/001-review.png", dataUrl: "data:image/png;base64,AA==" }],
};

describe("structured model boundaries", () => {
  it("retries invalid planner output exactly once", async () => {
    const plan = vi.fn().mockResolvedValueOnce(result({ invalid: true })).mockResolvedValueOnce(result(demoPlan));
    await expect(generatePlan(input, provider({ plan }))).resolves.toEqual(demoPlan);
    expect(plan).toHaveBeenCalledTimes(2);
  });

  it("fails safely when OpenAI is unavailable", async () => {
    const unavailable = provider({ plan: async () => { throw new Error("Model service connection refused"); } });
    await expect(generatePlan(input, unavailable)).rejects.toThrow("planning service is unavailable");
  });

  it("rejects invalid planner output after the controlled retry", async () => {
    const invalid = provider({ plan: async () => result({ objective: "bad" }) });
    await expect(generatePlan(input, invalid)).rejects.toBeInstanceOf(ModelOutputError);
  });

  it("rejects evaluator evidence references absent from the run", async () => {
    const evaluate = vi.fn().mockResolvedValue(result({
      criterionId: "AC-01",
      status: "fail",
      summary: "Failed.",
      finding: {
        title: "Missing costs",
        severity: "high",
        confidence: 0.95,
        expectedResult: "Costs visible.",
        actualResult: "Costs absent.",
        reproductionSteps: ["Open review."],
        evidenceReferences: ["invented.png"],
        lastSuccessfulStep: "review",
        suggestedNextTest: "Repeat.",
      },
    }));
    await expect(evaluateEvidence(evidencePackage, provider({ evaluate }))).rejects.toBeInstanceOf(ModelOutputError);
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it("aggregates usage across a controlled planner retry", async () => {
    const plan = vi.fn().mockResolvedValueOnce(result({ invalid: true })).mockResolvedValueOnce(result(demoPlan));
    const generated = await generatePlanWithUsage(input, provider({ plan }));
    expect(generated.usage).toEqual({ inputTokens: 20, cachedInputTokens: 4, outputTokens: 6, totalTokens: 26 });
  });
});
