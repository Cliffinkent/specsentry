import { createGitHubIssueClient, type GitHubIssueClient } from "@/lib/github/client";
import { assertGitHubIssueUrl, githubIssueNumberSchema, readGitHubExportConfig } from "@/lib/github/config";
import { buildGitHubIssuePreview, issueMarker } from "@/lib/github/markdown";
import { getRepository, type RunRepository } from "@/lib/repository";
import { logServerError } from "@/lib/security/redaction";

export function previewGitHubIssue(runId: string, repository: RunRepository = getRepository()) {
  const run = repository.getRun(runId);
  if (!run) throw new Error("Run not found.");
  const config = readGitHubExportConfig();
  const preview = buildGitHubIssuePreview(run, config);
  repository.saveExportPreview(runId, preview.previewHash, preview.previewToken);
  return preview;
}

export async function exportGitHubIssue(
  runId: string,
  previewToken: string,
  options: { repository?: RunRepository; client?: GitHubIssueClient } = {},
) {
  const repository = options.repository || getRepository();
  const run = repository.getRun(runId);
  if (!run) throw new Error("Run not found.");
  const config = readGitHubExportConfig();

  if (run.findingReview?.status === "exported" && run.findingReview.githubIssueUrl) {
    return { githubIssueUrl: run.findingReview.githubIssueUrl, existing: true };
  }
  const preview = buildGitHubIssuePreview(run, config);
  const claim = repository.claimExport(runId, preview.previewHash, previewToken);
  if (claim.kind === "existing" && claim.review.githubIssueUrl) {
    return { githubIssueUrl: claim.review.githubIssueUrl, existing: true };
  }

  const client = options.client || createGitHubIssueClient(config);
  try {
    const marker = issueMarker(claim.review.idempotencyKey);
    const existing = await client.findIssueByMarker(marker);
    const issue = existing || await client.createIssue(preview.title, preview.body);
    githubIssueNumberSchema.parse(issue.number);
    const githubIssueUrl = assertGitHubIssueUrl(issue.htmlUrl, config);
    repository.completeExport(runId, githubIssueUrl);
    return { githubIssueUrl, existing: Boolean(existing) };
  } catch (error) {
    logServerError(`github-export:${runId}`, error);
    repository.failExport(runId, "GitHub did not accept the issue. No credentials or response body were stored; retry from the approved finding.");
    throw new Error("GitHub issue creation failed safely. The finding remains approved and can be retried.", { cause: error });
  }
}
