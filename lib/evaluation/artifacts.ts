import fs from "node:fs/promises";
import path from "node:path";
import { evaluationSuiteResultSchema, type EvaluationSuiteResult } from "@/lib/evaluation/results";

function tableCell(value: unknown) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function seconds(milliseconds: number) {
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function statusWithSeverity(status: string, severity: string | null) {
  return severity ? `${status} / ${severity}` : status;
}

function evidenceReferences(references: string[]) {
  if (references.length === 0) return "—";
  return references.map((reference) => `\`${reference}\``).join("<br>");
}

function portableRuntimeDataDirectory(runtimeDataDirectory: string, workspaceRoot: string) {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedRuntimeDirectory = path.resolve(workspaceRoot, runtimeDataDirectory);
  const relative = path.relative(resolvedRoot, resolvedRuntimeDirectory);
  if (relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join("/");
  }
  return path.basename(resolvedRuntimeDirectory);
}

export function renderEvaluationReport(unparsedSuite: EvaluationSuiteResult) {
  const suite = evaluationSuiteResultSchema.parse(unparsedSuite);
  const resultByCase = new Map(suite.results.map((result) => [result.caseId, result]));
  const mismatches = suite.results.filter((result) => !result.matchesExpectedClassification);
  const metrics = suite.metrics;
  const caseRows = suite.cases.map((entry) => [
    entry.id,
    entry.title,
    entry.fixtureMode,
    statusWithSeverity(entry.expectedStatus, entry.expectedSeverity),
    entry.userStory,
    entry.acceptanceCriterion,
    entry.startingInstructions,
    entry.expectedVisibleEvidence,
    entry.expectedReason,
  ].map(tableCell).join(" | "));
  const resultRows = suite.cases.map((entry) => {
    const result = resultByCase.get(entry.id);
    if (!result) return [entry.id, "not run", "—", "—", "—", "—", "—", "—", "—"].join(" | ");
    return [
      entry.id,
      statusWithSeverity(result.expectedStatus, result.expectedSeverity),
      statusWithSeverity(result.actualStatus, result.actualSeverity),
      result.summary || "—",
      result.runId || "—",
      `${result.actionCount} / ${result.retries}`,
      `${result.screenshotCount} / ${result.evidenceIntegrity.filesPresent ? "files present" : "missing files"}`,
      result.matchesExpectedClassification ? "yes" : "no",
      evidenceReferences(result.evidenceReferences),
    ].map(tableCell).join(" | ");
  });
  const usageRows = suite.results.map((result) => {
    const phase = result.usage;
    return [
      result.caseId,
      phase.planner.totalTokens,
      phase.executor.totalTokens,
      phase.evaluator.totalTokens,
      phase.planner.totalTokens + phase.executor.totalTokens + phase.evaluator.totalTokens,
    ].join(" | ");
  });

  return `# SpecSentry Controlled Fixture Evaluation Report

Generated: ${suite.generatedAt}

## Evaluation method

SpecSentry executed ${suite.results.length} selected case${suite.results.length === 1 ? "" : "s"} from the fixed ten-case catalog through the ${suite.executionMode === "live" ? "real OpenAI planner, computer executor, and evaluator" : "explicit deterministic mock provider"}. Each run used an isolated 1440 × 900 Chromium context, the exact approved localhost hostname, a five-minute and 40-action ceiling, and at most two retries per action. The runner persisted case and run identifiers, normalized results, per-phase token usage, actions, retries, and screenshot references. It then checked every evaluator evidence reference against persisted action records and checked every recorded screenshot file on disk.

- Model: \`${suite.model}\`
- Execution mode: \`${suite.executionMode}\`
- Fixture origin used during the run: \`${suite.baseUrl}\`
- Complete ten-case invocation: ${suite.completeSet ? "yes" : "no"}

**This is a controlled fixture evaluation rather than production-grade benchmarking.** Results describe only these ten deterministic cases and must not be generalized as a statistical accuracy claim.

## Ten-case catalog

| Case | Title | Fixture mode | Expected | User story | Acceptance criterion | Starting instructions | Expected visible evidence | Reason for classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${caseRows.map((row) => `| ${row} |`).join("\n")}

## Expected and actual results

| Case | Expected | Actual | Actual summary | Run ID | Actions / retries | Screenshots / integrity | Match | Finding evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${resultRows.map((row) => `| ${row} |`).join("\n")}

## Metrics

- Clear-failure detection: ${metrics.clearFailureDetection.value}/${metrics.clearFailureDetection.target}
- Passing-case false failures: ${metrics.passingCaseFalseFailures.value}/${suite.cases.filter(({ expectedStatus }) => expectedStatus === "pass").length} (target 0)
- Blocked classification: ${metrics.blockedClassification.value}/${metrics.blockedClassification.target}
- Ambiguous classification: ${metrics.ambiguousClassification.value}/${metrics.ambiguousClassification.target}
- Evidence-backed failed findings: ${metrics.evidenceBackedFailedFindings.value}/${metrics.evidenceBackedFailedFindings.target}
- Unexpected off-domain navigation: ${metrics.unexpectedOffDomainNavigation.value} (target 0)
- Runs with missing screenshots: ${metrics.runsWithMissingScreenshots.value} (target 0)
- Duration: ${seconds(metrics.totalDurationMs)} total, ${seconds(metrics.medianDurationMs)} median
- Actions: ${metrics.totalActionCount} total, ${metrics.medianActionCount} median
- Retries: ${metrics.retries}

## Token usage by phase and case

| Case | Planner | Executor | Evaluator | Total |
| --- | ---: | ---: | ---: | ---: |
${usageRows.map((row) => `| ${row} |`).join("\n")}
| **All cases** | **${metrics.tokenUsageByPhase.planner.totalTokens}** | **${metrics.tokenUsageByPhase.executor.totalTokens}** | **${metrics.tokenUsageByPhase.evaluator.totalTokens}** | **${Object.values(metrics.tokenUsageByPhase).reduce((sum, usage) => sum + usage.totalTokens, 0)}** |

Token counts come from the API response usage fields and are not converted into an estimated cost.

## Failures found and fixes made

${mismatches.length === 0
    ? "The final invocation produced no incorrect classifications. Any earlier diagnostic run and implementation fixes are recorded below when applicable."
    : mismatches.map((result) => `- ${result.caseId}: expected ${result.expectedStatus}${result.expectedSeverity ? `/${result.expectedSeverity}` : ""}, received ${result.actualStatus}${result.actualSeverity ? `/${result.actualSeverity}` : ""}. Diagnose fixture, planning, execution, evidence capture, evaluation, or expected labelling before accepting the result.`).join("\n")}

## Limits of the evaluation

- The catalog is exactly five expected passes, three clear expected failures, one blocked prerequisite, and one deliberately ambiguous criterion.
- All behavior is seeded in Sentry Shop and executed in one Chromium viewport; this does not cover production traffic, browsers, devices, authentication, external dependencies, or adversarial sites.
- Model behavior remains probabilistic even though the fixture and safety limits are deterministic.
- A passing controlled result does not prove the absence of other defects.
- GitHub issue creation was not part of this evaluation. Failed findings remained local unless a person separately reviews, previews, and explicitly confirms an export.
`;
}

function assertSecretFree(serialized: string) {
  const configuredKey = process.env.OPENAI_API_KEY;
  if (configuredKey && serialized.includes(configuredKey)) throw new Error("Evaluation output unexpectedly contained the configured OpenAI API key.");
  if (/\b(?:authorization|cookie|set-cookie)\s*[:=]\s*[^\s,}]+/i.test(serialized)) {
    throw new Error("Evaluation output unexpectedly contained credential-bearing header material.");
  }
}

export async function persistEvaluationArtifacts(
  unparsedSuite: EvaluationSuiteResult,
  options: { workspaceRoot?: string; writeReport?: boolean } = {},
) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const parsedSuite = evaluationSuiteResultSchema.parse(unparsedSuite);
  const suite = evaluationSuiteResultSchema.parse({
    ...parsedSuite,
    runtimeDataDirectory: portableRuntimeDataDirectory(parsedSuite.runtimeDataDirectory, workspaceRoot),
  });
  const serialized = `${JSON.stringify(suite, null, 2)}\n`;
  assertSecretFree(serialized);
  const outputDirectory = path.join(workspaceRoot, "data");
  await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const stamp = suite.generatedAt.replace(/[:.]/g, "-");
  const resultsPath = path.join(outputDirectory, `evaluation-results-${stamp}.json`);
  await fs.writeFile(resultsPath, serialized, { mode: 0o600 });

  let reportPath: string | null = null;
  if (options.writeReport !== false) {
    const rendered = renderEvaluationReport(suite);
    assertSecretFree(rendered);
    reportPath = path.join(workspaceRoot, "docs", "EVALUATION_REPORT.md");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, rendered, { mode: 0o644 });
  }
  return { resultsPath, reportPath };
}
