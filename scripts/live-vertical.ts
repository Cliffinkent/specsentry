import fs from "node:fs/promises";
import path from "node:path";
import type { RunReport } from "@/lib/report";
import type { DemoMode, NewTestInput, TestPlan } from "@/lib/schemas";

const terminalStatuses = new Set(["passed", "failed", "blocked", "inconclusive", "cancelled", "timed_out", "error"]);
const baseUrl = process.env.LIVE_BASE_URL || "http://127.0.0.1:3100";
const runsPerMode = Number.parseInt(process.env.LIVE_RUNS_PER_MODE || "3", 10);

type LiveResult = {
  mode: DemoMode;
  repetition: number;
  runId: string | null;
  status: string;
  actionCount: number;
  durationMs: number;
  retries: number;
  screenshotCount: number;
  evaluatorConfidence: number | null;
  severity: string | null;
  findingPresent: boolean;
  evidenceReferences: string[];
  errors: string[];
  unexpectedNavigation: string[];
};

function assertConfiguration() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live vertical verification.");
  }
  if (process.env.OPENAI_MOCK === "true") {
    throw new Error("OPENAI_MOCK must not be true for live vertical verification.");
  }
  if (!Number.isInteger(runsPerMode) || runsPerMode < 1 || runsPerMode > 3) {
    throw new Error("LIVE_RUNS_PER_MODE must be an integer from 1 to 3.");
  }
}

function inputFor(mode: DemoMode): NewTestInput {
  const target = new URL(`/demo/shop?mode=${mode}`, baseUrl);
  return {
    stagingUrl: target.toString(),
    allowedHostname: target.hostname,
    userStory: "As a guest shopper, I need to see delivery charges before entering payment details so that I understand the full cost before buying.",
    acceptanceCriteria: "Given that I have an item in my basket, when I reach the order review page, then the delivery charge and total cost must be visible before I continue to payment.",
    startingInstructions: "Use a backpack and stop at order review without continuing to payment.",
  };
}

async function requestJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(pathname, baseUrl), {
    ...init,
    headers: {
      Origin: new URL(baseUrl).origin,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(90_000),
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}: ${body.error || "unknown error"}`);
  return body;
}

function unexpectedNavigation(report: RunReport, approvedHostname: string) {
  const urls = report.actions.flatMap((action) => {
    const match = action.observation.match(/^URL: ([^\n]+)$/m);
    return match ? [match[1]] : [];
  });
  return [...new Set(urls.filter((url) => new URL(url).hostname !== approvedHostname))];
}

function resultFrom(report: RunReport, mode: DemoMode, repetition: number): LiveResult {
  const finding = report.aiAssessment?.finding || null;
  return {
    mode,
    repetition,
    runId: report.id,
    status: report.status,
    actionCount: report.recordedEvidence.actionCount,
    durationMs: report.durationMs,
    retries: report.actions.filter((action) => action.actionType.endsWith("_failed_attempt")).length,
    screenshotCount: report.recordedEvidence.screenshots.length,
    evaluatorConfidence: finding?.confidence ?? null,
    severity: finding?.severity ?? null,
    findingPresent: finding !== null,
    evidenceReferences: finding?.evidenceReferences || [],
    errors: report.errors,
    unexpectedNavigation: unexpectedNavigation(report, inputFor(mode).allowedHostname),
  };
}

async function runOnce(mode: DemoMode, repetition: number) {
  const input = inputFor(mode);
  const { plan, planId } = await requestJson<{ plan: TestPlan; planId: string }>("/api/plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const { id } = await requestJson<{ id: string }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({ input, approvedPlan: plan, planId }),
  });

  for (let poll = 0; poll < 360; poll += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const { report } = await requestJson<{ report: RunReport }>(`/api/runs/${encodeURIComponent(id)}`);
    if (terminalStatuses.has(report.status)) return resultFrom(report, mode, repetition);
  }
  throw new Error(`Run ${id} did not finish within six minutes.`);
}

function meetsExpectation(result: LiveResult) {
  if (result.mode === "defective") {
    return result.status === "failed" && result.severity === "high" && result.findingPresent && result.evidenceReferences.length > 0;
  }
  return result.status === "passed" && !result.findingPresent;
}

async function main() {
  assertConfiguration();
  await requestJson("/api/runs");
  const results: LiveResult[] = [];

  for (const mode of ["defective", "passing"] as const) {
    for (let repetition = 1; repetition <= runsPerMode; repetition += 1) {
      try {
        const result = await runOnce(mode, repetition);
        results.push(result);
        console.log(`LIVE_RESULT=${JSON.stringify(result)}`);
      } catch (error) {
        const result: LiveResult = {
          mode,
          repetition,
          runId: null,
          status: "harness_error",
          actionCount: 0,
          durationMs: 0,
          retries: 0,
          screenshotCount: 0,
          evaluatorConfidence: null,
          severity: null,
          findingPresent: false,
          evidenceReferences: [],
          errors: [error instanceof Error ? error.message : String(error)],
          unexpectedNavigation: [],
        };
        results.push(result);
        console.log(`LIVE_RESULT=${JSON.stringify(result)}`);
      }
    }
  }

  const directory = path.join(process.cwd(), "data");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const resultsPath = path.join(directory, `live-results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(resultsPath, `${JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", baseUrl, results }, null, 2)}\n`, { mode: 0o600 });
  console.log(`LIVE_RESULTS_FILE=${resultsPath}`);

  if (!results.every(meetsExpectation)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`LIVE_ERROR=${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
