import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  actionRecordSchema,
  evaluationSchema,
  findingReviewContentSchema,
  findingReviewSchema,
  runRequestSchema,
  runStatusSchema,
  tokenUsageSchema,
  usageByPhaseSchema,
  type ActionRecord,
  type Evaluation,
  type FindingReview,
  type FindingReviewContent,
  type NewTestInput,
  type RunRequest,
  type RunStatus,
  type TokenUsage,
  type UsageByPhase,
} from "@/lib/schemas";

const ZERO_USAGE: TokenUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 };
const ZERO_USAGE_BY_PHASE: UsageByPhase = { planner: ZERO_USAGE, executor: ZERO_USAGE, evaluator: ZERO_USAGE };

export type RunRecord = {
  id: string;
  status: RunStatus;
  request: RunRequest;
  actions: ActionRecord[];
  observations: string[];
  evaluation: Evaluation | null;
  aiUsage: UsageByPhase;
  findingReview: FindingReview | null;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
  cancelRequested: boolean;
};

export type PersistedEvent = {
  id: number;
  runId: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

type RunRow = {
  id: string;
  status: string;
  request_json: string;
  actions_json: string;
  observations_json: string;
  evaluation_json: string | null;
  errors_json: string;
  started_at: string;
  completed_at: string | null;
  cancel_requested: number;
  ai_usage_json: string;
  review_json: string | null;
  review_preview_hash: string | null;
  review_preview_token: string | null;
  review_export_in_progress: number;
};

type PlanReceiptRow = {
  id: string;
  input_json: string;
  usage_json: string;
  created_at: string;
  consumed_run_id: string | null;
};

type EventRow = {
  id: number;
  run_id: string;
  type: string;
  payload_json: string;
  created_at: string;
};

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function hydrateRun(row: RunRow): RunRecord {
  return {
    id: row.id,
    status: runStatusSchema.parse(row.status),
    request: runRequestSchema.parse(parseJson(row.request_json)),
    actions: actionRecordSchema.array().parse(parseJson(row.actions_json)),
    observations: parseJson<string[]>(row.observations_json),
    evaluation: row.evaluation_json ? evaluationSchema.parse(parseJson(row.evaluation_json)) : null,
    aiUsage: usageByPhaseSchema.parse(parseJson(row.ai_usage_json)),
    findingReview: row.review_json ? findingReviewSchema.parse(parseJson(row.review_json)) : null,
    errors: parseJson<string[]>(row.errors_json),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelRequested: row.cancel_requested === 1,
  };
}

export function dataDirectory() {
  const configured = process.env.SPECSENTRY_DATA_DIR;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ configured)
    : path.join(process.cwd(), "data");
}

export function screenshotsDirectory() {
  return path.join(dataDirectory(), "screenshots");
}

export class RunRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath = path.join(dataDirectory(), "specsentry.sqlite")) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
    fs.mkdirSync(screenshotsDirectory(), { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        request_json TEXT NOT NULL,
        actions_json TEXT NOT NULL,
        observations_json TEXT NOT NULL,
        evaluation_json TEXT,
        errors_json TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS run_events_run_id_id ON run_events(run_id, id);
      CREATE TABLE IF NOT EXISTS plan_receipts (
        id TEXT PRIMARY KEY,
        input_json TEXT NOT NULL,
        usage_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        consumed_run_id TEXT
      );
    `);
    this.migrateRuns();
  }

  private migrateRuns() {
    const columns = new Set(
      (this.database.prepare("PRAGMA table_info(runs)").all() as unknown as Array<{ name: string }>).map(({ name }) => name),
    );
    const migrations = [
      ["ai_usage_json", `ai_usage_json TEXT NOT NULL DEFAULT '${JSON.stringify(ZERO_USAGE_BY_PHASE)}'`],
      ["review_json", "review_json TEXT"],
      ["review_preview_hash", "review_preview_hash TEXT"],
      ["review_preview_token", "review_preview_token TEXT"],
      ["review_export_in_progress", "review_export_in_progress INTEGER NOT NULL DEFAULT 0"],
    ] as const;
    for (const [name, definition] of migrations) {
      if (!columns.has(name)) this.database.exec(`ALTER TABLE runs ADD COLUMN ${definition}`);
    }
  }

  createPlanReceipt(input: NewTestInput, usage: TokenUsage) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    this.database.prepare("INSERT INTO plan_receipts (id, input_json, usage_json, created_at, consumed_run_id) VALUES (?, ?, ?, ?, NULL)")
      .run(id, JSON.stringify(input), JSON.stringify(tokenUsageSchema.parse(usage)), createdAt);
    return id;
  }

  getPlanReceipt(id: string) {
    const row = this.database.prepare("SELECT * FROM plan_receipts WHERE id = ?").get(id) as PlanReceiptRow | undefined;
    return row ? {
      id: row.id,
      input: parseJson<NewTestInput>(row.input_json),
      usage: tokenUsageSchema.parse(parseJson(row.usage_json)),
      createdAt: row.created_at,
      consumedRunId: row.consumed_run_id,
    } : null;
  }

  createRun(id: string, request: RunRequest, plannerUsage: TokenUsage = ZERO_USAGE) {
    const parsed = runRequestSchema.parse(request);
    if (parsed.planId) {
      const receipt = this.getPlanReceipt(parsed.planId);
      if (!receipt || receipt.consumedRunId || JSON.stringify(receipt.input) !== JSON.stringify(parsed.input)) {
        throw new Error("The planner receipt is missing, used, or does not match this run.");
      }
      plannerUsage = receipt.usage;
    }
    const startedAt = new Date().toISOString();
    const usage = usageByPhaseSchema.parse({ ...ZERO_USAGE_BY_PHASE, planner: plannerUsage });
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`INSERT INTO runs (id, status, request_json, actions_json, observations_json, evaluation_json, errors_json, started_at, completed_at, cancel_requested, ai_usage_json)
          VALUES (?, 'queued', ?, '[]', '[]', NULL, '[]', ?, NULL, 0, ?)`)
        .run(id, JSON.stringify(parsed), startedAt, JSON.stringify(usage));
      if (parsed.planId) {
        const claimed = this.database.prepare("UPDATE plan_receipts SET consumed_run_id = ? WHERE id = ? AND consumed_run_id IS NULL").run(id, parsed.planId);
        if (Number(claimed.changes) !== 1) throw new Error("The planner receipt has already been used.");
      }
      this.appendEvent(id, "run.queued", { status: "queued" });
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return this.getRun(id)!;
  }

  getRun(id: string) {
    const row = this.database.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
    return row ? hydrateRun(row) : null;
  }

  listRecentRuns(limit = 12) {
    const rows = this.database.prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?").all(limit) as unknown as RunRow[];
    return rows.map(hydrateRun);
  }

  setStatus(id: string, status: RunStatus, completed = false) {
    const parsed = runStatusSchema.parse(status);
    const completedAt = completed ? new Date().toISOString() : null;
    this.database.prepare("UPDATE runs SET status = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?").run(parsed, completedAt, id);
    this.appendEvent(id, "run.status", { status: parsed, completedAt });
  }

  appendAction(id: string, action: ActionRecord) {
    const run = this.requireRun(id);
    const actions = [...run.actions, actionRecordSchema.parse(action)];
    this.database.prepare("UPDATE runs SET actions_json = ? WHERE id = ?").run(JSON.stringify(actions), id);
    this.appendEvent(id, "run.action", action);
  }

  appendObservation(id: string, observation: string) {
    const run = this.requireRun(id);
    const observations = [...run.observations, observation];
    this.database.prepare("UPDATE runs SET observations_json = ? WHERE id = ?").run(JSON.stringify(observations), id);
    this.appendEvent(id, "run.observation", { observation });
  }

  appendError(id: string, error: string) {
    const run = this.requireRun(id);
    const errors = [...run.errors, error];
    this.database.prepare("UPDATE runs SET errors_json = ? WHERE id = ?").run(JSON.stringify(errors), id);
    this.appendEvent(id, "run.error", { error });
  }

  setEvaluation(id: string, evaluation: Evaluation) {
    const parsed = evaluationSchema.parse(evaluation);
    let review: FindingReview | null = null;
    if (parsed.status === "fail" && parsed.finding) {
      const content = findingReviewContentSchema.parse({
        title: parsed.finding.title,
        severity: parsed.finding.severity,
        summary: parsed.summary,
        expectedResult: parsed.finding.expectedResult,
        actualResult: parsed.finding.actualResult,
        reproductionSteps: parsed.finding.reproductionSteps,
        suggestedNextTest: parsed.finding.suggestedNextTest,
      });
      review = findingReviewSchema.parse({
        original: content,
        current: content,
        status: "draft",
        evidenceReferences: parsed.finding.evidenceReferences,
        lastSuccessfulStep: parsed.finding.lastSuccessfulStep,
        generatedConfidence: parsed.finding.confidence,
        updatedAt: new Date().toISOString(),
        approvedAt: null,
        exportedAt: null,
        githubIssueUrl: null,
        idempotencyKey: crypto.randomUUID(),
        lastExportError: null,
      });
    }
    this.database.prepare("UPDATE runs SET evaluation_json = ?, review_json = COALESCE(review_json, ?) WHERE id = ?")
      .run(JSON.stringify(parsed), review ? JSON.stringify(review) : null, id);
    this.appendEvent(id, "run.evaluation", parsed);
  }

  addUsage(id: string, phase: keyof UsageByPhase, usage: TokenUsage) {
    const run = this.requireRun(id);
    const next = { ...run.aiUsage, [phase]: {
      inputTokens: run.aiUsage[phase].inputTokens + usage.inputTokens,
      cachedInputTokens: run.aiUsage[phase].cachedInputTokens + usage.cachedInputTokens,
      outputTokens: run.aiUsage[phase].outputTokens + usage.outputTokens,
      totalTokens: run.aiUsage[phase].totalTokens + usage.totalTokens,
    } };
    this.database.prepare("UPDATE runs SET ai_usage_json = ? WHERE id = ?").run(JSON.stringify(usageByPhaseSchema.parse(next)), id);
  }

  saveFindingReview(id: string, current: FindingReviewContent, evidenceReferences: string[]) {
    const run = this.requireRun(id);
    const review = this.requireReview(run);
    if (review.status !== "draft") throw new Error("Only a draft finding can be edited.");
    const recorded = new Set(run.actions.flatMap((action) => action.screenshotRef ? [action.screenshotRef] : []));
    if (JSON.stringify(evidenceReferences) !== JSON.stringify(review.evidenceReferences) || evidenceReferences.some((reference) => !recorded.has(reference))) {
      throw new Error("Evidence references are read-only and must belong to this run.");
    }
    return this.writeReview(id, { ...review, current: findingReviewContentSchema.parse(current), updatedAt: new Date().toISOString(), lastExportError: null });
  }

  transitionFindingReview(id: string, transition: "approve" | "reject" | "reopen") {
    const review = this.requireReview(this.requireRun(id));
    const now = new Date().toISOString();
    if (transition === "approve") {
      if (review.status !== "draft") throw new Error("Only a draft finding can be approved.");
      return this.writeReview(id, { ...review, status: "approved", approvedAt: now, updatedAt: now, lastExportError: null });
    }
    if (transition === "reject") {
      if (review.status !== "draft" && review.status !== "approved") throw new Error("Only a draft or approved finding can be rejected.");
      return this.writeReview(id, { ...review, status: "rejected", updatedAt: now, lastExportError: null });
    }
    if (review.status !== "rejected") throw new Error("Only a rejected finding can be reopened.");
    return this.writeReview(id, { ...review, status: "draft", approvedAt: null, updatedAt: now, lastExportError: null });
  }

  saveExportPreview(id: string, previewHash: string, previewToken: string) {
    const review = this.requireReview(this.requireRun(id));
    if (review.status !== "approved") throw new Error("Only an approved finding can be previewed.");
    this.database.prepare("UPDATE runs SET review_preview_hash = ?, review_preview_token = ? WHERE id = ?")
      .run(previewHash, previewToken, id);
  }

  claimExport(id: string, previewHash: string, previewToken: string) {
    const run = this.requireRun(id);
    const review = this.requireReview(run);
    if (review.status === "exported" && review.githubIssueUrl) return { kind: "existing" as const, review };
    if (review.status !== "approved") throw new Error("Only an approved finding can be exported.");
    const state = this.database.prepare("SELECT review_preview_hash, review_preview_token, review_export_in_progress FROM runs WHERE id = ?").get(id) as {
      review_preview_hash: string | null; review_preview_token: string | null; review_export_in_progress: number;
    };
    if (state.review_preview_hash !== previewHash || state.review_preview_token !== previewToken) {
      throw new Error("The export preview is missing or stale. Generate it again.");
    }
    if (state.review_export_in_progress === 1) throw new Error("An export is already in progress.");
    const claimed = this.database.prepare("UPDATE runs SET review_export_in_progress = 1 WHERE id = ? AND review_export_in_progress = 0").run(id);
    if (Number(claimed.changes) !== 1) throw new Error("An export is already in progress.");
    return { kind: "claimed" as const, review };
  }

  completeExport(id: string, githubIssueUrl: string) {
    const review = this.requireReview(this.requireRun(id));
    const now = new Date().toISOString();
    const updated = this.writeReview(id, { ...review, status: "exported", githubIssueUrl, exportedAt: now, updatedAt: now, lastExportError: null });
    this.database.prepare("UPDATE runs SET review_export_in_progress = 0 WHERE id = ?").run(id);
    return updated;
  }

  failExport(id: string, safeError: string) {
    const review = this.requireReview(this.requireRun(id));
    const updated = this.writeReview(id, { ...review, status: "approved", updatedAt: new Date().toISOString(), lastExportError: safeError });
    this.database.prepare("UPDATE runs SET review_export_in_progress = 0 WHERE id = ?").run(id);
    return updated;
  }

  requestCancellation(id: string) {
    this.requireRun(id);
    this.database.prepare("UPDATE runs SET cancel_requested = 1 WHERE id = ?").run(id);
    this.appendEvent(id, "run.cancellation_requested", {});
  }

  isCancellationRequested(id: string) {
    const row = this.database.prepare("SELECT cancel_requested FROM runs WHERE id = ?").get(id) as { cancel_requested: number } | undefined;
    return row?.cancel_requested === 1;
  }

  appendEvent(runId: string, type: string, payload: unknown) {
    const createdAt = new Date().toISOString();
    const result = this.database.prepare("INSERT INTO run_events (run_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)").run(runId, type, JSON.stringify(payload), createdAt);
    return Number(result.lastInsertRowid);
  }

  eventsAfter(runId: string, afterId = 0) {
    const rows = this.database.prepare("SELECT * FROM run_events WHERE run_id = ? AND id > ? ORDER BY id ASC").all(runId, afterId) as unknown as EventRow[];
    return rows.map<PersistedEvent>((row) => ({
      id: row.id,
      runId: row.run_id,
      type: row.type,
      payload: parseJson(row.payload_json),
      createdAt: row.created_at,
    }));
  }

  close() {
    this.database.close();
  }

  private requireRun(id: string) {
    const run = this.getRun(id);
    if (!run) throw new Error(`Run ${id} was not found`);
    return run;
  }

  private requireReview(run: RunRecord) {
    if (run.status !== "failed" || !run.evaluation?.finding || !run.findingReview) {
      throw new Error("A failed finding is required for review.");
    }
    return run.findingReview;
  }

  private writeReview(id: string, review: FindingReview) {
    const parsed = findingReviewSchema.parse(review);
    this.database.prepare("UPDATE runs SET review_json = ? WHERE id = ?").run(JSON.stringify(parsed), id);
    this.appendEvent(id, "run.review", { status: parsed.status, updatedAt: parsed.updatedAt });
    return parsed;
  }
}

const globalRepository = globalThis as typeof globalThis & { specsentryRepository?: RunRepository };

export function getRepository() {
  if (!globalRepository.specsentryRepository) {
    globalRepository.specsentryRepository = new RunRepository();
  }
  return globalRepository.specsentryRepository;
}
