import { demoModeSchema, type NewTestInput } from "@/lib/schemas";

export class PublicDemoRequestError extends Error {
  constructor(message = "Public demo mode only permits this deployment's Sentry Shop fixture.") {
    super(message);
    this.name = "PublicDemoRequestError";
  }
}

export class PublicDemoConfigurationError extends Error {
  constructor() {
    super("Public demo mode is not configured with a valid HTTPS application URL.");
    this.name = "PublicDemoConfigurationError";
  }
}

export class PublicDemoExportDisabledError extends Error {
  constructor() {
    super("GitHub issue creation is disabled in public demo mode.");
    this.name = "PublicDemoExportDisabledError";
  }
}

export function isPublicDemoMode(environment: NodeJS.ProcessEnv = process.env) {
  return environment.SPECSENTRY_PUBLIC_DEMO === "true";
}

function publicAppUrl(environment: NodeJS.ProcessEnv) {
  let url: URL;
  try {
    url = new URL(environment.PUBLIC_APP_URL || "");
  } catch {
    throw new PublicDemoConfigurationError();
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new PublicDemoConfigurationError();
  }
  return url;
}

function assertFixtureUrl(stagingUrl: URL, deployedUrl: URL) {
  const parameters = [...stagingUrl.searchParams.keys()];
  const mode = stagingUrl.searchParams.get("mode");
  if (
    stagingUrl.origin !== deployedUrl.origin
    || stagingUrl.pathname !== "/demo/shop"
    || stagingUrl.hash
    || parameters.length !== 1
    || parameters[0] !== "mode"
    || !demoModeSchema.safeParse(mode).success
  ) {
    throw new PublicDemoRequestError();
  }
}

export function assertPublicDemoInput(input: NewTestInput, environment: NodeJS.ProcessEnv = process.env) {
  if (!isPublicDemoMode(environment)) return;

  const deployedUrl = publicAppUrl(environment);
  let stagingUrl: URL;
  try {
    stagingUrl = new URL(input.stagingUrl);
  } catch {
    throw new PublicDemoRequestError();
  }

  assertFixtureUrl(stagingUrl, deployedUrl);
  if (input.allowedHostname.toLowerCase() !== deployedUrl.hostname.toLowerCase()) throw new PublicDemoRequestError();
}

export function assertPublicDemoNetworkUrl(rawUrl: string, environment: NodeJS.ProcessEnv = process.env) {
  if (!isPublicDemoMode(environment)) return;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicDemoRequestError();
  }
  if (url.origin !== publicAppUrl(environment).origin) throw new PublicDemoRequestError();
}

export function assertPublicDemoNavigationUrl(rawUrl: string, environment: NodeJS.ProcessEnv = process.env) {
  if (!isPublicDemoMode(environment)) return;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicDemoRequestError();
  }
  assertFixtureUrl(url, publicAppUrl(environment));
}

export function assertGitHubIssueCreationAllowed(environment: NodeJS.ProcessEnv = process.env) {
  if (isPublicDemoMode(environment)) throw new PublicDemoExportDisabledError();
}
