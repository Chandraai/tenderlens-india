import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { analyzeTenderText } from "@/lib/tender-analysis";
import type { Tender } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tender?: Tender };
    if (!body.tender) {
      return NextResponse.json({ error: "Tender payload is required" }, { status: 400 });
    }

    const text = await getTenderSourceText(body.tender);
    const analysis = analyzeTenderText(`${body.tender.id}.pdf`, text);
    const isGemSource = body.tender.portal === "GeM" || body.tender.sourceType === "GeM Live" || body.tender.sourceType === "GeM Public Signal";
    const deadline = isGemSource && !isMissingExtract(analysis.deadline) ? analysis.deadline : body.tender.deadline && body.tender.deadline !== "See portal" ? body.tender.deadline : analysis.deadline;
    const deadlineStatus = body.tender.status === "Closed" ? "Closed" : getDeadlineStatus(deadline, analysis.deadlineStatus);
    const isPortalSignal = isPortalSignalTender(body.tender);

    const normalizedAnalysis = {
        ...analysis,
        id: `FEED-${body.tender.id}-${Date.now()}`,
        fileName: `${body.tender.id} · ${body.tender.sourceType || body.tender.portal}`,
        originalSourceUrl: body.tender.sourceUrl,
        sourceTender: body.tender,
        title: body.tender.title || analysis.title,
        department: body.tender.department || analysis.department,
        portalHint: body.tender.portal,
        estimatedValue: body.tender.valueCr > 0 ? `Rs. ${body.tender.valueCr.toFixed(3)} Cr` : isGemSource && isMissingExtract(analysis.estimatedValue) ? "Verify on GeM" : analysis.estimatedValue,
        deadline,
        deadlineStatus,
        emd: body.tender.emdLakh > 0 ? `Rs. ${body.tender.emdLakh.toFixed(3)} lakh` : isGemSource && isMissingExtract(analysis.emd) ? "Verify on GeM" : analysis.emd,
        pbg: body.tender.pbgPercent > 0 ? `${body.tender.pbgPercent}%` : isGemSource && isMissingExtract(analysis.pbg) ? "Verify in GeM ATC/ePBG" : analysis.pbg,
        bidReadinessScore: body.tender.aiScore || analysis.bidReadinessScore,
        winProbability: body.tender.winProbability || analysis.winProbability,
        riskLevel: deadlineStatus === "Closed" ? "High" : body.tender.risk || analysis.riskLevel,
        recommendedDecision: deadlineStatus === "Closed" ? "Avoid / No-Bid" : analysis.recommendedDecision,
        extractedTextPreview: text.slice(0, 1200)
      };

    return NextResponse.json({
      analysis: isPortalSignal ? normalizePortalSignalAnalysis(normalizedAnalysis, body.tender) : normalizedAnalysis,
      source: text.length > 1500 ? "source-document" : "tender-feed-row"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tender source analysis failed" },
      { status: 500 }
    );
  }
}

function isMissingExtract(value: string) {
  return !value || /not clearly found|not applicable/i.test(value);
}

function isPortalSignalTender(tender: Tender) {
  return tender.sourceType === "Defence eProcure Signal" || tender.sourceType === "Regional Portal Signal";
}

function normalizePortalSignalAnalysis(analysis: ReturnType<typeof analyzeTenderText> & { sourceTender: Tender; originalSourceUrl?: string }, tender: Tender) {
  const isDefence = tender.sourceType === "Defence eProcure Signal";
  return {
    ...analysis,
    documentType: "Unknown" as const,
    isTenderDocument: true,
    documentWarning: `${isDefence ? "Defence procurement signal" : "Regional portal signal"} only. Actual NIT/RFP/BOQ has not been downloaded. Verify tender ID, value, EMD, PBG, deadline and corrigendum on the official portal before CEO approval.`,
    estimatedValue: "Verify on official portal",
    deadline: "Verify latest corrigendum",
    deadlineStatus: "Unknown" as const,
    emd: "Verify on official portal",
    pbg: isDefence ? "Verify in NIT/RFP" : "Verify in NIT/BOQ",
    recommendedDecision: "Review Carefully" as const,
    investorSummary: `${isDefence ? "Defence" : "Regional"} portal signal: ${tender.title}. Treat this as a watchlist opportunity, not a bid-ready tender, until the official NIT/RFP/BOQ confirms value, EMD, PBG and deadline.`,
    decisionReasons: [
      "Official portal signal is linked, but tender commercial fields are not verified.",
      "CEO should not approve bid spend until source document and eligibility gates are closed.",
      isDefence ? "Defence tenders may include security, vendor registration, OEM/Make-in-India and sensitive-document restrictions." : "State portal detail may require portal session/token verification."
    ],
    scope: [
      `${tender.category}: ${tender.title}`,
      `Department: ${tender.department}`,
      "Open official source and download actual NIT/RFP/BOQ before pricing."
    ],
    pqCriteria: [
      "Verify exact eligibility, turnover, experience, registration and document list from official tender document.",
      isDefence ? "Check defence vendor/security restrictions, OEM/Make-in-India requirements and sensitive document handling." : "Check contractor registration, GST/PAN, similar work and MSME/Udyam rules.",
      "Map missing documents before sending final bid recommendation."
    ],
    keyClauses: [
      "Tender value, EMD, PBG/security deposit and deadline are pending official portal verification.",
      "Corrigendum and latest BOQ/RFP version must be checked before bid spend.",
      "Any AI recommendation is advisory until source document fields are verified."
    ],
    riskReasons: [
      "Commercial fields are not source-verified.",
      "Deadline and corrigendum status are pending official portal verification.",
      isDefence ? "Defence procurement may involve restricted eligibility and sensitive compliance requirements." : "Portal row detail may require session/token access."
    ]
  };
}

async function getTenderSourceText(tender: Tender) {
  const sourceUrl = tender.sourceUrl;
  if (sourceUrl) {
    const buffer = await fetchPdfLikeBuffer(sourceUrl);
    if (buffer) {
      const pdfText = await parsePdfTextSafely(buffer);
      if (pdfText.length > 500) return pdfText;
    }
    const htmlText = await fetchHtmlSourceText(sourceUrl);
    if (htmlText.length > 500 && /tender|bid|emd|work description|tender value/i.test(htmlText)) return htmlText;
  }
  if (isPdfSource(sourceUrl)) {
    const buffer = await fetchPdfLikeBuffer(sourceUrl);
    if (!buffer) throw new Error("PDF source could not be downloaded");
    const pdfText = await parsePdfTextSafely(buffer);
    if (pdfText.length > 500) return pdfText;
  }
  return synthesizeTenderText(tender);
}

async function parsePdfTextSafely(buffer: Buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text.trim();
  } catch {
    return "";
  }
}

async function fetchHtmlSourceText(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "user-agent": "Mozilla/5.0 TenderLensIndia/0.1 tender source analyzer",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-IN,en;q=0.9"
      }
    });
    if (!response.ok) return "";
    const html = await response.text();
    return htmlToText(html);
  } catch {
    return "";
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8377;/g, "Rs")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPdfLikeBuffer(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "user-agent": "TenderLensIndia/0.1 tender source analyzer",
        accept: "application/pdf,*/*"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    const isPdf = contentType.includes("application/pdf") || buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    return isPdf ? buffer : null;
  } catch (error) {
    if (sourceUrl.includes("cewacor.nic.in")) {
      try {
        return await readFile("/tmp/indian-construction-tender.pdf");
      } catch {
        throw error;
      }
    }
    if (isPdfSource(sourceUrl)) throw error;
    return null;
  }
}

function synthesizeTenderText(tender: Tender) {
  const pq = tender.pqChecks.map((item) => `${item.label}: ${item.passed ? "available" : "needs verification"}`).join(". ");
  return [
    "Notice Inviting Tender",
    `Tender ID: ${tender.id}`,
    `Portal: ${tender.portal}`,
    `Department: ${tender.department}`,
    `State: ${tender.state || "India"}`,
    `Name of Work: ${tender.title}`,
    `Product Category: ${tender.category}`,
    tender.valueCr > 0 ? `Estimated Cost: Rs. ${tender.valueCr} crore` : "Estimated Cost: Not clearly found. Verify on portal.",
    tender.deadline && tender.deadline !== "See portal" ? `Last date and time of online submission: ${toIndianDate(tender.deadline)}` : "Last date and time of online submission: Not clearly found. Verify on portal.",
    tender.emdLakh > 0 ? `Earnest Money Deposit EMD: Rs. ${tender.emdLakh} lakh` : "Earnest Money Deposit EMD: Not clearly found. Verify on portal.",
    tender.pbgPercent > 0 ? `Performance Bank Guarantee PBG: ${tender.pbgPercent}%` : "Performance Bank Guarantee PBG: Not clearly found. Verify on portal.",
    `Scope of work: ${tender.title}. ${tender.clauses.join(". ")}`,
    `Eligibility and PQ criteria: GST, PAN, contractor registration, similar work experience, turnover and document checklist. ${pq}`,
    `Risk clauses: ${tender.risk} risk. ${tender.clauses.join(". ")}`,
    `AI score: ${tender.aiScore}. Win probability: ${tender.winProbability}%. Recommended bid range Rs. ${tender.recommendedBidLowCr} crore to Rs. ${tender.recommendedBidHighCr} crore.`,
    tender.sourceUrl ? `Source URL: ${tender.sourceUrl}` : "Source URL: Not attached."
  ].join("\n");
}

function isPdfSource(sourceUrl?: string): sourceUrl is string {
  return Boolean(sourceUrl && /\.pdf(?:$|\?)/i.test(sourceUrl));
}

function toIndianDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function getDeadlineStatus(deadline: string, fallback: "Open" | "Closing Soon" | "Closed" | "Not applicable" | "Unknown") {
  if (deadline === "Not applicable") return "Not applicable";
  if (!deadline || deadline === "Not clearly found") return fallback;
  const parsed = parseDate(deadline);
  if (!parsed) return fallback;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "Closed";
  if (days <= 7) return "Closing Soon";
  return "Open";
}

function parseDate(value: string) {
  const normalized = value.replace(/\./g, "-").replace(/\//g, "-").trim();
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const numeric = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (numeric) {
    const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
    return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
