export function assertSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const visibleHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  const visibleProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
  const expectedOrigin = visibleHost ? `${visibleProtocol}://${visibleHost}` : new URL(request.url).origin;
  if (new URL(origin).origin !== expectedOrigin) {
    throw new Error("Cross-origin requests are not allowed.");
  }
}

export function assertMutationIntent(request: Request, action: string) {
  assertSameOriginRequest(request);
  if (request.headers.get("x-specsentry-action") !== action) {
    throw new Error("The required same-origin action confirmation header is missing.");
  }
}

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new Error("A JSON request body is required.");
  }
  return request.json() as Promise<unknown>;
}
