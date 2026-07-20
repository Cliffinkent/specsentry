const sensitiveKey = /(api[-_]?key|authorization|cookie|password|secret|token)/gi;
const bearerToken = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const openAiKey = /\bsk-[A-Za-z0-9_-]{10,}\b/g;

export function redactSensitive(value: unknown): string {
  const text = value instanceof Error ? `${value.name}: ${value.message}` : typeof value === "string" ? value : JSON.stringify(value);
  return (text || "Unknown error")
    .replace(bearerToken, "Bearer [REDACTED]")
    .replace(openAiKey, "[REDACTED_OPENAI_KEY]")
    .replace(sensitiveKey, "[REDACTED_FIELD]");
}

export function safeUserError(error: unknown, fallback = "SpecSentry could not complete that request.") {
  if (error instanceof Error && error.name === "UrlPolicyError") {
    return error.message;
  }
  return fallback;
}

export function logServerError(context: string, error: unknown) {
  console.error(`[SpecSentry:${context}] ${redactSensitive(error)}`);
}
