import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";

export type AiRecommendation = {
  recommendation: "Approve Bid" | "Need Clarification" | "No-Bid";
  confidence: number;
  executiveAnswer: string;
  why: string[];
  mustVerify: string[];
  nextActions: string[];
  boardNote: string;
  generatedBy: "TenderLens Rules AI" | "OpenAI";
};

export function buildAiRecommendation(analysis: UploadedTenderAnalysis): AiRecommendation {
  const isClosed = analysis.deadlineStatus === "Closed";
  const isTender = analysis.isTenderDocument !== false;
  const hasCommercials = !isMissingField(analysis.estimatedValue) && !isMissingField(analysis.emd);
  const highRisk = analysis.riskLevel === "High";
  const missingCritical = analysis.documentGaps?.length >= 4;

  let recommendation: AiRecommendation["recommendation"] = "Need Clarification";
  if (!isTender || isClosed || analysis.recommendedDecision === "Avoid / No-Bid") recommendation = "No-Bid";
  else if (analysis.bidReadinessScore >= 76 && analysis.winProbability >= 60 && !highRisk && hasCommercials) recommendation = "Approve Bid";

  const confidence = scoreConfidence(analysis, recommendation);
  const why = buildWhy(analysis, recommendation);
  const mustVerify = buildMustVerify(analysis, isTender, isClosed, missingCritical);
  const nextActions = buildNextActions(analysis, recommendation);

  return {
    recommendation,
    confidence,
    executiveAnswer: buildExecutiveAnswer(analysis, recommendation),
    why,
    mustVerify,
    nextActions,
    boardNote: buildBoardNote(analysis, recommendation),
    generatedBy: "TenderLens Rules AI"
  };
}

function scoreConfidence(analysis: UploadedTenderAnalysis, recommendation: AiRecommendation["recommendation"]) {
  let score = 58;
  if (analysis.isTenderDocument) score += 12;
  if (analysis.deadlineStatus && analysis.deadlineStatus !== "Unknown") score += 8;
  if (!isMissingField(analysis.estimatedValue)) score += 8;
  if (!isMissingField(analysis.emd)) score += 6;
  if (!isMissingField(analysis.pbg)) score += 4;
  if (analysis.pqCriteria?.length >= 3) score += 7;
  if (analysis.documentGaps?.length) score -= Math.min(15, analysis.documentGaps.length * 3);
  if (analysis.riskLevel === "High") score -= 8;
  if (recommendation === "No-Bid" && analysis.deadlineStatus === "Closed") score += 12;
  return Math.max(20, Math.min(96, Math.round(score)));
}

function buildExecutiveAnswer(analysis: UploadedTenderAnalysis, recommendation: AiRecommendation["recommendation"]) {
  if (recommendation === "Approve Bid") {
    return `AI recommendation: approve bid preparation for ${analysis.title}. Commercials and PQ signals are strong enough to proceed, subject to final BOQ and finance sign-off.`;
  }
  if (recommendation === "No-Bid") {
    if (analysis.deadlineStatus === "Closed") return `AI recommendation: no-bid. The tender deadline is closed, so spend should stop unless an official corrigendum extends submission.`;
    if (analysis.isTenderDocument === false) return `AI recommendation: no-bid for tender approval. This is a reference/regulatory PDF, not a bid package.`;
    return `AI recommendation: no-bid unless critical gaps are resolved. Risk or missing bid information is too high for CEO approval.`;
  }
  return `AI recommendation: hold for clarification. Keep this in the pipeline, but do not submit commercial bid until finance, PQ and risk gaps are closed.`;
}

function buildWhy(analysis: UploadedTenderAnalysis, recommendation: AiRecommendation["recommendation"]) {
  const reasons = [
    `System decision is ${analysis.recommendedDecision} with ${analysis.bidReadinessScore}/100 bid readiness.`,
    `Deadline status is ${analysis.deadlineStatus || "Unknown"}; extracted deadline is ${analysis.deadline}.`,
    `Risk level is ${analysis.riskLevel}; win probability is ${analysis.winProbability}%.`
  ];
  if (analysis.estimatedValue !== "Not applicable") reasons.push(`Commercial exposure status: value ${analysis.estimatedValue}, EMD ${analysis.emd}, PBG ${analysis.pbg}.`);
  if (analysis.boqAnalysis && !isMissingField(analysis.boqAnalysis.estimatedProjectCost)) {
    reasons.push(`BOQ basis: ${analysis.boqAnalysis.estimatedProjectCost} project cost with ${analysis.boqAnalysis.sourceConfidence.toLowerCase()} extraction confidence.`);
    reasons.push(`Net profit model: ${analysis.boqAnalysis.profitAnalysis.expectedNetProfit} at ${analysis.boqAnalysis.profitAnalysis.netProfitPercent}.`);
  }
  if (recommendation === "Approve Bid") reasons.push("No immediate blocker detected, but CEO approval should still require final BOQ and document check.");
  return reasons;
}

function buildMustVerify(analysis: UploadedTenderAnalysis, isTender: boolean, isClosed: boolean, missingCritical: boolean) {
  const checks = [];
  if (!isTender) checks.push("Upload actual NIT/RFP/BOQ tender document.");
  if (isClosed) checks.push("Check official corrigendum for deadline extension.");
  if (analysis.deadlineStatus === "Unknown") checks.push("Manually confirm bid submission deadline.");
  if (isMissingField(analysis.estimatedValue)) checks.push("Confirm tender estimated value from official portal/NIT/RFP.");
  if (isMissingField(analysis.emd)) checks.push("Confirm EMD amount and payment/BG mode.");
  if (isMissingField(analysis.pbg)) checks.push("Confirm PBG/performance security and additional performance security rules.");
  if (!analysis.boqAnalysis || analysis.boqAnalysis.sourceConfidence !== "High") checks.push("Verify detailed BOQ line items, quantities, units and item rates from the original BOQ/NIT.");
  if (analysis.boqAnalysis?.advanceExposure.tnpAdvance.includes("potential")) checks.push("Confirm mobilisation and T&P/TNP advance clause, BG requirement, interest and recovery schedule.");
  if (missingCritical) checks.push("Close GST, PAN, MSME/Udyam, ISO, contractor registration, turnover and similar-work document gaps.");
  return checks.length ? checks : ["Final BOQ, site visit, corrigendum and finance sign-off before submission."];
}

function isMissingField(value: string) {
  return !value || /not clearly found|not applicable|verify/i.test(value);
}

function buildNextActions(analysis: UploadedTenderAnalysis, recommendation: AiRecommendation["recommendation"]) {
  if (recommendation === "Approve Bid") {
    return [
      "Assign bid manager and freeze submission calendar.",
      "Complete BOQ rate analysis and L1 competitor estimate.",
      "Confirm EMD/PBG limits with finance.",
      "Validate T&P/TNP advance and expected net profit against BOQ rates.",
      "Prepare PQ compliance matrix and final CEO sign-off memo."
    ];
  }
  if (recommendation === "No-Bid") {
    return [
      "Do not spend on bid preparation until blocker is removed.",
      "Track corrigendum or replacement tender if strategically important.",
      "Store PDF as reference evidence in Document Vault.",
      "Notify CEO/investor that this opportunity is not actionable now."
    ];
  }
  return [
    "Ask tender owner/department for missing clarification.",
    "Verify deadline, EMD, PBG, PQ and BOQ from source portal.",
    "Run finance exposure and margin guardrail review.",
    "Return to CEO with approve/no-bid decision after gaps close."
  ];
}

function buildBoardNote(analysis: UploadedTenderAnalysis, recommendation: AiRecommendation["recommendation"]) {
  const boqNote = analysis.boqAnalysis && !isMissingField(analysis.boqAnalysis.estimatedProjectCost)
    ? ` BOQ cost: ${analysis.boqAnalysis.estimatedProjectCost}. Net profit: ${analysis.boqAnalysis.profitAnalysis.expectedNetProfit} (${analysis.boqAnalysis.profitAnalysis.netProfitPercent}).`
    : " BOQ/RFP commercial sheet not verified yet.";
  return `${recommendation}: ${analysis.title}. Value: ${analysis.estimatedValue}. Deadline: ${analysis.deadline}. EMD: ${analysis.emd}. PBG: ${analysis.pbg}.${boqNote} AI basis: bid readiness ${analysis.bidReadinessScore}/100, risk ${analysis.riskLevel}, win probability ${analysis.winProbability}%.`;
}
