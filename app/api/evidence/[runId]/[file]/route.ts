import fs from "node:fs/promises";
import path from "node:path";
import { screenshotsDirectory } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string; file: string }> }) {
  const { runId, file } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(runId) || !/^\d{3}-[a-z0-9_-]+\.png$/i.test(file)) {
    return Response.json({ error: "Evidence not found." }, { status: 404 });
  }
  const root = screenshotsDirectory();
  const requested = path.resolve(root, runId, file);
  const expectedParent = path.resolve(root, runId);
  if (path.dirname(requested) !== expectedParent) return Response.json({ error: "Evidence not found." }, { status: 404 });

  try {
    const image = await fs.readFile(requested);
    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Evidence not found." }, { status: 404 });
  }
}
