import type { RunRecord } from "@/lib/repository";

export type EvidenceTrace = {
  criterion: string;
  checkpoint: { stepId: string; expectedVisibleResult: string } | null;
  actions: Array<{ id: string; sequence: number; description: string }>;
  screenshots: string[];
  judgement: string | null;
};

export function buildRunReport(run: RunRecord) {
  const completed = run.completedAt ? Date.parse(run.completedAt) : Date.now();
  const durationMs = Math.max(0, completed - Date.parse(run.startedAt));
  const checkpoint = [...run.request.approvedPlan.steps].reverse().find((step) => step.checkpoint) || null;
  const tracedActions = checkpoint ? run.actions.filter((action) => action.stepId === checkpoint.id) : run.actions;
  const screenshots = [...new Set(tracedActions.flatMap((action) => action.screenshotRef ? [action.screenshotRef] : []))];
  const evidenceTrace: EvidenceTrace = {
    criterion: run.request.input.acceptanceCriteria,
    checkpoint: checkpoint ? { stepId: checkpoint.id, expectedVisibleResult: checkpoint.expectedVisibleResult } : null,
    actions: tracedActions.map(({ id, sequence, description }) => ({ id, sequence, description })),
    screenshots,
    judgement: run.evaluation?.status || null,
  };

  return {
    id: run.id,
    status: run.status,
    durationMs,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    criterion: run.request.input.acceptanceCriteria,
    approvedPlan: run.request.approvedPlan,
    actions: run.actions,
    observations: run.observations,
    errors: run.errors,
    recordedEvidence: {
      screenshots: [...new Set(run.actions.flatMap((action) => action.screenshotRef ? [action.screenshotRef] : []))],
      actionCount: run.actions.length,
    },
    aiAssessment: run.evaluation,
    aiUsage: run.aiUsage,
    findingReview: run.findingReview,
    evidenceTrace,
  };
}

export type RunReport = ReturnType<typeof buildRunReport>;
