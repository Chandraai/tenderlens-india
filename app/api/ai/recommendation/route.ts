import { NextResponse } from "next/server";
import { buildAiRecommendation } from "@/lib/ai-recommendation";
import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysis = body.analysis as UploadedTenderAnalysis | undefined;

    if (!analysis?.title) {
      return NextResponse.json({ error: "Tender analysis is required" }, { status: 400 });
    }

    return NextResponse.json({ recommendation: buildAiRecommendation(analysis) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI recommendation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
