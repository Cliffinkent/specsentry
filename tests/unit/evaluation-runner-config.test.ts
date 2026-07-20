import { describe, expect, it } from "vitest";
import { assertEvaluationConfiguration, parseEvaluationRunnerArgs } from "@/lib/evaluation/runner-config";

describe("evaluation runner configuration", () => {
  it("fails clearly when a live run has no OpenAI key", () => {
    expect(() => assertEvaluationConfiguration({ mock: false }, {})).toThrow("OPENAI_API_KEY is required");
  });

  it("allows missing live credentials only with the explicit mock flag", () => {
    expect(() => assertEvaluationConfiguration({ mock: true }, {})).not.toThrow();
    expect(parseEvaluationRunnerArgs(["--mock", "--case", "SS-EVAL-01,SS-EVAL-02", "--port=3201"])).toEqual({
      mock: true,
      caseIds: ["SS-EVAL-01", "SS-EVAL-02"],
      port: 3201,
      help: false,
    });
  });
});
