import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { RunReport } from "@/lib/report";
import { evaluationCases, inputForEvaluationCase, selectEvaluationCases, type EvaluationCase } from "@/lib/evaluation/cases";
import { persistEvaluationArtifacts } from "@/lib/evaluation/artifacts";
import { normalizeRunStatus, unexpectedOffDomainNavigation, verifyReportEvidence } from "@/lib/evaluation/evidence";
import { managedEvaluationConfig } from "@/lib/evaluation/managed-config";
import { restoreManagedFile, snapshotManagedFile, type ManagedFileSnapshot } from "@/lib/evaluation/managed-file";
import { assertEvaluationConfiguration, evaluationHelp, parseEvaluationRunnerArgs } from "@/lib/evaluation/runner-config";
import {
  buildEvaluationMetrics,
  evaluationCaseResultSchema,
  evaluationSuiteResultSchema,
  expectedClassificationMatches,
  zeroUsageByPhase,
  type EvaluationCaseResult,
} from "@/lib/evaluation/results";
import { redactSensitive } from "@/lib/security/redaction";
import type { TestPlan } from "@/lib/schemas";

const terminalStatuses = new Set(["passed", "failed", "blocked", "inconclusive", "cancelled", "timed_out", "error"]);

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("OPENAI_API_KEY is required for the live ten-case evaluation.")) return message;
  return redactSensitive(message);
}

class ManagedEvaluationServer {
  private child: ChildProcess | null = null;
  private nextEnvSnapshot: ManagedFileSnapshot | null = null;
  private readonly recentOutput: string[] = [];

  constructor(
    private readonly port: number,
    private readonly runtimeDataDirectory: string,
    private readonly mock: boolean,
  ) {}

  get baseUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  private captureOutput(chunk: Buffer) {
    const configuredKey = process.env.OPENAI_API_KEY;
    const cleaned = redactSensitive(chunk.toString()).replaceAll(configuredKey || "__no_configured_key__", "[REDACTED]");
    this.recentOutput.push(...cleaned.split("\n").filter(Boolean));
    if (this.recentOutput.length > 80) this.recentOutput.splice(0, this.recentOutput.length - 80);
  }

  async start() {
    this.nextEnvSnapshot = await snapshotManagedFile(path.join(process.cwd(), "next-env.d.ts"));
    await fs.mkdir(this.runtimeDataDirectory, { recursive: true, mode: 0o700 });
    const managedConfig = managedEvaluationConfig(process.cwd(), this.runtimeDataDirectory);
    await fs.writeFile(managedConfig.tsconfigAbsolutePath, `${JSON.stringify(managedConfig.tsconfig, null, 2)}\n`, { mode: 0o600 });
    const environment = {
      ...process.env,
      OPENAI_MOCK: this.mock ? "true" : "false",
      ALLOW_LOCALHOST: "true",
      SPECSENTRY_DATA_DIR: this.runtimeDataDirectory,
      SPECSENTRY_NEXT_DIST_DIR: managedConfig.distDirectory,
      SPECSENTRY_TSCONFIG_PATH: managedConfig.tsconfigPath,
      GITHUB_MOCK: "true",
      GITHUB_TOKEN: "",
      GITHUB_OWNER: "",
      GITHUB_REPO: "",
      GITHUB_REPOSITORY_ALLOWLIST: "",
      PUBLIC_APP_URL: this.baseUrl,
    };
    const child = spawn(
      process.execPath,
      [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(this.port)],
      { cwd: process.cwd(), env: environment, stdio: ["ignore", "pipe", "pipe"] },
    );
    this.child = child;
    child.stdout?.on("data", (chunk: Buffer) => this.captureOutput(chunk));
    child.stderr?.on("data", (chunk: Buffer) => this.captureOutput(chunk));

    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(`Evaluation server exited before it was ready. ${this.recentOutput.slice(-8).join(" ")}`);
      }
      try {
        const response = await fetch(new URL("/api/runs", this.baseUrl), { signal: AbortSignal.timeout(1_000) });
        if (response.ok) return;
      } catch {
        // The server is still starting.
      }
      await delay(500);
    }
    throw new Error(`Evaluation server was not ready within two minutes. ${this.recentOutput.slice(-8).join(" ")}`);
  }

  async stop() {
    const child = this.child;
    this.child = null;
    try {
      if (child && child.exitCode === null) {
        const exited = new Promise<boolean>((resolve) => {
          if (child.exitCode !== null) resolve(true);
          else child.once("exit", () => resolve(true));
        });
        child.kill("SIGTERM");
        const graceful = await Promise.race([exited, delay(8_000).then(() => false)]);
        if (!graceful && child.exitCode === null) {
          child.kill("SIGKILL");
          await Promise.race([exited, delay(2_000)]);
        }
      }
    } finally {
      if (this.nextEnvSnapshot) await restoreManagedFile(this.nextEnvSnapshot);
      this.nextEnvSnapshot = null;
    }
  }
}

async function requestJson<T>(baseUrl: string, pathname: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(new URL(pathname, baseUrl), {
      ...init,
      headers: {
        Origin: new URL(baseUrl).origin,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(120_000),
    });
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Math.max(1, Number.parseInt(response.headers.get("retry-after") || "1", 10));
      await delay(Math.min(retryAfter, 60) * 1_000);
      continue;
    }
    const text = await response.text();
    let body: T & { error?: string };
    try {
      body = JSON.parse(text) as T & { error?: string };
    } catch {
      throw new Error(`${pathname} returned ${response.status} with a non-JSON response.`);
    }
    if (!response.ok) throw new Error(`${pathname} returned ${response.status}: ${body.error || "unknown error"}`);
    return body;
  }
  throw new Error(`${pathname} remained rate limited after controlled retries.`);
}

async function runCase(baseUrl: string, runtimeDataDirectory: string, entry: EvaluationCase): Promise<EvaluationCaseResult> {
  const input = inputForEvaluationCase(entry, baseUrl);
  let runId: string | null = null;
  try {
    const { plan, planId } = await requestJson<{ plan: TestPlan; planId: string }>(baseUrl, "/api/plans", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const created = await requestJson<{ id: string }>(baseUrl, "/api/runs", {
      method: "POST",
      body: JSON.stringify({ input, approvedPlan: plan, planId }),
    });
    runId = created.id;

    let report: RunReport | null = null;
    for (let poll = 0; poll < 720; poll += 1) {
      await delay(500);
      const response = await requestJson<{ report: RunReport }>(baseUrl, `/api/runs/${encodeURIComponent(created.id)}`);
      if (terminalStatuses.has(response.report.status)) {
        report = response.report;
        break;
      }
    }
    if (!report) throw new Error(`Run ${created.id} did not finish within six minutes.`);

    const actualStatus = normalizeRunStatus(report.status);
    const finding = report.aiAssessment?.finding || null;
    const evidenceIntegrity = await verifyReportEvidence(report, runtimeDataDirectory);
    const actualSeverity = finding?.severity || null;
    const usefulFinding = actualStatus === "fail"
      && Boolean(finding?.title && finding.expectedResult && finding.actualResult && finding.reproductionSteps.length > 0)
      && Boolean(finding?.evidenceReferences.length)
      && evidenceIntegrity.actionMapped
      && evidenceIntegrity.filesPresent;
    return evaluationCaseResultSchema.parse({
      caseId: entry.id,
      title: entry.title,
      runId: report.id,
      expectedStatus: entry.expectedStatus,
      actualStatus,
      expectedSeverity: entry.expectedSeverity,
      actualSeverity,
      confidence: finding?.confidence ?? null,
      durationMs: report.durationMs,
      actionCount: report.recordedEvidence.actionCount,
      retries: report.actions.filter(({ actionType }) => actionType.endsWith("_failed_attempt")).length,
      screenshotCount: report.recordedEvidence.screenshots.length,
      evidenceReferences: finding?.evidenceReferences || [],
      evidenceIntegrity,
      usefulFinding,
      matchesExpectedClassification: expectedClassificationMatches(entry.expectedStatus, entry.expectedSeverity, actualStatus, actualSeverity),
      unexpectedNavigation: unexpectedOffDomainNavigation(report, input.allowedHostname),
      errors: report.errors.map((error) => redactSensitive(error)),
      summary: report.aiAssessment?.summary || null,
      usage: report.aiUsage,
    });
  } catch (error) {
    return evaluationCaseResultSchema.parse({
      caseId: entry.id,
      title: entry.title,
      runId,
      expectedStatus: entry.expectedStatus,
      actualStatus: "harness_error",
      expectedSeverity: entry.expectedSeverity,
      actualSeverity: null,
      confidence: null,
      durationMs: 0,
      actionCount: 0,
      retries: 0,
      screenshotCount: 0,
      evidenceReferences: [],
      evidenceIntegrity: {
        actionMapped: false,
        filesPresent: false,
        hasAtLeastOneScreenshot: false,
        missingActionReferences: [],
        missingFiles: [],
      },
      usefulFinding: false,
      matchesExpectedClassification: false,
      unexpectedNavigation: [],
      errors: [safeMessage(error)],
      summary: null,
      usage: zeroUsageByPhase(),
    });
  }
}

async function main() {
  const config = parseEvaluationRunnerArgs(process.argv.slice(2));
  if (config.help) {
    console.log(evaluationHelp);
    return;
  }
  assertEvaluationConfiguration(config);
  const selectedCases = selectEvaluationCases(config.caseIds);
  const runStamp = timestampSlug();
  const runtimeDataDirectory = path.join(process.cwd(), "data", `evaluation-runtime-${runStamp}`);
  const server = new ManagedEvaluationServer(config.port, runtimeDataDirectory, config.mock);
  const results: EvaluationCaseResult[] = [];

  try {
    await server.start();
    for (const entry of selectedCases) {
      console.log(`EVALUATION_START=${entry.id}`);
      const result = await runCase(server.baseUrl, runtimeDataDirectory, entry);
      results.push(result);
      console.log(`EVALUATION_RESULT=${JSON.stringify({
        caseId: result.caseId,
        runId: result.runId,
        expected: statusWithOptionalSeverity(result.expectedStatus, result.expectedSeverity),
        actual: statusWithOptionalSeverity(result.actualStatus, result.actualSeverity),
        match: result.matchesExpectedClassification,
        durationMs: result.durationMs,
        actions: result.actionCount,
        retries: result.retries,
        screenshots: result.screenshotCount,
      })}`);
    }
  } finally {
    await server.stop();
  }

  const completeSet = selectedCases.length === evaluationCases.length;
  const suite = evaluationSuiteResultSchema.parse({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    executionMode: config.mock ? "mock" : "live",
    model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
    baseUrl: server.baseUrl,
    runtimeDataDirectory,
    completeSet,
    cases: evaluationCases,
    results,
    metrics: buildEvaluationMetrics(results),
  });
  const artifacts = await persistEvaluationArtifacts(suite, { writeReport: completeSet });
  console.log(`EVALUATION_RESULTS_FILE=${artifacts.resultsPath}`);
  if (artifacts.reportPath) console.log(`EVALUATION_REPORT_FILE=${artifacts.reportPath}`);

  const safetyTargetsMet = suite.metrics.unexpectedOffDomainNavigation.value === 0
    && suite.metrics.runsWithMissingScreenshots.value === 0;
  const findingsMet = suite.results.filter(({ expectedStatus }) => expectedStatus === "fail").every(({ usefulFinding }) => usefulFinding);
  if (!suite.results.every(({ matchesExpectedClassification }) => matchesExpectedClassification) || !safetyTargetsMet || !findingsMet) {
    process.exitCode = 1;
  }
}

function statusWithOptionalSeverity(status: string, severity: string | null) {
  return severity ? `${status}/${severity}` : status;
}

main().catch((error) => {
  console.error(`EVALUATION_ERROR=${safeMessage(error)}`);
  process.exitCode = 1;
});
