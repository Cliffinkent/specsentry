import { describe, expect, it } from "vitest";
import { evaluationCases, inputForEvaluationCase, selectEvaluationCases } from "@/lib/evaluation/cases";

describe("controlled evaluation catalog", () => {
  it("contains exactly the requested status distribution and unique IDs", () => {
    expect(evaluationCases).toHaveLength(10);
    expect(new Set(evaluationCases.map(({ id }) => id)).size).toBe(10);
    expect(evaluationCases.filter(({ expectedStatus }) => expectedStatus === "pass")).toHaveLength(5);
    expect(evaluationCases.filter(({ expectedStatus }) => expectedStatus === "fail")).toHaveLength(3);
    expect(evaluationCases.filter(({ expectedStatus }) => expectedStatus === "blocked")).toHaveLength(1);
    expect(evaluationCases.filter(({ expectedStatus }) => expectedStatus === "inconclusive")).toHaveLength(1);
  });

  it("defines the three distinct seeded failure behaviors", () => {
    const failures = evaluationCases.filter(({ expectedStatus }) => expectedStatus === "fail");
    expect(failures.map(({ fixtureMode }) => fixtureMode)).toEqual(["defective", "validation-missing", "basket-lost"]);
    expect(failures.every(({ expectedSeverity }) => expectedSeverity === "high")).toBe(true);
  });

  it("uses positive observable outcomes for all passing cases", () => {
    const criteria = evaluationCases.filter(({ expectedStatus }) => expectedStatus === "pass").map(({ acceptanceCriterion }) => acceptanceCriterion);
    expect(criteria).toEqual(expect.arrayContaining([
      expect.stringContaining("Alpine Trail Backpack, Forest green, and £80.00"),
      expect.stringContaining("Quantity 1"),
      expect.stringContaining("without a sign-in"),
      expect.stringContaining("Enter your full name"),
      expect.stringContaining("Final total £84.95"),
    ]));
  });

  it("persists the case ID in strict run input and supports selection", () => {
    const selected = selectEvaluationCases(["SS-EVAL-04", "SS-EVAL-09"]);
    expect(selected.map(({ id }) => id)).toEqual(["SS-EVAL-04", "SS-EVAL-09"]);
    const input = inputForEvaluationCase(selected[0], "http://127.0.0.1:3127");
    expect(input.evaluationCaseId).toBe("SS-EVAL-04");
    expect(input.stagingUrl).toBe("http://127.0.0.1:3127/demo/shop?mode=passing");
    expect(() => selectEvaluationCases(["SS-EVAL-99"])).toThrow("Unknown evaluation case ID");
  });
});
