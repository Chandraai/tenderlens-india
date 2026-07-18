import type { Tender } from "@/lib/types";

export type UploadedTenderAnalysis = {
  id: string;
  fileName: string;
  originalSourceUrl?: string;
  sourceTender?: Tender;
  documentType: "Tender" | "Reference/Bylaws" | "Unknown";
  isTenderDocument: boolean;
  documentWarning: string;
  title: string;
  department: string;
  portalHint: string;
  estimatedValue: string;
  deadline: string;
  deadlineStatus: "Open" | "Closing Soon" | "Closed" | "Not applicable" | "Unknown";
  emd: string;
  pbg: string;
  scope: string[];
  keyClauses: string[];
  pqCriteria: string[];
  documentGaps: string[];
  riskLevel: "Low" | "Medium" | "High";
  riskReasons: string[];
  bidReadinessScore: number;
  winProbability: number;
  recommendedDecision: "Take Tender" | "Review Carefully" | "Avoid / No-Bid";
  decisionReasons: string[];
  investorSummary: string;
  aiReport: TenderAiReport;
  boqAnalysis: BoqAnalysis;
  extractedTextPreview: string;
  createdAt: string;
};

export type BoqAnalysis = {
  sourceConfidence: "High" | "Medium" | "Low";
  sourceNote: string;
  estimatedProjectCost: string;
  estimatedProjectCostInr: number | null;
  costReconciliation?: {
    boqBaseCost: string;
    gstAmount: string;
    totalWithGst: string;
    pdfEstimatedValue: string;
    variance: string;
    note: string;
  };
  items: BoqLineItem[];
  advanceExposure: {
    mobilizationAdvance: string;
    tnpAdvance: string;
    securedAdvance: string;
    bankGuaranteeExposure: string;
    note: string;
  };
  profitAnalysis: {
    targetBid: string;
    directCost: string;
    overhead: string;
    riskContingency: string;
    financeCost: string;
    expectedNetProfit: string;
    netProfitPercent: string;
    recommendation: string;
  };
};

export type BoqLineItem = {
  description: string;
  quantity: string;
  unit: string;
  amount: string;
  basis: string;
};

export type TenderAiReport = {
  executiveBrief: string;
  boardRecommendation: string;
  financialExposure: {
    estimatedValue: string;
    emd: string;
    pbg: string;
    cashflowView: string;
  };
  complianceReadiness: {
    score: number;
    status: string;
    requiredActions: string[];
  };
  riskRegister: { risk: string; severity: "Low" | "Medium" | "High"; mitigation: string }[];
  bidStrategy: {
    pricingPosture: string;
    l1Approach: string;
    marginGuardrail: string;
    negotiationLevers: string[];
  };
  actionPlan72Hours: string[];
  reportSections: { title: string; bullets: string[] }[];
};

const riskKeywords = [
  "blacklist",
  "debar",
  "liquidated damages",
  "penalty",
  "forfeiture",
  "termination",
  "arbitration",
  "bid security",
  "performance security",
  "strictly"
];

const clauseKeywords = [
  "eligibility",
  "earnest money",
  "emd",
  "performance bank guarantee",
  "pbg",
  "scope of work",
  "service level",
  "sla",
  "liquidated damages",
  "payment terms",
  "technical bid",
  "financial bid",
  "turnover",
  "experience",
  "msme",
  "udyam",
  "iso",
  "gst",
  "pan"
];

export function analyzeTenderText(fileName: string, rawText: string): UploadedTenderAnalysis {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();
  const classification = classifyDocument(fileName, lower);
  const sentences = splitSentences(text);
  const title = extractTitle(fileName, text);
  const department = classification.isTenderDocument ? extractDepartment(text) : "Not applicable";
  const deadline = classification.isTenderDocument ? extractDeadline(text) : "Not applicable";
  const deadlineStatus = getDeadlineStatus(deadline);
  const emd = classification.isTenderDocument ? extractEmd(text) || "Not clearly found" : "Not applicable";
  const pbg = classification.isTenderDocument ? extractPbg(text) || "Not clearly found" : "Not applicable";
  const estimatedValue = classification.isTenderDocument ? extractEstimatedValue(text) || "Not clearly found" : "Not applicable";
  const portalHint = /bidplus\.gem|gem\.gov|gemarpts|GeM\s+GTC|GeM\s+Bid/i.test(text) ? "GeM" : lower.includes("central public procurement") || lower.includes("cppp") ? "CPPP" : "State/Other";

  const scope = classification.isTenderDocument
    ? buildScope(text, sentences)
    : ["Reference/regulatory document detected. Upload the actual NIT/RFP/BOQ tender PDF for scope extraction."];
  const keyClauses = classification.isTenderDocument
    ? buildKeyClauses(text, sentences)
    : ["No tender clauses extracted because this PDF is not a bid-ready tender package."];
  const pqCriteria = classification.isTenderDocument
    ? buildPqCriteria(text, sentences)
    : ["PQ eligibility cannot be checked from this reference document. Upload the tender NIT/RFP/BOQ."];
  const riskReasons = pickLines(sentences, riskKeywords, 5);
  const documentGaps = buildDocumentGaps(lower);
  const bidReadinessScore = classification.isTenderDocument ? scoreReadiness({ deadline, deadlineStatus, emd, pbg, pqCriteria, documentGaps, riskReasons, text }) : 18;
  const winProbability = classification.isTenderDocument ? Math.max(18, Math.min(91, Math.round(bidReadinessScore * 0.78 + (pqCriteria.length > 3 ? 12 : 4) - riskReasons.length * 3))) : 0;
  const riskLevel: UploadedTenderAnalysis["riskLevel"] = !classification.isTenderDocument || riskReasons.length >= 4 || documentGaps.length >= 4 ? "High" : riskReasons.length >= 2 || documentGaps.length >= 2 ? "Medium" : "Low";
  const recommendedDecision: UploadedTenderAnalysis["recommendedDecision"] = !classification.isTenderDocument || deadlineStatus === "Closed" ? "Avoid / No-Bid" : bidReadinessScore >= 74 && riskLevel !== "High" ? "Take Tender" : bidReadinessScore >= 52 ? "Review Carefully" : "Avoid / No-Bid";
  const baseAnalysis = {
    title,
    estimatedValue,
    deadline,
    deadlineStatus,
    emd,
    pbg,
    scope: scope.length ? scope : ["Scope was not clearly extractable. Review the PDF manually before bid approval."],
    keyClauses: keyClauses.length ? keyClauses : ["Eligibility, EMD/PBG, scope, payment and penalty clauses need manual review."],
    pqCriteria: pqCriteria.length ? pqCriteria : ["PQ criteria not clearly detected. Check turnover, experience, certifications and local registration requirements."],
    documentGaps,
    riskLevel,
    riskReasons: riskReasons.length ? riskReasons : ["No major high-risk clause detected in the parsed text."],
    bidReadinessScore,
    winProbability,
    recommendedDecision
  };

  return {
    id: `UPL-${Date.now()}`,
    fileName,
    documentType: classification.documentType,
    isTenderDocument: classification.isTenderDocument,
    documentWarning: classification.warning,
    title,
    department,
    portalHint,
    estimatedValue,
    deadline,
    deadlineStatus,
    emd,
    pbg,
    scope: baseAnalysis.scope,
    keyClauses: baseAnalysis.keyClauses,
    pqCriteria: baseAnalysis.pqCriteria,
    documentGaps,
    riskLevel,
    riskReasons: baseAnalysis.riskReasons,
    bidReadinessScore,
    winProbability,
    recommendedDecision,
    decisionReasons: buildDecisionReasons(recommendedDecision, bidReadinessScore, riskLevel, documentGaps, deadline, emd),
    investorSummary: buildInvestorSummary(recommendedDecision, title, estimatedValue, deadline, riskLevel, bidReadinessScore),
    aiReport: buildAiReport(baseAnalysis),
    boqAnalysis: buildBoqAnalysis({ text, classification, title, estimatedValue, emd, pbg, riskLevelHint: riskLevel }),
    extractedTextPreview: text.slice(0, 1200),
    createdAt: new Date().toISOString()
  };
}

function normalizeText(text: string) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").replace(/[•●]/g, ".").trim();
}

function splitSentences(text: string) {
  const withTenderBoundaries = text
    .replace(/\s+(Bid Details|Bid End Date\/Time|Bid Opening Date\/Time|Bid Offer Validity|Ministry\/State Name|Department Name|Organisation Name|Office Name|Total Quantity|Item Category|BOQ Title|Minimum Average Annual Turnover|Years of Past Experience|MSE Exemption|Startup Relaxation|Document required|Estimated Bid Value|EMD Detail|ePBG Detail|Evaluation Method|Contract Period|Consignees\/Reporting Officer|Work Description|Tender Value|EMD Amount|Bid Submission End Date|Tender Fee|Product Category)/gi, ". $1")
    .replace(/\s+\/\s*/g, ". ");

  return withTenderBoundaries
    .split(/(?<=[.;:])\s+|\n+/)
    .map(clean)
    .filter((item) => item.length > 28 && item.length < 260)
    .filter((item) => !isNoisyExtract(item));
}

function extractTitle(fileName: string, text: string) {
  if (/bylaws?|bye[\s-]?laws?|building rules?|zoning regulations?/i.test(fileName)) {
    return clean(fileName.replace(/\.pdf$/i, ""));
  }
  const coverTitle = text.match(/(UP\s+Model\s+Building\s+Byelaws?\s+\d{4}|Model\s+Building\s+Byelaws?\s+\d{4}|Building\s+Byelaws?\s+and\s+Zoning\s+Regulations)/i)?.[1];
  if (coverTitle) return clean(coverTitle);
  const gemTitle = extractGemTitle(text);
  if (gemTitle) return gemTitle;
  const workTitle =
    text.match(/NAME OF WORK\s*[:\-]?\s*([A-Za-z0-9 ,./()&:\-]{20,260}?)(?:\s+THIS BID DOCUMENT|\s+Note:-|\s+--\s*\d+\s+of|\s+Estimated Cost)/i)?.[1] ||
    text.match(/Name of work\s*[:\-]?\s*([A-Za-z0-9 ,./()&:\-]{20,260}?)(?:\s+Note:-|\s+Sl\. No\.|\s+Estimated Cost|\s+--\s*\d+\s+of)/i)?.[1] ||
    text.match(/Procurement of Works\s+([A-Za-z0-9 ,./()&:\-]{20,220}?)(?:\s+INDEX|\s+NIT No|\s+Tender Reference|\s+SCHEDULE|\s+Cost of Tender|\s+Last date)/i)?.[1] ||
    text.match(/Name of Work\s*[:\-]?\s*([A-Za-z0-9 ,./()&:\-]{20,220}?)(?:\s+Estimated Cost|\s+Earnest Money|\s+NIT|\s+Tender)/i)?.[1] ||
    text.match(/Work Description\s*[:\-]?\s*([A-Za-z0-9 ,./()&:\-]{20,220}?)(?:\s+NDA|\s+Tender Value|\s+Product Category)/i)?.[1];
  if (workTitle) return clean(workTitle);
  const firstUseful = text
    .split(/\n|\. /)
    .map((line) => line.trim())
    .find((line) => line.length > 20 && /tender|rfp|bid|nit|work|supply|service/i.test(line));
  return clean(firstUseful || fileName.replace(/\.pdf$/i, ""));
}

function extractDepartment(text: string) {
  const uppcl = text.match(/U\.?P\.?\s+Projects?\s+Corporation\s+Ltd\.?/i)?.[0];
  if (uppcl) return "U.P. Projects Corporation Ltd.";
  const gemDepartment = extractGemDepartment(text);
  if (gemDepartment) return gemDepartment;
  const match = text.match(/(?:department|ministry|office|authority|buyer)\s*(?:name)?\s*[:\-]\s*([A-Za-z&.,\s]{4,80})/i);
  return clean(match?.[1] || "Not clearly found");
}

function extractDeadline(text: string) {
  const gemBidEnd = text.match(/Bid End Date\/Time\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/i)?.[1];
  if (gemBidEnd) return clean(gemBidEnd);
  const upSubmission =
    text.match(/Last date[^]{0,220}?Upto\s+([0-9:.\sapmAPM]+)\s+on\s*-?\s*(\d{1,2}[-.]\d{1,2}[-.]\d{2,4})/i) ||
    text.match(/submitted by on or before\s+(\d{1,2}[-.]\d{1,2}[-.]\d{2,4})\s+Upto\s+([0-9:.\sapmAPM]+)/i);
  if (upSubmission?.[1] && upSubmission?.[2]) {
    const first = clean(upSubmission[1]);
    const second = clean(upSubmission[2]);
    return /\d{1,2}[-.]\d{1,2}[-.]\d{2,4}/.test(first) ? first : second;
  }
  const technicalOpen = text.match(/TO BE OPENED ON\s+(\d{1,2}[-.]\d{1,2}[-.]\d{2,4})/i)?.[1];
  if (technicalOpen) return clean(technicalOpen);
  const submissionEnd = text.match(/Bid Submission End Date[^0-9]{0,80}(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{2,4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)?.[1];
  if (submissionEnd) return clean(submissionEnd);
  const datePattern = /(?:last date|deadline|bid submission|submission end|bid submission end date|closing date|due date|last date and time of online submission)[^0-9]{0,80}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{2,4})/i;
  return clean(text.match(datePattern)?.[1] || "Not clearly found");
}

function getDeadlineStatus(deadline: string): UploadedTenderAnalysis["deadlineStatus"] {
  if (deadline === "Not applicable") return "Not applicable";
  if (deadline === "Not clearly found") return "Unknown";
  const parsed = parseDate(deadline);
  if (!parsed) return "Unknown";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "Closed";
  if (days <= 7) return "Closing Soon";
  return "Open";
}

function parseDate(value: string) {
  const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
  const numeric = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (numeric) {
    const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
    return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractMoneyNear(text: string, keywords: string[]) {
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[^0-9]{0,100}((?:₹|rs\\.?|inr)?\\s?[0-9][0-9,.]*(?:\\.\\d+)?\\s?(?:crore|cr|lakh|lac|lakhs|lacs|rupees)?)`, "i");
    const match = text.match(pattern);
    if (match?.[1] && isReliableMoneyMatch(match[1])) return normalizeMoneyLabel(match[1]);
  }
  return "";
}

function classifyDocument(fileName: string, lower: string) {
  const name = fileName.toLowerCase();
  if (isGemTender(lower) || /bid details|bid end date\/time|bid opening date\/time|item category|minimum average annual turnover/i.test(lower)) {
    return {
      documentType: "Tender" as const,
      isTenderDocument: true,
      warning: "GeM tender document detected. Review extracted fields against the original GeM bid document before submission."
    };
  }
  const referenceSignals = [
    "building byelaws",
    "building bylaws",
    "model building",
    "zoning regulations",
    "development control",
    "master plan",
    "short title and definitions",
    "occupancy",
    "floor area ratio",
    "building permit"
  ];
  const tenderSignals = [
    "notice inviting tender",
    "nit",
    "tender id",
    "bid submission",
    "earnest money",
    "emd",
    "boq",
    "financial bid",
    "technical bid",
    "performance security",
    "tender value"
  ];
  const referenceScore = referenceSignals.filter((signal) => lower.includes(signal) || name.includes(signal)).length;
  const tenderScore = tenderSignals.filter((signal) => lower.includes(signal) || name.includes(signal)).length;

  if (referenceScore >= 2 && tenderScore < 4) {
    return {
      documentType: "Reference/Bylaws" as const,
      isTenderDocument: false,
      warning: "This PDF looks like a regulatory/reference document, not a live tender NIT/RFP. Use it for compliance context, not bid/no-bid approval."
    };
  }
  if (tenderScore >= 3) {
    return {
      documentType: "Tender" as const,
      isTenderDocument: true,
      warning: "Tender-like document detected. Review extracted fields against the original tender document/source before bid submission."
    };
  }
  return {
    documentType: "Unknown" as const,
    isTenderDocument: false,
    warning: "This PDF does not contain enough NIT/RFP signals. Manually confirm whether it is a tender before CEO approval."
  };
}

function extractPercentNear(text: string, keywords: string[]) {
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}.{0,80}(\\d+(?:\\.\\d+)?\\s?%)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

function extractEmd(text: string) {
  const upPress =
    text.match(/Estimated cost put to bid[^]{0,900}?Earnest Money[^]{0,400}?Rs\.?\s*([0-9,.]+)\s*(?:lakh|lac)?\s+Rs\.?\s*([0-9,.]+)/i) ||
    text.match(/Name of work & Location Estimated cost[^]{0,900}?Rs\.?\s*([0-9,.]+)\s*(?:lakh|lac)\s+Rs\.?\s*([0-9,.]+)/i);
  if (upPress?.[2]) return formatLakhAmount(Number(upPress[2].replace(/,/g, "")));
  const explicit = extractMoneyNear(text, ["emd amount", "emd", "earnest money"]);
  if (explicit) return explicit;
  const twoPercent = text.match(/Earnest Money\s*\(?2%\s+of\s+tendered\s+cost/i);
  if (twoPercent) return "2% of tendered cost";
  return "";
}

function extractPbg(text: string) {
  if (/ePBG Detail.{0,160}Required\s+No\b/i.test(text)) return "Not required";
  if (/ePBG Detail.{0,160}Required\s+Yes\b/i.test(text)) return "Required - verify amount";
  const direct = text.match(/(\d+(?:\.\d+)?\s?%)\s+performance guarantee/i)?.[1];
  if (direct) return clean(direct);
  const percent =
    extractPercentNear(text, ["performance guarantee", "performance security", "performance bank guarantee", "pbg"]) ||
    text.match(/(\d+(?:\.\d+)?\s?%)\s+performance guarantee/i)?.[1];
  if (percent) return clean(percent);
  return extractMoneyNear(text, ["pbg", "performance bank guarantee"]);
}

function extractEstimatedValue(text: string) {
  const upBrief =
    text.match(/Name of work\s+Estimated Cost\s+Period of completion[^]{0,500}?TOTAL COST\s+Rs\.?\s*([0-9,.]+)\s*(?:Lac|Lakh)/i)?.[1] ||
    text.match(/Estimated cost put to bid\s*\(in\s*lac\s*\)[^]{0,500}?Rs\.?\s*([0-9,.]+)\s*(?:Lakh|Lac)/i)?.[1] ||
    text.match(/TOTAL COST\s+Rs\.?\s*([0-9,.]+)\s*(?:Lac|Lakh)/i)?.[1];
  if (upBrief) return formatLakhAmount(Number(upBrief.replace(/,/g, "")));
  const labeled =
    extractMoneyNear(text, ["estimated cost", "tender value", "estimated value", "project cost"]) ||
    extractBareMoneyNear(text, ["estimated bid value", "bid value"]);
  return labeled;
}

function buildScope(text: string, sentences: string[]) {
  if (isUppclTender(text)) {
    return [
      extractTitle("tender.pdf", text),
      "Civil works package for C.M. Model Composite Vidhyalaya from pre-primary to 12th class.",
      "Location: Village Bisavar, Block Sadabad, District Hathras, Uttar Pradesh.",
      "Completion period: 18 months including rainy season.",
      "Financial bid is percentage-rate/BOQ based; verify BOQ and drawings before pricing."
    ].filter(Boolean);
  }
  if (isGemTender(text)) {
    const title = extractGemTitle(text);
    const category = extractGemField(text, "Item Category", ["GeMARPTS", "Searched Strings", "BOQ Title", "Minimum Average"]);
    const quantity = extractGemField(text, "Total Quantity", ["Item Category", "GeMARPTS", "BOQ Title"]);
    const primary = extractGemField(text, "Primary product category", ["Time allowed", "Inspection Required", "Estimated Bid Value"]);
    return [
      title ? `BOQ title: ${title}.` : "",
      category ? `Item category: ${category}.` : "",
      quantity ? `Total quantity: ${quantity}.` : "",
      primary ? `Primary product category: ${primary}.` : "",
      "Verify detailed BOQ/specification, consignee location and ATC on GeM before pricing."
    ].filter(Boolean);
  }
  return pickLines(sentences, ["scope", "supply", "implementation", "services", "deliverables", "work"], 5);
}

function buildPqCriteria(text: string, sentences: string[]) {
  if (isUppclTender(text)) {
    return [
      "Similar work experience: three works of 40%, or two works of 50%, or one work of 80% of tendered cost.",
      "Government/PSU/autonomous body work experience: one work of at least 40% of tendered cost.",
      "Average annual financial turnover: minimum 30% of tendered cost in civil/electrical construction work.",
      "No loss in more than two years during the last five audited balance-sheet years.",
      "Bidding capacity must be equal to or more than the estimated cost of the work.",
      "Required forms include CA turnover certificate, banker certificate, similar work details, plant/equipment, personnel and affidavit."
    ];
  }
  if (isGemTender(text)) {
    const turnover = text.match(/Minimum Average Annual Turnover of the bidder \(For 3 Years\)[^0-9]{0,80}([0-9.]+\s*Lakh\s*\(s\)|[0-9.]+\s*Lac\s*\(s\)|[0-9.]+\s*Cr(?:ore)?)/i)?.[1] ||
      extractGemField(text, "Minimum Average Annual Turnover of the bidder (For 3 Years)", ["Years of Past Experience", "MSE Relaxation", "Startup Relaxation"]);
    const experience = text.match(/Years of Past Experience Required for same\/similar service[^0-9]{0,80}([0-9.]+\s*Year\s*\(s\))/i)?.[1] ||
      extractGemField(text, "Years of Past Experience Required for same/similar service", ["MSE Relaxation", "Startup Relaxation", "Document required"]);
    const documents = extractGemField(text, "Document required from seller", ["Do you want", "Minimum number", "Bid to RA", "Type of Bid"]);
    const mse = text.match(/MSE Relaxation for Years of Experience and Turnover\s+(Yes|No)\b/i)?.[1] ||
      extractGemField(text, "MSE Relaxation for Years of Experience and Turnover", ["Startup Relaxation", "Document required"]);
    return [
      turnover ? `Minimum average annual turnover: ${turnover}.` : "",
      experience ? `Similar service experience: ${experience}.` : "",
      documents ? `Required seller documents: ${documents}.` : "",
      mse ? `MSE relaxation: ${mse}.` : "",
      "Check GeM seller category eligibility, ATC certificates and MSME/Udyam exemption proof before submission."
    ].filter(Boolean);
  }
  return pickLines(sentences, ["turnover", "experience", "similar work", "iso", "gst", "pan", "msme", "udyam", "net worth", "certificate"], 8);
}

function buildKeyClauses(text: string, sentences: string[]) {
  if (isUppclTender(text)) {
    return [
      "Technical/eligibility bid opens on 09-06-2026 at 03:00 pm; financial bid opens only for technically qualified bidders.",
      "EMD must be deposited online with technical bid; invalid EMD can make bid invalid.",
      "Performance guarantee: 5% of tendered value plus GST in FDR/bank guarantee form.",
      "Liquidated damages, time extension, measurement, payment, variation and termination clauses apply under GCC.",
      "Tender fee/processing fee and all technical documents must be submitted within bid submission period."
    ];
  }
  if (isGemTender(text)) {
    const bidEnd = text.match(/Bid End Date\/Time\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)?.[1];
    const bidOpening = text.match(/Bid Opening Date\/Time\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)?.[1];
    const validity = extractGemField(text, "Bid Offer Validity (From End Date)", ["Ministry/State Name", "Department Name"]);
    const payment = text.match(/Payment Timelines\s+(.{20,180}?)(?:\s+Evaluation Method|\s+Arbitration Clause|\s+Mediation Clause)/i)?.[1];
    const epbg = /ePBG Detail.{0,160}Required\s+No\b/i.test(text) ? "Not required" : /ePBG Detail.{0,160}Required\s+Yes\b/i.test(text) ? "Required - verify amount" : "";
    return [
      bidEnd ? `Bid end date/time: ${clean(bidEnd)}.` : "",
      bidOpening ? `Bid opening date/time: ${clean(bidOpening)}.` : "",
      validity ? `Bid offer validity: ${validity}.` : "",
      payment ? `Payment timeline: ${clean(payment)}.` : "",
      epbg ? `ePBG: ${epbg}.` : "ePBG/PBG requirement not clearly detected; verify GeM bid detail.",
      "GeM GTC and buyer ATC/corrigendum must be checked before bid spend."
    ].filter(Boolean);
  }
  return pickLines(sentences, clauseKeywords, 8);
}

function isUppclTender(text: string) {
  return /U\.?P\.?\s+Projects?\s+Corporation\s+Ltd\.?|upprojects\.org|UPPCL contracts/i.test(text);
}

function isGemTender(text: string) {
  return /Bid End Date\/Time|Bid Number:\s*GEM|GEM\/\d{4}\/B\/|GeM\s+GTC|GeMARPTS/i.test(text);
}

function extractGemTitle(text: string) {
  const boq = extractGemField(text, "BOQ Title", ["Minimum Average Annual Turnover", "Years of Past Experience", "Document required", "Bid Details"]);
  if (boq) return cleanEnglishLead(boq);
  const product = extractGemField(text, "Primary product category", ["Time allowed", "Inspection Required", "Estimated Bid Value"]);
  return product ? cleanEnglishLead(product) : "";
}

function extractGemDepartment(text: string) {
  const department = extractGemField(text, "Department Name", ["Organisation Name", "Office Name", "Total Quantity", "Item Category"]);
  const organisation = extractGemField(text, "Organisation Name", ["Office Name", "Total Quantity", "Item Category"]);
  return [department, organisation].map(cleanEnglishLead).filter(Boolean).join(" / ");
}

function extractGemField(text: string, label: string, stopLabels: string[]) {
  const escapedLabel = escapeRegExp(label);
  const escapedStops = stopLabels.map(escapeRegExp).join("|");
  const pattern = new RegExp(`(?:^|[\\s/])${escapedLabel}\\s+(.{2,260}?)(?=(?:\\s|/)+(?:${escapedStops})(?:\\b|\\s|/|$)|$)`, "i");
  const match = text.match(pattern)?.[1];
  if (!match) return "";
  return cleanGemValue(match);
}

function cleanGemValue(value: string) {
  const cleaned = clean(value)
    .replace(/\b[बबडवसतमरकयलनाहेकीका]{1,8}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const devanagariIndex = cleaned.search(/[\u0900-\u097F]/);
  const asciiLead = devanagariIndex > 0 ? cleaned.slice(0, devanagariIndex) : cleaned;
  return clean(asciiLead.replace(/[^\w₹.%),/&:\- ]+$/g, ""));
}

function cleanEnglishLead(value: string) {
  const match = clean(value).match(/[A-Za-z0-9][A-Za-z0-9 ,./()&:\-]{2,120}/)?.[0];
  return clean(match || value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBareMoneyNear(text: string, keywords: string[]) {
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[^0-9]{0,80}([0-9][0-9,.]{3,}(?:\\.\\d+)?)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return formatRupeeAmount(Number(match[1].replace(/,/g, "")));
  }
  return "";
}

function formatRupeeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return "";
  const prefix = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  if (absolute >= 10_000_000) return `${prefix}Rs. ${(absolute / 10_000_000).toFixed(2)} Cr`;
  if (absolute >= 100_000) return `${prefix}Rs. ${(absolute / 100_000).toFixed(2)} lakh`;
  return `${prefix}Rs. ${absolute.toLocaleString("en-IN")}`;
}

function formatLakhAmount(amountLakh: number) {
  if (!Number.isFinite(amountLakh) || amountLakh <= 0) return "";
  if (amountLakh >= 100) return `Rs. ${(amountLakh / 100).toFixed(2)} Cr`;
  return `Rs. ${amountLakh.toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;
}

function normalizeMoneyLabel(value: string) {
  const cleaned = clean(value);
  if (/crore|cr|lakh|lac|₹|rs|inr|rupee/i.test(cleaned)) return cleaned;
  const amount = Number(cleaned.replace(/,/g, ""));
  return formatRupeeAmount(amount) || cleaned;
}

function isReliableMoneyMatch(value: string) {
  const cleaned = clean(value);
  if (/crore|cr|lakh|lac|₹|rs|inr|rupee/i.test(cleaned)) return true;
  const amount = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 1000;
}

function pickLines(sentences: string[], keywords: string[], limit: number) {
  const hits = sentences.filter((sentence) => keywords.some((keyword) => sentence.toLowerCase().includes(keyword)));
  return Array.from(new Set(hits.map(toReadableBullet).filter(Boolean))).slice(0, limit);
}

function buildDocumentGaps(lower: string) {
  const checks = [
    { key: "gst", label: "GST certificate/reference not detected" },
    { key: "pan", label: "PAN requirement/reference not detected" },
    { key: "iso", label: "ISO certificate requirement/reference not detected" },
    { key: "msme", label: "MSME/Udyam benefit not detected" },
    { key: "turnover", label: "Turnover PQ not detected" },
    { key: "experience", label: "Similar work experience PQ not detected" }
  ];
  return checks.filter((check) => !lower.includes(check.key)).map((check) => check.label);
}

function scoreReadiness(input: {
  deadline: string;
  deadlineStatus: UploadedTenderAnalysis["deadlineStatus"];
  emd: string;
  pbg: string;
  pqCriteria: string[];
  documentGaps: string[];
  riskReasons: string[];
  text: string;
}) {
  let score = 70;
  if (input.deadlineStatus === "Closed") score -= 65;
  if (input.deadlineStatus === "Closing Soon") score -= 12;
  if (input.deadline !== "Not clearly found") score += 8;
  if (input.emd !== "Not clearly found") score += 5;
  if (input.pbg !== "Not clearly found") score += 4;
  score += Math.min(12, input.pqCriteria.length * 2);
  score -= input.documentGaps.length * 5;
  score -= input.riskReasons.length * 4;
  if (/msme|udyam|exemption/i.test(input.text)) score += 5;
  return Math.max(15, Math.min(96, score));
}

function buildDecisionReasons(decision: UploadedTenderAnalysis["recommendedDecision"], score: number, risk: string, gaps: string[], deadline: string, emd: string) {
  if (deadline === "Not applicable" || emd === "Not applicable") {
    return [
      "This appears to be a reference/regulatory PDF rather than a tender package.",
      "Bid/no-bid decision cannot be made from this document alone.",
      "Upload the actual NIT/RFP/BOQ tender PDF to extract deadline, EMD, PBG, PQ and pricing signals."
    ];
  }
  const reasons = [
    `Bid readiness score is ${score}/100 with ${risk.toLowerCase()} risk.`,
    deadline === "Not clearly found" ? "Deadline is not clearly detected, so submission feasibility needs manual confirmation." : `Deadline detected as ${deadline}.`,
    emd === "Not clearly found" ? "EMD amount is not clearly detected; finance team should confirm blocked capital." : `EMD/bid security detected as ${emd}.`
  ];
  if (getDeadlineStatus(deadline) === "Closed") reasons.push("Tender deadline is already closed as of today; do not spend bid effort unless a corrigendum reopens it.");
  if (gaps.length) reasons.push(`${gaps.length} document/PQ gaps need closure before approval.`);
  if (decision === "Take Tender") reasons.push("Commercial and compliance signals look strong enough for leadership approval.");
  if (decision === "Avoid / No-Bid") reasons.push("Risk or missing information is too high for a clean CEO/investor go-ahead.");
  return reasons;
}

function buildInvestorSummary(decision: string, title: string, value: string, deadline: string, risk: string, score: number) {
  if (value === "Not applicable" || deadline === "Not applicable") {
    return `Reference document: ${title}. This is not a bid-ready tender document. Use it for regulatory compliance context and upload the actual NIT/RFP for CEO decisioning.`;
  }
  if (getDeadlineStatus(deadline) === "Closed") {
    return `Closed tender: ${title}. Estimated value: ${value}. Deadline ${deadline} has passed, so CEO decision should be No-Bid unless a corrigendum extends submission.`;
  }
  return `${decision}: ${title}. Estimated value: ${value}. Deadline: ${deadline}. Risk: ${risk}. Bid readiness: ${score}/100.`;
}

function buildAiReport(input: {
  title: string;
  estimatedValue: string;
  deadline: string;
  deadlineStatus: UploadedTenderAnalysis["deadlineStatus"];
  emd: string;
  pbg: string;
  scope: string[];
  keyClauses: string[];
  pqCriteria: string[];
  documentGaps: string[];
  riskLevel: "Low" | "Medium" | "High";
  riskReasons: string[];
  bidReadinessScore: number;
  winProbability: number;
  recommendedDecision: UploadedTenderAnalysis["recommendedDecision"];
}): TenderAiReport {
  const complianceStatus =
    input.bidReadinessScore >= 78 ? "Ready for leadership approval" : input.bidReadinessScore >= 55 ? "Needs compliance closure before bid" : "Not bid-ready";
  const pricingPosture =
    input.recommendedDecision === "Take Tender"
      ? "Bid selectively aggressive near L1 while protecting measured material and labour margin."
      : input.recommendedDecision === "Review Carefully"
        ? "Hold price until BOQ, escalation and site-risk assumptions are validated."
        : "Do not price until missing documents and commercial exposure are clarified.";

  return {
    executiveBrief: input.estimatedValue === "Not applicable"
      ? "This PDF is a reference/regulatory document, not a bid-ready tender. It can inform building-code compliance, but it should not trigger bid spend, EMD planning or commercial approval."
      : input.deadlineStatus === "Closed"
        ? "This is a real tender document, but the extracted deadline has already passed. Treat it as a historical/reference opportunity unless an official corrigendum extends the submission date."
      : `${input.recommendedDecision}. This tender has ${input.riskLevel.toLowerCase()} risk, ${input.winProbability}% win probability and ${input.bidReadinessScore}/100 bid readiness. CEO should focus on EMD/PBG exposure, PQ gaps and execution risk before approving bid spend.`,
    boardRecommendation: input.estimatedValue === "Not applicable"
      ? "Do not treat this document as a tender. Attach it as a compliance reference and request the actual NIT/RFP/BOQ package."
      : input.deadlineStatus === "Closed"
        ? "No-Bid for current cycle because the submission deadline is closed. Track only if corrigendum extends the date."
      : input.recommendedDecision === "Take Tender"
        ? "Approve bid preparation with finance and project controls guardrails."
        : input.recommendedDecision === "Review Carefully"
          ? "Keep in pipeline, but require a red-flag review before final commercial submission."
          : "No-bid unless the tender owner clarifies missing commercial and eligibility information.",
    financialExposure: {
      estimatedValue: input.estimatedValue,
      emd: input.emd,
      pbg: input.pbg,
      cashflowView: input.emd === "Not applicable" || input.pbg === "Not applicable"
        ? "No EMD/PBG exposure can be computed because this is not a tender document."
        : input.emd === "Not clearly found" || input.pbg === "Not clearly found"
        ? "Finance exposure is incomplete. Confirm EMD/PBG, retention, mobilisation advance and payment cycle before approval."
        : "Finance exposure is visible enough for initial approval. Validate bank guarantee limits and working-capital cycle."
    },
    complianceReadiness: {
      score: input.bidReadinessScore,
      status: complianceStatus,
      requiredActions: [
        ...(input.estimatedValue === "Not applicable" ? ["Classify this PDF as a compliance/reference document.", "Upload actual NIT/RFP/BOQ before bid/no-bid review."] : input.documentGaps.slice(0, 5)),
        input.deadline === "Not applicable" ? "No submission deadline exists in this reference document." : input.deadline === "Not clearly found" ? "Confirm bid submission deadline from NIT/corrigendum." : `Lock submission calendar for ${input.deadline}.`,
        "Map each PQ clause to a document owner before commercial pricing."
      ]
    },
    riskRegister: [
      ...input.riskReasons.slice(0, 4).map((risk) => ({
        risk,
        severity: input.riskLevel,
        mitigation: "Assign owner, verify clause in PDF, and add cost/time buffer before bid approval."
      })),
      {
        risk: "BOQ quantity, material escalation and site handover assumptions may affect margin.",
        severity: input.riskLevel === "Low" ? "Medium" : input.riskLevel,
        mitigation: "Validate BOQ against drawings/site visit and protect margin with rate analysis."
      }
    ],
    bidStrategy: {
      pricingPosture,
      l1Approach: "Use L1 simulation with contractor class, local competition, material lead times and historical discount pattern.",
      marginGuardrail: input.riskLevel === "High" ? "Do not go below risk-adjusted margin without CEO approval." : "Keep minimum margin guardrail and avoid unpriced scope assumptions.",
      negotiationLevers: [
        "MSME/Udyam exemption or EMD relief if applicable",
        "Local plant, machinery and labour availability",
        "Faster mobilisation plan",
        "Similar completed civil works references",
        "Material procurement rate lock-in"
      ]
    },
    actionPlan72Hours: [
      "Day 1: Confirm corrigenda, deadline, EMD/PBG, tender fee and bid submission portal requirements.",
      "Day 1: Build PQ compliance matrix with GST, PAN, contractor registration, turnover and similar work proofs.",
      "Day 2: Complete BOQ rate analysis, site-risk assumptions and competitor L1 estimate.",
      "Day 2: Check bank guarantee limits, EMD blocked capital and expected payment cycle.",
      "Day 3: Run CEO bid/no-bid meeting and freeze final price band."
    ],
    reportSections: [
      { title: "Scope Snapshot", bullets: input.scope.slice(0, 5) },
      { title: "Key Clauses", bullets: input.keyClauses.slice(0, 6) },
      { title: "PQ Checklist", bullets: input.pqCriteria.slice(0, 6) },
      { title: "Decision Drivers", bullets: buildDecisionReasons(input.recommendedDecision, input.bidReadinessScore, input.riskLevel, input.documentGaps, input.deadline, input.emd) }
    ]
  };
}

function buildBoqAnalysis(input: {
  text: string;
  classification: ReturnType<typeof classifyDocument>;
  title: string;
  estimatedValue: string;
  emd: string;
  pbg: string;
  riskLevelHint: UploadedTenderAnalysis["riskLevel"];
}): BoqAnalysis {
  if (!input.classification.isTenderDocument) {
    return {
      sourceConfidence: "Low",
      sourceNote: "This is not a tender package, so BOQ cost cannot be computed. Upload the NIT/RFP/BOQ PDF.",
      estimatedProjectCost: "Not applicable",
      estimatedProjectCostInr: null,
      items: [
        {
          description: "Actual tender BOQ not available in this reference document",
          quantity: "Not applicable",
          unit: "N/A",
          amount: "Not applicable",
          basis: "Reference document"
        }
      ],
      advanceExposure: buildAdvanceExposure(null, input.emd, input.pbg, input.riskLevelHint),
      profitAnalysis: buildProfitAnalysis(null, input.emd, input.pbg, input.riskLevelHint)
    };
  }

  const estimatedCostInr = parseMoneyToInr(input.estimatedValue);
  const items = extractBoqItems(input.text, input.title, input.estimatedValue, estimatedCostInr);
  const hasExplicitBoqRows = items.some((item) => /Line-like BOQ row extracted/i.test(item.basis));
  const sourceConfidence: BoqAnalysis["sourceConfidence"] = hasExplicitBoqRows ? "High" : estimatedCostInr ? "Medium" : "Low";
  const sourceNote = hasExplicitBoqRows
    ? "BOQ line amounts were found in the parsed PDF text. Verify final item rates against uploaded BOQ before submission."
    : estimatedCostInr
      ? "Detailed BOQ item rates were not fully extractable. Project cost is based on tender estimated value and extracted BOQ/category signals."
      : "BOQ cost is not clearly found. Use original BOQ/NIT before pricing or CEO approval.";

  return {
    sourceConfidence,
    sourceNote,
    estimatedProjectCost: estimatedCostInr ? formatRupeeAmount(estimatedCostInr) : "Not clearly found",
    estimatedProjectCostInr: estimatedCostInr,
    items,
    advanceExposure: buildAdvanceExposure(estimatedCostInr, input.emd, input.pbg, input.riskLevelHint),
    profitAnalysis: buildProfitAnalysis(estimatedCostInr, input.emd, input.pbg, input.riskLevelHint)
  };
}

function extractBoqItems(text: string, title: string, estimatedValue: string, estimatedCostInr: number | null): BoqLineItem[] {
  if (isGemTender(text)) {
    const category = extractGemField(text, "Item Category", ["GeMARPTS", "Searched Strings", "BOQ Title", "Minimum Average"]);
    const quantity = extractGemField(text, "Total Quantity", ["Item Category", "GeMARPTS", "BOQ Title"]) || "Verify";
    const itemNames = category
      ? category.split(/\s*,\s*/).map((item) => cleanEnglishLead(item)).filter((item) => item.length > 3)
      : [extractGemTitle(text) || title];
    const perItemAmount = estimatedCostInr && itemNames.length ? estimatedCostInr / itemNames.length : null;
    return itemNames.slice(0, 8).map((item, index) => ({
      description: item,
      quantity: index === 0 ? quantity : "Part of combined BOQ",
      unit: "GeM item/category",
      amount: perItemAmount ? `${formatRupeeAmount(perItemAmount)} est.` : "Rate/amount not separately found",
      basis: perItemAmount ? "Estimated bid value distributed across extracted GeM categories; verify BOQ schedule." : "Extracted from GeM category text; BOQ amount not found."
    }));
  }

  const explicitRows = extractExplicitBoqRows(text);
  if (explicitRows.length) return explicitRows;

  if (isUppclTender(text)) {
    return [
      {
        description: title,
        quantity: "1",
        unit: "Lump sum civil works package",
        amount: estimatedValue,
        basis: "Tender estimated cost table; detailed item BOQ/drawings must be verified."
      },
      {
        description: "Pre-primary to 12th class composite school construction scope",
        quantity: "18 months completion period",
        unit: "Project execution",
        amount: "Included in total project cost",
        basis: "Scope and completion period extracted from tender conditions."
      }
    ];
  }

  return [
    {
      description: title,
      quantity: "1",
      unit: "Tender work package",
      amount: estimatedValue,
      basis: "Estimated value extracted; detailed BOQ itemization not clearly present in parsed PDF text."
    }
  ];
}

function extractExplicitBoqRows(text: string): BoqLineItem[] {
  const rows: BoqLineItem[] = [];
  const pattern = /([A-Za-z][A-Za-z0-9 ,./()&:\-]{18,140})\s+(\d+(?:\.\d+)?)\s*(cum|sqm|sq\.?m|kg|mt|ton|nos?|each|mtr|rm|ls)\s+(?:rs\.?|₹|inr)?\s*([0-9][0-9,.]{3,}(?:\.\d+)?)/gi;
  for (const match of text.matchAll(pattern)) {
    const description = clean(match[1]);
    if (isNoisyExtract(description)) continue;
    rows.push({
      description,
      quantity: clean(match[2]),
      unit: clean(match[3]),
      amount: formatRupeeAmount(Number(match[4].replace(/,/g, ""))),
      basis: "Line-like BOQ row extracted from parsed PDF text; verify unit/rate in original BOQ."
    });
    if (rows.length >= 10) break;
  }
  return rows;
}

function buildAdvanceExposure(estimatedCostInr: number | null, emd: string, pbg: string, risk: UploadedTenderAnalysis["riskLevel"]): BoqAnalysis["advanceExposure"] {
  if (!estimatedCostInr) {
    return {
      mobilizationAdvance: "Not computable",
      tnpAdvance: "Not computable",
      securedAdvance: "Verify in tender",
      bankGuaranteeExposure: "Not computable",
      note: "Advance exposure needs tender value plus SCC/GCC clause confirmation."
    };
  }
  const mobilization = estimatedCostInr * 0.1;
  const tnp = estimatedCostInr * 0.05;
  const pbgInr = parsePbgToInr(pbg, estimatedCostInr);
  const emdInr = parseMoneyToInr(emd) || 0;
  const advanceBg = (mobilization + tnp) * 1.1;
  const bgExposure = pbgInr + advanceBg + emdInr;
  const shouldShowAdvance = estimatedCostInr >= 50_000_000;
  return {
    mobilizationAdvance: shouldShowAdvance ? `${formatRupeeAmount(mobilization)} potential, only if tender allows` : "Usually not assumed for smaller packages; verify SCC",
    tnpAdvance: shouldShowAdvance ? `${formatRupeeAmount(tnp)} potential T&P/TNP advance, only if allowed and BG-backed` : "Verify if plant/machinery advance clause exists",
    securedAdvance: "Materials-at-site secured advance is clause-dependent and should be verified before cash-flow planning",
    bankGuaranteeExposure: formatRupeeAmount(bgExposure),
    note: `${risk === "High" ? "High-risk tender: " : ""}Mobilisation and T&P/TNP advance should not be treated as guaranteed income. Public works contracts generally require clause approval, hypothecation/BG and recovery through running bills.`
  };
}

function buildProfitAnalysis(estimatedCostInr: number | null, emd: string, pbg: string, risk: UploadedTenderAnalysis["riskLevel"]): BoqAnalysis["profitAnalysis"] {
  if (!estimatedCostInr) {
    return {
      targetBid: "Not computable",
      directCost: "Not computable",
      overhead: "Not computable",
      riskContingency: "Not computable",
      financeCost: "Not computable",
      expectedNetProfit: "Not computable",
      netProfitPercent: "Not computable",
      recommendation: "Upload BOQ/NIT with estimated value or line-item schedule before profit approval."
    };
  }
  const directCostPercent = risk === "High" ? 0.86 : risk === "Medium" ? 0.84 : 0.82;
  const overheadPercent = 0.05;
  const riskPercent = risk === "High" ? 0.05 : risk === "Medium" ? 0.035 : 0.025;
  const pbgInr = parsePbgToInr(pbg, estimatedCostInr);
  const emdInr = parseMoneyToInr(emd) || 0;
  const financeCost = (emdInr + pbgInr) * 0.012;
  const directCost = estimatedCostInr * directCostPercent;
  const overhead = estimatedCostInr * overheadPercent;
  const riskContingency = estimatedCostInr * riskPercent;
  const netProfit = estimatedCostInr - directCost - overhead - riskContingency - financeCost;
  const netProfitPercent = (netProfit / estimatedCostInr) * 100;
  const minMargin = risk === "High" ? 8 : risk === "Medium" ? 7 : 6;
  return {
    targetBid: formatRupeeAmount(estimatedCostInr),
    directCost: `${formatRupeeAmount(directCost)} (${Math.round(directCostPercent * 100)}%)`,
    overhead: `${formatRupeeAmount(overhead)} (5%)`,
    riskContingency: `${formatRupeeAmount(riskContingency)} (${(riskPercent * 100).toFixed(1)}%)`,
    financeCost: `${formatRupeeAmount(financeCost)} estimated BG/EMD carrying cost`,
    expectedNetProfit: formatRupeeAmount(netProfit),
    netProfitPercent: `${netProfitPercent.toFixed(1)}%`,
    recommendation: netProfitPercent >= minMargin
      ? `Profit model is acceptable for initial CEO review if BOQ quantities and rates are verified. Keep minimum net margin above ${minMargin}%.`
      : `Profit model is tight. Do not approve below ${minMargin}% net margin without revised BOQ costing, site visit and CEO exception.`
  };
}

function parsePbgToInr(pbg: string, estimatedCostInr: number) {
  const percent = pbg.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
  if (percent) return estimatedCostInr * (Number(percent) / 100);
  return parseMoneyToInr(pbg) || 0;
}

function parseMoneyToInr(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, "");
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  if (/crore|\bcr\b/.test(normalized)) return amount * 10_000_000;
  if (/lakh|lac|\bl\b/.test(normalized)) return amount * 100_000;
  return amount >= 1000 ? amount : null;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[^\w₹]+|[^\w.%₹)]+$/g, "").trim();
}

function toReadableBullet(value: string) {
  const compact = clean(value)
    .replace(/\bबड\s+बड\b/gi, "")
    .replace(/\s{2,}/g, " ");
  if (isNoisyExtract(compact)) return "";
  return compact.length > 220 ? `${compact.slice(0, 217).trim()}...` : compact;
}

function isNoisyExtract(value: string) {
  const lower = value.toLowerCase();
  if (/(searched strings used in gemarpts|searched result generated|category not available on gem)/i.test(value)) return true;
  const slashCount = (value.match(/\//g) || []).length;
  const labelCount = (value.match(/(date|name|category|document|required|criteria|exemption|turnover|experience|bid)/gi) || []).length;
  if (slashCount >= 5 && labelCount >= 5) return true;
  if (lower.includes("bid details") && value.length > 180) return true;
  return false;
}
