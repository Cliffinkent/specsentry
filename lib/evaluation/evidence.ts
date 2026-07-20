import fs from "node:fs/promises";
import path from "node:path";
import type { RunReport } from "@/lib/report";
import type { ActualEvaluationStatus, EvidenceIntegrity } from "@/lib/evaluation/results";

export function normalizeRunStatus(status: RunReport["status"]): ActualEvaluationStatus {
  if (status === "passed") return "pass";
  if (status === "failed") return "fail";
  return status === "queued" || status === "running" ? "harness_error" : status;
}

export function unexpectedOffDomainNavigation(report: RunReport, approvedHostname: string) {
  const urls = report.actions.flatMap((action) => {
    const match = action.observation.match(/^URL: ([^\n]+)$/m);
    return match ? [match[1]] : [];
  });
  return [...new Set(urls.filter((url) => {
    try {
      return new URL(url).hostname !== approvedHostname;
    } catch {
      return true;
    }
  }))];
}

async function fileExistsInside(root: string, reference: string) {
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, reference);
  if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) return false;
  try {
    const file = await fs.stat(candidate);
    return file.isFile() && file.size > 0;
  } catch {
    return false;
  }
}

export async function verifyReportEvidence(report: RunReport, runtimeDataDirectory: string): Promise<EvidenceIntegrity> {
  const actionReferences = new Set(report.actions.flatMap(({ screenshotRef }) => screenshotRef ? [screenshotRef] : []));
  const findingReferences = report.aiAssessment?.finding?.evidenceReferences || [];
  const recordedReferences = report.recordedEvidence.screenshots;
  const missingActionReferences = findingReferences.filter((reference) => !actionReferences.has(reference));
  const screenshotsRoot = path.join(runtimeDataDirectory, "screenshots");
  const missingFiles: string[] = [];
  for (const reference of [...new Set([...recordedReferences, ...findingReferences])]) {
    if (!(await fileExistsInside(screenshotsRoot, reference))) missingFiles.push(reference);
  }
  return {
    actionMapped: missingActionReferences.length === 0,
    filesPresent: missingFiles.length === 0,
    hasAtLeastOneScreenshot: recordedReferences.length > 0,
    missingActionReferences,
    missingFiles,
  };
}
