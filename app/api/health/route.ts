import { NextResponse } from "next/server";
import { checkStorageHealth } from "@/lib/health";
import { isPublicDemoMode } from "@/lib/security/public-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkStorageHealth();
    return NextResponse.json(
      { status: "ok", storage: "writable", mode: isPublicDemoMode() ? "public-demo" : "standard" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("[SpecSentry:health] Persistent storage is not writable.");
    return NextResponse.json(
      { status: "error", storage: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
