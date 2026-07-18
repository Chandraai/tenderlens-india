import { NextResponse } from "next/server";
import { tenders as curatedTenders } from "@/lib/data";
import { getLiveTenderFeed } from "@/lib/integrations/live-tenders";
import { readLocalDb } from "@/lib/local-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await Promise.race([
      getLiveTenderFeed(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Live tender feed timeout")), 6500))
    ]);
    return NextResponse.json(feed);
  } catch (error) {
    const db = await readLocalDb();
    const cachedTenders = db.tenders.length ? db.tenders : curatedTenders;
    return NextResponse.json({
      tenders: cachedTenders,
      liveRows: cachedTenders.filter((tender) => tender.sourceType && tender.sourceType !== "Curated").length,
      source: db.tenders.length ? "cached-local-db-feed" : "curated-fallback-feed",
      syncedAt: db.updatedAt || new Date().toISOString(),
      up: null,
      regional: [],
      defence: null,
      warnings: [error instanceof Error ? error.message : "Live tender feed unavailable"]
    });
  }
}
