import { NextResponse } from "next/server";
import { buildCeoAnalytics, localPredict, type MlPrediction } from "@/lib/ceo-analytics";
import { tenders as curatedTenders } from "@/lib/data";
import { getLiveTenderFeed } from "@/lib/integrations/live-tenders";
import { readLocalDb, upsertTenderSnapshot } from "@/lib/local-db";
import type { Tender } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PythonPredictionResponse = {
  tender_id: string;
  win_probability: number | string;
  price_band_low_cr: number | string;
  price_band_high_cr: number | string;
  risk_score: number | string;
};

export async function GET() {
  const feed = await getFastDashboardFeed();
  const db = await upsertTenderSnapshot({
    tenders: feed.tenders,
    liveRows: feed.liveRows,
    source: feed.source
  });
  const predictions = await predictWithPython(feed.tenders);
  const analytics = buildCeoAnalytics(feed.tenders, predictions, db.updatedAt);

  return NextResponse.json({
    analytics,
    persistence: {
      mode: "local-json-db",
      path: "data/tenderlens-db.json",
      tenderRows: db.tenders.length,
      snapshots: db.dashboardSnapshots.length,
      postgresReady: true
    },
    ml: {
      serviceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
      source: predictions.some((prediction) => prediction.source === "python") ? "python-fastapi" : "local-fallback",
      predictions: predictions.length
    },
    feed: {
      liveRows: feed.liveRows,
      source: feed.source,
      up: feed.up,
      warnings: feed.warnings
    }
  });
}

async function getFastDashboardFeed() {
  try {
    return await Promise.race([
      getLiveTenderFeed(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Live feed timeout")), 6500))
    ]);
  } catch (error) {
    const db = await readLocalDb();
    const cachedTenders = db.tenders.length ? db.tenders : curatedTenders;
    return {
      tenders: cachedTenders,
      liveRows: cachedTenders.filter((tender) => tender.sourceType && tender.sourceType !== "Curated").length,
      source: db.tenders.length ? "cached-local-db-feed" : "curated-fallback-feed",
      syncedAt: db.updatedAt || new Date().toISOString(),
      up: null,
      warnings: [error instanceof Error ? error.message : "Live feed unavailable"]
    };
  }
}

async function predictWithPython(tenders: Tender[]): Promise<MlPrediction[]> {
  const serviceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${serviceUrl}/dashboard-insights`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenders: tenders.map((tender) => ({
          id: tender.id,
          value_cr: tender.valueCr,
          emd_lakh: tender.emdLakh,
          margin_percent: tender.marginPercent,
          ai_score: tender.aiScore,
          risk: tender.risk,
          status: tender.status,
          win_probability: tender.winProbability,
          pq_gap_count: tender.pqChecks.filter((check) => !check.passed).length,
          competitor_estimate_cr: tender.competitorEstimateCr
        }))
      }),
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error(`AI service ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.predictions)) throw new Error("Invalid AI service response");
    return (body.predictions as PythonPredictionResponse[]).map((item) => ({
      tenderId: item.tender_id,
      winProbability: Math.round(Number(item.win_probability)),
      priceBandLowCr: Number(item.price_band_low_cr),
      priceBandHighCr: Number(item.price_band_high_cr),
      riskScore: Math.round(Number(item.risk_score)),
      source: "python"
    }));
  } catch {
    return tenders.map(localPredict);
  }
}
