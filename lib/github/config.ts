import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/);
const configuredEnvironmentSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: nameSchema,
  GITHUB_REPO: nameSchema,
  GITHUB_REPOSITORY_ALLOWLIST: z.string().min(1),
  PUBLIC_APP_URL: z.string().url(),
}).strict();

export const githubIssueNumberSchema = z.number().int().positive();

export type GitHubExportConfig = {
  token: string;
  owner: string;
  repo: string;
  repository: string;
  publicAppUrl: URL;
};

export class GitHubConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigurationError";
  }
}

function allowedDevelopmentUrl(url: URL, environment: NodeJS.ProcessEnv) {
  return environment.NODE_ENV !== "production"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

export function readGitHubExportConfig(environment: NodeJS.ProcessEnv = process.env): GitHubExportConfig {
  const parsed = configuredEnvironmentSchema.safeParse({
    GITHUB_TOKEN: environment.GITHUB_TOKEN,
    GITHUB_OWNER: environment.GITHUB_OWNER,
    GITHUB_REPO: environment.GITHUB_REPO,
    GITHUB_REPOSITORY_ALLOWLIST: environment.GITHUB_REPOSITORY_ALLOWLIST,
    PUBLIC_APP_URL: environment.PUBLIC_APP_URL,
  });
  if (!parsed.success) throw new GitHubConfigurationError("GitHub export environment variables are missing or invalid.");

  const publicAppUrl = new URL(parsed.data.PUBLIC_APP_URL);
  if (publicAppUrl.username || publicAppUrl.password || (publicAppUrl.protocol !== "https:" && !allowedDevelopmentUrl(publicAppUrl, environment))) {
    throw new GitHubConfigurationError("PUBLIC_APP_URL must use HTTPS, except for local development.");
  }
  const repository = `${parsed.data.GITHUB_OWNER}/${parsed.data.GITHUB_REPO}`;
  const allowlist = parsed.data.GITHUB_REPOSITORY_ALLOWLIST.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (allowlist.some((entry) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(entry))) {
    throw new GitHubConfigurationError("The GitHub repository allow list is invalid.");
  }
  if (!allowlist.some((entry) => entry.toLowerCase() === repository.toLowerCase())) {
    throw new GitHubConfigurationError("The configured GitHub repository is not allow-listed.");
  }
  return {
    token: parsed.data.GITHUB_TOKEN,
    owner: parsed.data.GITHUB_OWNER,
    repo: parsed.data.GITHUB_REPO,
    repository,
    publicAppUrl,
  };
}

export function assertGitHubIssueUrl(value: unknown, config: GitHubExportConfig) {
  const url = new URL(z.string().url().parse(value));
  const prefix = `/${config.owner}/${config.repo}/issues/`.toLowerCase();
  const number = url.pathname.slice(prefix.length);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.toLowerCase().startsWith(prefix) || !/^\d+$/.test(number)) {
    throw new Error("GitHub returned an invalid issue URL.");
  }
  return url.toString();
}
