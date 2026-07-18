import { NextResponse } from "next/server";
import { syncGeMPortal } from "@/lib/integrations/gem-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await syncGeMPortal());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "GeM sync failed" },
      { status: 500 }
    );
  }
}
