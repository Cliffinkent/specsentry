import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { promises as dns } from "node:dns";

export class UrlPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlPolicyError";
  }
}

export type UrlPolicyOptions = {
  allowDevelopmentLocalhost?: boolean;
};

function normalizedHostname(value: string) {
  const unwrapped = value.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isIP(unwrapped)) return unwrapped;
  const ascii = domainToASCII(unwrapped);
  if (!ascii || ascii.includes(":") && isIP(ascii) !== 6) {
    throw new UrlPolicyError("The approved hostname is invalid.");
  }
  return ascii;
}

export function isLocalhost(hostname: string) {
  const host = normalizedHostname(hostname);
  return host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1";
}

export function isPrivateAddress(hostname: string) {
  const host = normalizedHostname(hostname);
  const ipVersion = isIP(host);

  if (ipVersion === 4) {
    const [a, b] = host.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    const compact = host.toLowerCase();
    return compact === "::" || compact === "::1" || compact.startsWith("fc") || compact.startsWith("fd") || /^fe[89ab]/.test(compact);
  }

  return host.endsWith(".local") || host.endsWith(".internal");
}

export function assertApprovedUrl(rawUrl: string, rawApprovedHostname: string, options: UrlPolicyOptions = {}) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlPolicyError("Enter a valid staging URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlPolicyError("Only HTTP and HTTPS staging URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new UrlPolicyError("Credentials are not allowed in the staging URL.");
  }

  const hostname = normalizedHostname(url.hostname);
  const approvedHostname = normalizedHostname(rawApprovedHostname);
  if (hostname !== approvedHostname) {
    throw new UrlPolicyError("The staging URL hostname must exactly match the approved hostname.");
  }

  if (isLocalhost(hostname)) {
    if (!options.allowDevelopmentLocalhost) {
      throw new UrlPolicyError("Localhost targets require the explicit development-only setting.");
    }
    return url;
  }

  if (isPrivateAddress(hostname)) {
    throw new UrlPolicyError("Private-network staging targets are not allowed.");
  }

  return url;
}

export async function assertSafeNetworkTarget(rawUrl: string, rawApprovedHostname: string, options: UrlPolicyOptions = {}) {
  const url = assertApprovedUrl(rawUrl, rawApprovedHostname, options);
  if (isLocalhost(url.hostname) && options.allowDevelopmentLocalhost) {
    return url;
  }
  if (isIP(normalizedHostname(url.hostname))) {
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new UrlPolicyError("The staging hostname could not be resolved.");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UrlPolicyError("The staging hostname resolves to a private-network target.");
  }
  return url;
}

export function developmentLocalhostAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCALHOST === "true";
}
