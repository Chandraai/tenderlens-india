import { NextResponse } from "next/server";
import { syncUpPortal } from "@/lib/integrations/up-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sync = await syncUpPortal();
    return NextResponse.json(sync);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UP portal sync failed";
    return NextResponse.json({ ok: false, syncedAt: new Date().toISOString(), error: message }, { status: 502 });
  }
}
