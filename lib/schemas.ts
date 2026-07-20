import { z } from "zod";

export const demoModeSchema = z.enum(["passing", "defective"]);

export const newTestInputSchema = z
  .object({
    stagingUrl: z.string().url().max(2_048),
    allowedHostname: z.string().trim().min(1).max(253),
    userStory: z.string().trim().min(10).max(8_000),
    acceptanceCriteria: z.string().trim().min(10).max(12_000),
    startingInstructions: z.string().trim().max(4_000).default(""),
  })
  .strict();

export const planStepSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    instruction: z.string().trim().min(1).max(1_000),
    expectedVisibleResult: z.string().trim().min(1).max(1_000),
    checkpoint: z.boolean(),
    evidenceRequirement: z.string().trim().min(1).max(1_000),
    retryLimit: z.number().int().min(0).max(2),
    stopRule: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const testPlanSchema = z
  .object({
    objective: z.string().trim().min(1).max(2_000),
    preconditions: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
    steps: z.array(planStepSchema).min(1).max(20),
  })
  .strict()
  .superRefine((plan, context) => {
    const ids = new Set<string>();
    for (const [index, step] of plan.steps.entries()) {
      if (ids.has(step.id)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "id"],
          message: "Step IDs must be unique",
        });
      }
      ids.add(step.id);
    }
    if (!plan.steps.some((step) => step.checkpoint)) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "At least one step must be an evidence checkpoint",
      });
    }
  });

export const findingSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    severity: z.enum(["critical", "high", "medium", "low"]),
    confidence: z.number().min(0).max(1),
    expectedResult: z.string().trim().min(1).max(2_000),
    actualResult: z.string().trim().min(1).max(2_000),
    reproductionSteps: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
    evidenceReferences: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    lastSuccessfulStep: z.string().trim().min(1).max(500).nullable(),
    suggestedNextTest: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const evaluationSchema = z
  .object({
    criterionId: z.string().trim().min(1).max(80),
    status: z.enum(["pass", "fail", "blocked", "inconclusive"]),
    summary: z.string().trim().min(1).max(2_000),
    finding: findingSchema.nullable(),
  })
  .strict()
  .superRefine((evaluation, context) => {
    if (evaluation.status === "fail" && evaluation.finding === null) {
      context.addIssue({ code: "custom", path: ["finding"], message: "Failed criteria require a finding" });
    }
    if (evaluation.status !== "fail" && evaluation.finding !== null) {
      context.addIssue({ code: "custom", path: ["finding"], message: "Only failed criteria may include a finding" });
    }
  });

export const tokenUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    cachedInputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  })
  .strict();

export const usageByPhaseSchema = z
  .object({
    planner: tokenUsageSchema,
    executor: tokenUsageSchema,
    evaluator: tokenUsageSchema,
  })
  .strict();

export const findingReviewStatusSchema = z.enum(["draft", "approved", "rejected", "exported"]);

export const findingReviewContentSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    severity: z.enum(["critical", "high", "medium", "low"]),
    summary: z.string().trim().min(1).max(2_000),
    expectedResult: z.string().trim().min(1).max(2_000),
    actualResult: z.string().trim().min(1).max(2_000),
    reproductionSteps: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
    suggestedNextTest: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const findingReviewSchema = z
  .object({
    original: findingReviewContentSchema,
    current: findingReviewContentSchema,
    status: findingReviewStatusSchema,
    evidenceReferences: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    lastSuccessfulStep: z.string().trim().min(1).max(500).nullable(),
    generatedConfidence: z.number().min(0).max(1),
    updatedAt: z.string().datetime(),
    approvedAt: z.string().datetime().nullable(),
    exportedAt: z.string().datetime().nullable(),
    githubIssueUrl: z.string().url().nullable(),
    idempotencyKey: z.string().uuid(),
    lastExportError: z.string().max(500).nullable(),
  })
  .strict();

export const saveFindingReviewSchema = z
  .object({
    current: findingReviewContentSchema,
    evidenceReferences: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  })
  .strict();

export const reviewTransitionSchema = z.object({}).strict();

export const githubExportRequestSchema = z
  .object({
    confirmed: z.literal(true),
    previewToken: z.string().min(32).max(128),
  })
  .strict();

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "passed",
  "failed",
  "blocked",
  "inconclusive",
  "cancelled",
  "timed_out",
  "error",
]);

export const actionRecordSchema = z
  .object({
    id: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    stepId: z.string().min(1),
    actionType: z.string().min(1).max(80),
    description: z.string().min(1).max(2_000),
    observation: z.string().max(8_000),
    timestamp: z.string().datetime(),
    screenshotRef: z.string().max(500).nullable(),
  })
  .strict();

export const runRequestSchema = z
  .object({
    input: newTestInputSchema,
    approvedPlan: testPlanSchema,
    planId: z.string().uuid().optional(),
  })
  .strict();

export const runCreationRequestSchema = runRequestSchema.extend({
  planId: z.string().uuid(),
});

export type DemoMode = z.infer<typeof demoModeSchema>;
export type NewTestInput = z.infer<typeof newTestInputSchema>;
export type PlanStep = z.infer<typeof planStepSchema>;
export type TestPlan = z.infer<typeof testPlanSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type UsageByPhase = z.infer<typeof usageByPhaseSchema>;
export type FindingReviewStatus = z.infer<typeof findingReviewStatusSchema>;
export type FindingReviewContent = z.infer<typeof findingReviewContentSchema>;
export type FindingReview = z.infer<typeof findingReviewSchema>;
export type SaveFindingReview = z.infer<typeof saveFindingReviewSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type ActionRecord = z.infer<typeof actionRecordSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;
export type RunCreationRequest = z.infer<typeof runCreationRequestSchema>;
