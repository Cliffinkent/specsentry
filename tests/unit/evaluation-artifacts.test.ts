import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { persistEvaluationArtifacts } from "@/lib/evaluation/artifacts";
import { evaluationCases } from "@/lib/evaluation/cases";
import { buildEvaluationMetrics, evaluationSuiteResultSchema, type EvaluationCaseResult } from "@/lib/evaluation/results";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe("evaluation artifact persistence", () => {
  it("writes a secret-free timestamped JSON result and the required report statement", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "specsentry-evaluation-"));
    temporaryDirectories.push(workspaceRoot);
    const entry = evaluationCases[0];
    const result: EvaluationCaseResult = {
      caseId: entry.id,
      title: entry.title,
      runId: crypto.randomUUID(),
      expectedStatus: "pass",
      actualStatus: "pass",
      expectedSeverity: null,
      actualSeverity: null,
      confidence: null,
      durationMs: 1_000,
      actionCount: 1,
      retries: 0,
      screenshotCount: 1,
      evidenceReferences: [],
      evidenceIntegrity: { actionMapped: true, filesPresent: true, hasAtLeastOneScreenshot: true, missingActionReferences: [], missingFiles: [] },
      usefulFinding: false,
      matchesExpectedClassification: true,
      unexpectedNavigation: [],
      errors: [],
      summary: "Passed.",
      usage: {
        planner: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, totalTokens: 2 },
        executor: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, totalTokens: 2 },
        evaluator: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, totalTokens: 2 },
      },
    };
    const suite = evaluationSuiteResultSchema.parse({
      schemaVersion: 1,
      generatedAt: "2026-07-20T15:00:00.000Z",
      executionMode: "mock",
      model: "mock",
      baseUrl: "http://127.0.0.1:3127",
      runtimeDataDirectory: path.join(workspaceRoot, "runtime"),
      completeSet: false,
      cases: evaluationCases,
      results: [result],
      metrics: buildEvaluationMetrics([result]),
    });
    const written = await persistEvaluationArtifacts(suite, { workspaceRoot });
    expect(path.basename(written.resultsPath)).toBe("evaluation-results-2026-07-20T15-00-00-000Z.json");
    const persisted = JSON.parse(await fs.readFile(written.resultsPath, "utf8")) as {
      cases: unknown[];
      results: unknown[];
      runtimeDataDirectory: string;
    };
    expect(persisted.cases).toHaveLength(10);
    expect(persisted.results).toHaveLength(1);
    expect(persisted.runtimeDataDirectory).toBe("runtime");
    const report = await fs.readFile(written.reportPath!, "utf8");
    expect(report).toContain("This is a controlled fixture evaluation rather than production-grade benchmarking.");
    expect(report).not.toContain(workspaceRoot);
    expect(evaluationSuiteResultSchema.safeParse({ ...suite, completeSet: true }).success).toBe(false);
  });
});
