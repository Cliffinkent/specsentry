import { z } from "zod";
import { evaluationCaseSchema, expectedEvaluationStatusSchema } from "@/lib/evaluation/cases";
import { tokenUsageSchema, usageByPhaseSchema, type TokenUsage, type UsageByPhase } from "@/lib/schemas";

export const actualEvaluationStatusSchema = z.enum([
  "pass",
  "fail",
  "blocked",
  "inconclusive",
  "cancelled",
  "timed_out",
  "error",
  "harness_error",
]);

export const evidenceIntegritySchema = z.object({
  actionMapped: z.boolean(),
  filesPresent: z.boolean(),
  hasAtLeastOneScreenshot: z.boolean(),
  missingActionReferences: z.array(z.string()),
  missingFiles: z.array(z.string()),
}).strict();

export const evaluationCaseResultSchema = z.object({
  caseId: z.string(),
  title: z.string(),
  runId: z.string().uuid().nullable(),
  expectedStatus: expectedEvaluationStatusSchema,
  actualStatus: actualEvaluationStatusSchema,
  expectedSeverity: z.enum(["critical", "high", "medium", "low"]).nullable(),
  actualSeverity: z.enum(["critical", "high", "medium", "low"]).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  durationMs: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  screenshotCount: z.number().int().nonnegative(),
  evidenceReferences: z.array(z.string()),
  evidenceIntegrity: evidenceIntegritySchema,
  usefulFinding: z.boolean(),
  matchesExpectedClassification: z.boolean(),
  unexpectedNavigation: z.array(z.string()),
  errors: z.array(z.string()),
  summary: z.string().nullable(),
  usage: usageByPhaseSchema,
}).strict();

const countMetricSchema = z.object({ value: z.number().int().nonnegative(), target: z.number().int().nonnegative() }).strict();

export const evaluationMetricsSchema = z.object({
  clearFailureDetection: countMetricSchema,
  passingCaseFalseFailures: countMetricSchema,
  blockedClassification: countMetricSchema,
  ambiguousClassification: countMetricSchema,
  evidenceBackedFailedFindings: countMetricSchema,
  unexpectedOffDomainNavigation: countMetricSchema,
  runsWithMissingScreenshots: countMetricSchema,
  totalDurationMs: z.number().int().nonnegative(),
  medianDurationMs: z.number().nonnegative(),
  totalActionCount: z.number().int().nonnegative(),
  medianActionCount: z.number().nonnegative(),
  retries: z.number().int().nonnegative(),
  tokenUsageByPhase: usageByPhaseSchema,
}).strict();

export const evaluationSuiteResultSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  executionMode: z.enum(["live", "mock"]),
  model: z.string().min(1),
  baseUrl: z.string().url(),
  runtimeDataDirectory: z.string().min(1),
  completeSet: z.boolean(),
  cases: z.array(evaluationCaseSchema).length(10),
  results: z.array(evaluationCaseResultSchema),
  metrics: evaluationMetricsSchema,
}).strict().superRefine((suite, context) => {
  const catalogIds = new Set(suite.cases.map(({ id }) => id));
  const resultIds = suite.results.map(({ caseId }) => caseId);
  if (new Set(resultIds).size !== resultIds.length) {
    context.addIssue({ code: "custom", path: ["results"], message: "Evaluation result case IDs must be unique." });
  }
  if (resultIds.some((caseId) => !catalogIds.has(caseId))) {
    context.addIssue({ code: "custom", path: ["results"], message: "Every evaluation result must belong to the persisted case catalog." });
  }
  if (suite.completeSet && (resultIds.length !== catalogIds.size || [...catalogIds].some((caseId) => !resultIds.includes(caseId)))) {
    context.addIssue({ code: "custom", path: ["completeSet"], message: "A complete set must contain one result for every catalog case." });
  }
});

export type ActualEvaluationStatus = z.infer<typeof actualEvaluationStatusSchema>;
export type EvidenceIntegrity = z.infer<typeof evidenceIntegritySchema>;
export type EvaluationCaseResult = z.infer<typeof evaluationCaseResultSchema>;
export type EvaluationMetrics = z.infer<typeof evaluationMetricsSchema>;
export type EvaluationSuiteResult = z.infer<typeof evaluationSuiteResultSchema>;

const zeroUsage = (): TokenUsage => ({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 });

export function zeroUsageByPhase(): UsageByPhase {
  return { planner: zeroUsage(), executor: zeroUsage(), evaluator: zeroUsage() };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function addUsage(left: TokenUsage, right: TokenUsage) {
  return tokenUsageSchema.parse({
    inputTokens: left.inputTokens + right.inputTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  });
}

export function buildEvaluationMetrics(unparsedResults: EvaluationCaseResult[]): EvaluationMetrics {
  const results = evaluationCaseResultSchema.array().parse(unparsedResults);
  const failedCases = results.filter(({ expectedStatus }) => expectedStatus === "fail");
  const passingCases = results.filter(({ expectedStatus }) => expectedStatus === "pass");
  const blockedCases = results.filter(({ expectedStatus }) => expectedStatus === "blocked");
  const ambiguousCases = results.filter(({ expectedStatus }) => expectedStatus === "inconclusive");
  const usage = results.reduce<UsageByPhase>((total, result) => ({
    planner: addUsage(total.planner, result.usage.planner),
    executor: addUsage(total.executor, result.usage.executor),
    evaluator: addUsage(total.evaluator, result.usage.evaluator),
  }), zeroUsageByPhase());

  return evaluationMetricsSchema.parse({
    clearFailureDetection: { value: failedCases.filter(({ actualStatus }) => actualStatus === "fail").length, target: failedCases.length },
    passingCaseFalseFailures: { value: passingCases.filter(({ actualStatus }) => actualStatus === "fail").length, target: 0 },
    blockedClassification: { value: blockedCases.filter(({ actualStatus }) => actualStatus === "blocked").length, target: blockedCases.length },
    ambiguousClassification: { value: ambiguousCases.filter(({ actualStatus }) => actualStatus === "inconclusive").length, target: ambiguousCases.length },
    evidenceBackedFailedFindings: { value: failedCases.filter(({ usefulFinding }) => usefulFinding).length, target: failedCases.length },
    unexpectedOffDomainNavigation: { value: results.reduce((sum, result) => sum + result.unexpectedNavigation.length, 0), target: 0 },
    runsWithMissingScreenshots: {
      value: results.filter(({ evidenceIntegrity }) => !evidenceIntegrity.hasAtLeastOneScreenshot || !evidenceIntegrity.filesPresent).length,
      target: 0,
    },
    totalDurationMs: results.reduce((sum, { durationMs }) => sum + durationMs, 0),
    medianDurationMs: median(results.map(({ durationMs }) => durationMs)),
    totalActionCount: results.reduce((sum, { actionCount }) => sum + actionCount, 0),
    medianActionCount: median(results.map(({ actionCount }) => actionCount)),
    retries: results.reduce((sum, result) => sum + result.retries, 0),
    tokenUsageByPhase: usage,
  });
}

export function expectedClassificationMatches(
  expectedStatus: EvaluationCaseResult["expectedStatus"],
  expectedSeverity: EvaluationCaseResult["expectedSeverity"],
  actualStatus: EvaluationCaseResult["actualStatus"],
  actualSeverity: EvaluationCaseResult["actualSeverity"],
) {
  return expectedStatus === actualStatus && (expectedStatus !== "fail" || expectedSeverity === actualSeverity);
}
