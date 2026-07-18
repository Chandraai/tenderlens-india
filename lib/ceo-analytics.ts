import type { Tender } from "@/lib/types";

export type MlPrediction = {
  tenderId: string;
  winProbability: number;
  priceBandLowCr: number;
  priceBandHighCr: number;
  riskScore: number;
  source: "python" | "local";
};

export function buildCeoAnalytics(tenders: Tender[], predictions: MlPrediction[], dbUpdatedAt: string) {
  const active = tenders.filter((tender) => tender.status === "Open" || tender.status === "Closing");
  const predictionMap = new Map(predictions.map((prediction) => [prediction.tenderId, prediction]));
  const pipelineCr = active.reduce((sum, tender) => sum + tender.valueCr, 0);
  const weightedPipelineCr = active.reduce((sum, tender) => {
    const prediction = predictionMap.get(tender.id);
    const probability = prediction?.winProbability ?? tender.winProbability;
    return sum + tender.valueCr * (probability / 100);
  }, 0);
  const emdBlockedCr = active.reduce((sum, tender) => sum + tender.emdLakh / 100, 0);
  const avgWin = active.length ? Math.round(active.reduce((sum, tender) => sum + (predictionMap.get(tender.id)?.winProbability ?? tender.winProbability), 0) / active.length) : 0;

  return {
    generatedAt: new Date().toISOString(),
    dbUpdatedAt,
    kpis: {
      activeTenders: active.length,
      pipelineCr,
      weightedPipelineCr,
      emdBlockedCr,
      avgWinProbability: avgWin,
      highRiskTenders: active.filter((tender) => tender.risk === "High").length,
      closingSoon: active.filter((tender) => tender.status === "Closing").length
    },
    stateHeatmap: groupBy(active, (tender) => tender.state || "India"),
    departmentPortfolio: groupBy(active, (tender) => tender.department).slice(0, 8),
    categoryMix: groupBy(active, (tender) => tender.category),
    deadlineBuckets: buildDeadlineBuckets(active),
    riskMatrix: ["Low", "Medium", "High"].map((risk) => ({
      risk,
      count: active.filter((tender) => tender.risk === risk).length,
      valueCr: roundCr(active.filter((tender) => tender.risk === risk).reduce((sum, tender) => sum + tender.valueCr, 0))
    })),
    capitalStack: active.map((tender) => ({
      id: tender.id,
      name: tender.title,
      valueCr: roundCr(tender.valueCr),
      emdCr: roundCr(tender.emdLakh / 100),
      pbgCr: roundCr((tender.valueCr * tender.pbgPercent) / 100),
      weightedCr: roundCr(tender.valueCr * ((predictionMap.get(tender.id)?.winProbability ?? tender.winProbability) / 100))
    })).sort((a, b) => b.weightedCr - a.weightedCr).slice(0, 8),
    mlRankings: active.map((tender) => {
      const prediction = predictionMap.get(tender.id);
      return {
        id: tender.id,
        title: tender.title,
        department: tender.department,
        state: tender.state || "India",
        currentScore: tender.aiScore,
        modelWin: prediction?.winProbability ?? tender.winProbability,
        riskScore: prediction?.riskScore ?? localRiskScore(tender),
        priceBand: `${roundCr(prediction?.priceBandLowCr ?? tender.recommendedBidLowCr)}-${roundCr(prediction?.priceBandHighCr ?? tender.recommendedBidHighCr)} Cr`,
        decision: getDecision(tender, prediction?.winProbability ?? tender.winProbability)
      };
    }).sort((a, b) => b.modelWin - a.modelWin).slice(0, 10),
    actionQueue: buildActionQueue(active, predictionMap),
    boardNarrative: buildBoardNarrative(active, weightedPipelineCr, emdBlockedCr, avgWin)
  };
}

export function localPredict(tender: Tender): MlPrediction {
  const pqPenalty = tender.pqChecks.filter((check) => !check.passed).length * 6;
  const riskPenalty = tender.risk === "High" ? 18 : tender.risk === "Medium" ? 8 : 0;
  const deadlinePenalty = tender.status === "Closing" ? 7 : tender.status === "Closed" ? 45 : 0;
  const capitalPenalty = tender.emdLakh > 50 ? 6 : tender.emdLakh > 10 ? 3 : 0;
  const winProbability = Math.max(8, Math.min(92, Math.round(tender.aiScore * 0.72 + tender.marginPercent * 1.4 - pqPenalty - riskPenalty - deadlinePenalty - capitalPenalty)));
  const discount = tender.risk === "High" ? 0.965 : tender.risk === "Medium" ? 0.975 : 0.985;
  return {
    tenderId: tender.id,
    winProbability,
    priceBandLowCr: roundCr(tender.valueCr * (discount - 0.025)),
    priceBandHighCr: roundCr(tender.valueCr * discount),
    riskScore: localRiskScore(tender),
    source: "local"
  };
}

function groupBy(tenders: Tender[], selector: (tender: Tender) => string) {
  const map = new Map<string, { name: string; count: number; valueCr: number; weightedCr: number }>();
  for (const tender of tenders) {
    const name = selector(tender);
    const item = map.get(name) || { name, count: 0, valueCr: 0, weightedCr: 0 };
    item.count += 1;
    item.valueCr += tender.valueCr;
    item.weightedCr += tender.valueCr * (tender.winProbability / 100);
    map.set(name, item);
  }
  return [...map.values()]
    .map((item) => ({ ...item, valueCr: roundCr(item.valueCr), weightedCr: roundCr(item.weightedCr) }))
    .sort((a, b) => b.valueCr - a.valueCr);
}

function buildDeadlineBuckets(tenders: Tender[]) {
  const now = new Date("2026-05-15T00:00:00+05:30");
  const buckets = [
    { name: "0-7d", count: 0, valueCr: 0 },
    { name: "8-15d", count: 0, valueCr: 0 },
    { name: "16-30d", count: 0, valueCr: 0 },
    { name: "30d+", count: 0, valueCr: 0 },
    { name: "Verify", count: 0, valueCr: 0 }
  ];
  for (const tender of tenders) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(tender.deadline) ? new Date(`${tender.deadline}T00:00:00+05:30`) : null;
    if (!parsed) {
      buckets[4].count += 1;
      buckets[4].valueCr += tender.valueCr;
      continue;
    }
    const days = Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000);
    const bucket = days <= 7 ? buckets[0] : days <= 15 ? buckets[1] : days <= 30 ? buckets[2] : buckets[3];
    bucket.count += 1;
    bucket.valueCr += tender.valueCr;
  }
  return buckets.map((bucket) => ({ ...bucket, valueCr: roundCr(bucket.valueCr) }));
}

function buildActionQueue(tenders: Tender[], predictionMap: Map<string, MlPrediction>) {
  return tenders
    .map((tender) => {
      const prediction = predictionMap.get(tender.id);
      const missing = tender.pqChecks.filter((check) => !check.passed).map((check) => check.label);
      const priority = tender.status === "Closing" ? 95 : tender.risk === "High" ? 82 : (prediction?.winProbability ?? tender.winProbability);
      return {
        id: tender.id,
        title: tender.title,
        priority,
        owner: tender.risk === "High" ? "CEO + Commercial" : missing.length ? "Bid Manager" : "Analyst",
        nextAction: tender.status === "Closing" ? "Freeze bid/no-bid today" : missing.length ? `Close PQ gap: ${missing[0]}` : "Run final price simulation",
        deadline: tender.deadline
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);
}

function buildBoardNarrative(tenders: Tender[], weightedPipelineCr: number, emdBlockedCr: number, avgWin: number) {
  const top = [...tenders].sort((a, b) => b.valueCr - a.valueCr)[0];
  return [
    `Weighted construction pipeline is Rs. ${roundCr(weightedPipelineCr)} Cr with average model win probability of ${avgWin}%.`,
    `EMD exposure is approximately Rs. ${roundCr(emdBlockedCr)} Cr; finance should reserve this before approving additional bids.`,
    top ? `Largest active opportunity is ${top.title} at Rs. ${roundCr(top.valueCr)} Cr, requiring CEO review on margin, PBG, and execution capacity.` : "No active tender opportunity is currently loaded.",
    "No-bid discipline should be applied to closed, high-risk, or PQ-incomplete tenders before bid team effort is committed."
  ];
}

function getDecision(tender: Tender, winProbability: number) {
  if (tender.status === "Closed") return "No-Bid";
  if (winProbability >= 72 && tender.risk !== "High") return "Bid";
  if (winProbability >= 52) return "Clarify";
  return "No-Bid";
}

function localRiskScore(tender: Tender) {
  return Math.min(100, Math.max(5, (tender.risk === "High" ? 72 : tender.risk === "Medium" ? 48 : 24) + tender.pqChecks.filter((check) => !check.passed).length * 8 + (tender.status === "Closing" ? 10 : 0)));
}

function roundCr(value: number) {
  return Math.round(value * 100) / 100;
}
