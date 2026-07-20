import { z } from "zod";
import { assertGitHubIssueUrl, githubIssueNumberSchema, type GitHubExportConfig } from "@/lib/github/config";

const issueResponseSchema = z.object({
  number: githubIssueNumberSchema,
  html_url: z.string().url(),
  body: z.string().nullable().optional(),
  pull_request: z.unknown().optional(),
}).passthrough();

export type CreatedGitHubIssue = { number: number; htmlUrl: string };

export interface GitHubIssueClient {
  findIssueByMarker(marker: string): Promise<CreatedGitHubIssue | null>;
  createIssue(title: string, body: string): Promise<CreatedGitHubIssue>;
}

export class GitHubApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class RestGitHubIssueClient implements GitHubIssueClient {
  constructor(private readonly config: GitHubExportConfig, private readonly request: typeof fetch = fetch) {}

  private async call(pathname: string, init?: RequestInit) {
    const response = await this.request(`https://api.github.com${pathname}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.config.token}`,
        "User-Agent": "SpecSentry",
        "X-GitHub-Api-Version": "2026-03-10",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const requestId = response.headers.get("x-github-request-id");
      throw new GitHubApiError(`GitHub request failed with status ${response.status}${requestId ? ` (request ${requestId})` : ""}.`, response.status);
    }
    return response.json() as Promise<unknown>;
  }

  async findIssueByMarker(marker: string) {
    const raw = await this.call(`/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/issues?state=all&per_page=100&sort=created&direction=desc`);
    const issues = z.array(issueResponseSchema).parse(raw);
    const issue = issues.find((candidate) => !candidate.pull_request && candidate.body?.includes(marker));
    return issue ? { number: issue.number, htmlUrl: assertGitHubIssueUrl(issue.html_url, this.config) } : null;
  }

  async createIssue(title: string, body: string) {
    const raw = await this.call(`/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const issue = issueResponseSchema.parse(raw);
    return { number: issue.number, htmlUrl: assertGitHubIssueUrl(issue.html_url, this.config) };
  }
}

class MockGitHubIssueClient implements GitHubIssueClient {
  constructor(private readonly config: GitHubExportConfig) {}
  async findIssueByMarker() { return null; }
  async createIssue() {
    return { number: 123, htmlUrl: `https://github.com/${this.config.owner}/${this.config.repo}/issues/123` };
  }
}

export function createGitHubIssueClient(config: GitHubExportConfig) {
  if (process.env.GITHUB_MOCK === "true") {
    if (process.env.NODE_ENV === "production") throw new Error("Mock GitHub export is disabled in production.");
    return new MockGitHubIssueClient(config);
  }
  return new RestGitHubIssueClient(config);
}
