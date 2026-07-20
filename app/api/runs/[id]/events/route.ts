import { getRepository } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const terminalStatuses = new Set(["passed", "failed", "blocked", "inconclusive", "cancelled", "timed_out", "error"]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getRepository();
  if (!repository.getRun(id)) return Response.json({ error: "Run not found." }, { status: 404 });

  const url = new URL(request.url);
  let cursor = Number(request.headers.get("last-event-id") || url.searchParams.get("after") || 0);
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let terminalSeen = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = () => {
        try {
          const events = repository.eventsAfter(id, cursor);
          for (const event of events) {
            cursor = event.id;
            controller.enqueue(
              encoder.encode(`id: ${event.id}\ndata: ${JSON.stringify({ type: event.type, payload: event.payload, createdAt: event.createdAt })}\n\n`),
            );
          }
          const run = repository.getRun(id);
          if (run && terminalStatuses.has(run.status)) {
            if (terminalSeen && events.length === 0) {
              if (timer) clearInterval(timer);
              controller.close();
            }
            terminalSeen = true;
          } else if (events.length === 0) {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
        } catch {
          if (timer) clearInterval(timer);
          controller.close();
        }
      };
      send();
      timer = setInterval(send, 400);
      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // The stream may already be closed after a terminal event.
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
