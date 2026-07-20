import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { AIProvider, ComputerAction, EvaluationPackage } from "@/lib/ai/types";
import { evaluateEvidenceWithUsage, getAIProvider } from "@/lib/ai/services";
import { RunBudget, RunLimitError } from "@/lib/executor/limits";
import { playwrightKeypress } from "@/lib/executor/keyboard-policy";
import { registerActiveRun, terminationWasRequested } from "@/lib/executor/runtime-lifecycle";
import { getRepository, screenshotsDirectory, type RunRepository } from "@/lib/repository";
import type { ActionRecord, PlanStep, RunStatus } from "@/lib/schemas";
import { assertPublicDemoInput, assertPublicDemoNavigationUrl, assertPublicDemoNetworkUrl } from "@/lib/security/public-demo";
import { assertApprovedUrl, developmentLocalhostAllowed } from "@/lib/security/url-policy";
import { redactSensitive } from "@/lib/security/redaction";

class RunCancelledError extends Error {
  constructor() {
    super("The run was cancelled.");
    this.name = "RunCancelledError";
  }
}

class BrowserPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserPolicyError";
  }
}

type Screenshot = { reference: string; dataUrl: string };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "step";
}

function actionDescription(action: ComputerAction) {
  switch (action.type) {
    case "click":
      return `Clicked at (${Math.round(action.x)}, ${Math.round(action.y)}).`;
    case "double_click":
      return `Double-clicked at (${Math.round(action.x)}, ${Math.round(action.y)}).`;
    case "drag":
      return `Dragged through ${action.path.length} recorded points.`;
    case "keypress":
      return `Pressed ${action.keys.join(", ")}.`;
    case "move":
      return `Moved the pointer to (${Math.round(action.x)}, ${Math.round(action.y)}).`;
    case "screenshot":
      return "Requested the current browser screenshot.";
    case "scroll":
      return `Scrolled by (${Math.round(action.scrollX)}, ${Math.round(action.scrollY)}).`;
    case "type":
      return "Entered text into the focused field (value redacted).";
    case "wait":
      return "Waited for the interface to settle.";
  }
}

function assertCoordinates(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1_440 || y < 0 || y > 900) {
    throw new BrowserPolicyError("The model requested coordinates outside the approved viewport.");
  }
}

async function executeComputerAction(page: Page, action: ComputerAction) {
  switch (action.type) {
    case "click":
      assertCoordinates(action.x, action.y);
      if (action.button && action.button !== "left") throw new BrowserPolicyError("Only left-click actions are allowed.");
      await page.mouse.click(action.x, action.y, { button: "left" });
      return;
    case "double_click":
      assertCoordinates(action.x, action.y);
      await page.mouse.dblclick(action.x, action.y, { button: "left" });
      return;
    case "drag":
      if (action.path.length < 2 || action.path.length > 30) throw new BrowserPolicyError("The requested drag path is invalid.");
      for (const point of action.path) assertCoordinates(point.x, point.y);
      await page.mouse.move(action.path[0].x, action.path[0].y);
      await page.mouse.down({ button: "left" });
      for (const point of action.path.slice(1)) await page.mouse.move(point.x, point.y);
      await page.mouse.up({ button: "left" });
      return;
    case "keypress":
      try {
        await page.keyboard.press(playwrightKeypress(action.keys));
      } catch (error) {
        throw new BrowserPolicyError(error instanceof Error ? error.message : "The model requested an invalid keypress.");
      }
      return;
    case "move":
      assertCoordinates(action.x, action.y);
      await page.mouse.move(action.x, action.y);
      return;
    case "screenshot":
      return;
    case "scroll":
      assertCoordinates(action.x, action.y);
      await page.mouse.move(action.x, action.y);
      await page.mouse.wheel(action.scrollX, action.scrollY);
      return;
    case "type":
      if (action.text.length > 4_000) throw new BrowserPolicyError("The requested text input is too long.");
      await page.keyboard.type(action.text);
      return;
    case "wait":
      await page.waitForTimeout(500);
      return;
  }
}

async function pageObservation(page: Page) {
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "Page text was unavailable.");
  return redactSensitive(`URL: ${page.url()}\n${body.slice(0, 8_000)}`);
}

function installBrowserPolicy(context: BrowserContext, page: Page, approvedHostname: string) {
  let violation: string | null = null;
  const allowDevelopmentLocalhost = developmentLocalhostAllowed();

  context.on("page", (candidate) => {
    if (candidate !== page) {
      violation = "A pop-up was blocked.";
      void candidate.close();
    }
  });
  page.on("download", (download) => {
    violation = "A download was blocked.";
    void download.cancel();
  });
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    try {
      assertApprovedUrl(frame.url(), approvedHostname, { allowDevelopmentLocalhost });
      assertPublicDemoNavigationUrl(frame.url());
    } catch (error) {
      violation = redactSensitive(error);
    }
  });

  const assertNoViolation = () => {
    if (violation) throw new BrowserPolicyError(violation);
    assertApprovedUrl(page.url(), approvedHostname, { allowDevelopmentLocalhost });
    assertPublicDemoNavigationUrl(page.url());
  };
  return assertNoViolation;
}

async function routeApprovedRequests(context: BrowserContext, approvedHostname: string) {
  const allowDevelopmentLocalhost = developmentLocalhostAllowed();
  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl === "about:blank" || requestUrl.startsWith("data:") || requestUrl.startsWith("blob:")) {
      await route.continue();
      return;
    }
    try {
      assertPublicDemoNetworkUrl(requestUrl);
      assertApprovedUrl(requestUrl, approvedHostname, { allowDevelopmentLocalhost });
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}

function statusFromEvaluation(status: "pass" | "fail" | "blocked" | "inconclusive"): RunStatus {
  return status === "pass" ? "passed" : status === "fail" ? "failed" : status;
}

export async function executeRun(
  runId: string,
  options: { provider?: AIProvider; repository?: RunRepository } = {},
) {
  const repository = options.repository || getRepository();
  const provider = options.provider || getAIProvider();
  const run = repository.getRun(runId);
  if (!run) throw new Error("Run not found.");

  const budget = new RunBudget(Date.now());
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let captureCount = 0;
  let executionCompleted = false;
  const unregisterActiveRun = registerActiveRun(runId, repository, async () => {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  });

  const assertNotCancelled = () => {
    if (repository.isCancellationRequested(runId)) throw new RunCancelledError();
  };

  const capture = async (step: PlanStep, label: string): Promise<Screenshot> => {
    if (!page) throw new Error("The browser page is unavailable.");
    captureCount += 1;
    const filename = `${String(captureCount).padStart(3, "0")}-${slug(step.id)}-${slug(label)}.png`;
    const runDirectory = path.join(screenshotsDirectory(), runId);
    await fs.mkdir(runDirectory, { recursive: true, mode: 0o700 });
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    await fs.writeFile(path.join(runDirectory, filename), buffer, { mode: 0o600 });
    return { reference: `${runId}/${filename}`, dataUrl: `data:image/png;base64,${buffer.toString("base64")}` };
  };

  const record = async (step: PlanStep, actionType: string, description: string, screenshot: Screenshot) => {
    if (!page) throw new Error("The browser page is unavailable.");
    const observation = await pageObservation(page);
    const sequence = repository.getRun(runId)?.actions.length || 0;
    const action: ActionRecord = {
      id: crypto.randomUUID(),
      sequence,
      stepId: step.id,
      actionType,
      description,
      observation,
      timestamp: new Date().toISOString(),
      screenshotRef: screenshot.reference,
    };
    repository.appendAction(runId, action);
    return action;
  };

  try {
    repository.setStatus(runId, "running");
    assertPublicDemoInput(run.request.input);
    browser = await chromium.launch({ headless: true, env: {} });
    context = await browser.newContext({
      viewport: { width: 1_440, height: 900 },
      screen: { width: 1_440, height: 900 },
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    await routeApprovedRequests(context, run.request.input.allowedHostname);
    page = await context.newPage();
    const assertNoBrowserViolation = installBrowserPolicy(context, page, run.request.input.allowedHostname);
    await page.goto(run.request.input.stagingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assertNoBrowserViolation();

    for (const step of run.request.approvedPlan.steps) {
      assertNotCancelled();
      budget.assertTime();
      repository.appendEvent(runId, "run.step", { stepId: step.id, instruction: step.instruction });
      let screenshot = await capture(step, "before");
      let previousResponseId: string | undefined;
      let previousCallId: string | undefined;

      for (let turnNumber = 0; turnNumber < 12; turnNumber += 1) {
        assertNotCancelled();
        budget.assertTime();
        const turn = await provider.computer({
          step,
          approvedHostname: run.request.input.allowedHostname,
          screenshotDataUrl: screenshot.dataUrl,
          previousResponseId,
          previousCallId,
        });
        repository.addUsage(runId, "executor", turn.usage);
        if (turn.pendingSafetyChecks.length) {
          throw new BrowserPolicyError("The model requested an action requiring an unapproved safety acknowledgement.");
        }

        if (turn.actions.length === 0) {
          budget.consumeAction();
          screenshot = await capture(step, "checkpoint");
          const action = await record(step, "observe", "Captured the approved step result and visible browser state.", screenshot);
          repository.appendObservation(runId, `${turn.observation}\n${action.observation}`);
          break;
        }
        if (!turn.callId) throw new Error("The computer tool returned actions without a call identifier.");

        for (const action of turn.actions) {
          assertNotCancelled();
          let lastActionError: unknown;
          let completed = false;
          for (let retry = 0; retry <= step.retryLimit; retry += 1) {
            budget.assertRetry(retry);
            budget.consumeAction();
            try {
              await executeComputerAction(page, action);
              await page.waitForTimeout(120);
              assertNoBrowserViolation();
              completed = true;
              break;
            } catch (error) {
              lastActionError = error;
              const failedScreenshot = await capture(step, `${action.type}-attempt-${retry + 1}-failed`);
              await record(
                step,
                `${action.type}_failed_attempt`,
                `${actionDescription(action)} Attempt ${retry + 1} failed: ${redactSensitive(error)}`,
                failedScreenshot,
              );
              if (error instanceof BrowserPolicyError) throw error;
            }
          }
          if (!completed) throw lastActionError;
          screenshot = await capture(step, action.type);
          await record(step, action.type, actionDescription(action), screenshot);
        }
        previousResponseId = turn.responseId;
        previousCallId = turn.callId;

        if (turnNumber === 11) throw new Error(`Step ${step.id} exceeded the computer-turn limit.`);
      }
    }
    executionCompleted = true;
  } catch (error) {
    const safeError = redactSensitive(error);
    repository.appendError(runId, safeError);
    if (page) {
      const lastStep = run.request.approvedPlan.steps.find((step) => step.id === repository.getRun(runId)?.actions.at(-1)?.stepId) || run.request.approvedPlan.steps[0];
      if (lastStep) {
        try {
          budget.consumeAction();
          const screenshot = await capture(lastStep, "error");
          await record(lastStep, "error_capture", "Captured the partial browser state after an execution error.", screenshot);
        } catch {
          // Preserve the original error even if final evidence capture is impossible.
        }
      }
    }
    if (error instanceof RunCancelledError) repository.setStatus(runId, "cancelled", true);
    else if (error instanceof RunLimitError && error.reason === "timeout") repository.setStatus(runId, "timed_out", true);
    else repository.setStatus(runId, "error", true);
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  if (!executionCompleted || terminationWasRequested()) {
    unregisterActiveRun();
    return repository.getRun(runId);
  }

  try {
    const completedRun = repository.getRun(runId)!;
    const screenshotReferences = [...new Set(completedRun.actions.flatMap((action) => action.screenshotRef ? [action.screenshotRef] : []))];
    const screenshots: EvaluationPackage["screenshots"] = [];
    for (const reference of screenshotReferences) {
      const file = await fs.readFile(path.join(screenshotsDirectory(), reference));
      screenshots.push({ reference, dataUrl: `data:image/png;base64,${file.toString("base64")}` });
    }
    const { evaluation, usage } = await evaluateEvidenceWithUsage(
      {
        input: completedRun.request.input,
        approvedPlan: completedRun.request.approvedPlan,
        actions: completedRun.actions,
        observations: completedRun.observations,
        errors: completedRun.errors,
        screenshots,
      },
      provider,
    );
    if (terminationWasRequested()) return repository.getRun(runId);
    repository.addUsage(runId, "evaluator", usage);
    repository.setEvaluation(runId, evaluation);
    repository.setStatus(runId, statusFromEvaluation(evaluation.status), true);
  } catch (error) {
    repository.appendError(runId, redactSensitive(error));
    repository.setStatus(runId, "error", true);
  } finally {
    unregisterActiveRun();
  }

  return repository.getRun(runId);
}
