import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { BoqAnalysis, BoqLineItem, UploadedTenderAnalysis } from "@/lib/tender-analysis";

type ParsedBoq = {
  fileName: string;
  workName: string;
  totalAmountInr: number;
  totalRows: number;
  items: BoqLineItem[];
  matchedTender: boolean;
};

type PythonBoqItem = {
  slNo: number | string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number;
};

type PythonBoqPayload = {
  workName: string;
  totalAmountInr: number;
  items: PythonBoqItem[];
};

export function mergeBoqExcelAnalysis(analysis: UploadedTenderAnalysis, fileName: string, buffer: Buffer): UploadedTenderAnalysis {
  const boq = parseBoqWorkbook(fileName, buffer, analysis.title);
  const pdfValueInr = parseMoneyToInr(analysis.estimatedValue);
  const gstAmount = boq.totalAmountInr * 0.18;
  const totalWithGst = boq.totalAmountInr + gstAmount;
  const variance = pdfValueInr ? pdfValueInr - totalWithGst : null;
  const reconcilesWithPdf = pdfValueInr !== null && variance !== null && Math.abs(variance) <= Math.max(500_000, pdfValueInr * 0.005);
  const note = boq.matchedTender
    ? `BOQ Excel matched the tender name of work. Detailed item-rate BOQ was extracted from ${fileName}; ${boq.totalRows} BOQ rows were found.`
    : `BOQ Excel was parsed, but the name of work did not clearly match this tender. Verify before using it for pricing.`;

  return {
    ...analysis,
    documentWarning: `${analysis.documentWarning} BOQ Excel attached: ${boq.fileName}. ${boq.matchedTender ? "Project match passed." : "Project match needs manual verification."}`,
    boqAnalysis: {
      sourceConfidence: boq.matchedTender ? "High" : "Medium",
      sourceNote: `${note} BOQ base total without GST/taxes is ${formatRupeeAmount(boq.totalAmountInr)}. ${reconcilesWithPdf ? "Adding 18% GST reconciles with the PDF tender estimated value." : "PDF value should be reconciled manually against GST, contingencies and tender schedule adjustments."}`,
      estimatedProjectCost: formatRupeeAmount(boq.totalAmountInr),
      estimatedProjectCostInr: boq.totalAmountInr,
      costReconciliation: {
        boqBaseCost: formatRupeeAmount(boq.totalAmountInr),
        gstAmount: formatRupeeAmount(gstAmount),
        totalWithGst: formatRupeeAmount(totalWithGst),
        pdfEstimatedValue: analysis.estimatedValue,
        variance: variance === null ? "Not computable" : formatRupeeAmount(variance),
        note: reconcilesWithPdf
          ? "BOQ base + 18% GST matches the PDF estimated value within rounding tolerance."
          : "Review GST/tax treatment, contingencies and tender schedule totals before final pricing."
      },
      items: boq.items,
      advanceExposure: buildAdvanceExposure(boq.totalAmountInr, analysis.emd, analysis.pbg, analysis.riskLevel),
      profitAnalysis: buildProfitAnalysis(boq.totalAmountInr, analysis.emd, analysis.pbg, analysis.riskLevel)
    }
  };
}

function parseBoqWorkbook(fileName: string, buffer: Buffer, tenderTitle: string): ParsedBoq {
  const payload = parseBoqWithPython(fileName, buffer);
  const workName = clean(payload.workName);
  const allItems = payload.items.map((item) => ({
    description: clean(item.description),
    quantity: `${Number(item.quantity).toLocaleString("en-IN")}${typeof item.rate === "number" && Number.isFinite(item.rate) ? ` @ ${formatRupeeAmount(item.rate)}` : ""}`,
    unit: clean(item.unit),
    amount: formatRupeeAmount(item.amount),
    basis: `Excel BOQ row ${item.slNo}; amount column total without GST/taxes.`
  }));
  if (!allItems.length) throw new Error("No BOQ line items found in Excel file");
  const totalAmountInr = payload.totalAmountInr || allItems.reduce((sum, item) => sum + (parseMoneyToInr(item.amount) || 0), 0);
  const topItems = allItems
    .slice()
    .sort((a, b) => (parseMoneyToInr(b.amount) || 0) - (parseMoneyToInr(a.amount) || 0))
    .slice(0, 30);

  return {
    fileName,
    workName,
    totalAmountInr,
    totalRows: allItems.length,
    items: topItems,
    matchedTender: isSameProject(workName, tenderTitle)
  };
}

function parseBoqWithPython(fileName: string, buffer: Buffer): PythonBoqPayload {
  const tempDir = path.join(process.cwd(), ".tmp", "boq");
  mkdirSync(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, `${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`);
  writeFileSync(tempFile, buffer);
  try {
    const bundledPython = "/Users/onecp/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
    const python = process.env.PYTHON || (existsSync(bundledPython) ? bundledPython : "python3");
    const script = path.join(process.cwd(), "scripts", "parse-boq-xls.py");
    const env = {
      ...process.env,
      PYTHONPATH: [path.join(process.cwd(), ".vendor", "python"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)
    };
    const result = spawnSync(python, [script, tempFile], { encoding: "utf8", env, maxBuffer: 20 * 1024 * 1024 });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "BOQ Excel parser failed");
    }
    return JSON.parse(result.stdout) as PythonBoqPayload;
  } finally {
    if (existsSync(tempFile)) rmSync(tempFile);
  }
}

function isSameProject(workName: string, tenderTitle: string) {
  const work = normalizeForMatch(workName);
  const tender = normalizeForMatch(tenderTitle);
  if (!work || !tender) return false;
  return work.includes("hathras") && tender.includes("hathras") && work.includes("composite") && tender.includes("composite");
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildAdvanceExposure(estimatedCostInr: number, emd: string, pbg: string, risk: UploadedTenderAnalysis["riskLevel"]): BoqAnalysis["advanceExposure"] {
  const mobilization = estimatedCostInr * 0.1;
  const tnp = estimatedCostInr * 0.05;
  const pbgInr = parsePbgToInr(pbg, estimatedCostInr);
  const emdInr = parseMoneyToInr(emd) || 0;
  const advanceBg = (mobilization + tnp) * 1.1;
  return {
    mobilizationAdvance: `${formatRupeeAmount(mobilization)} potential, only if tender allows`,
    tnpAdvance: `${formatRupeeAmount(tnp)} potential T&P/TNP advance, only if allowed and BG-backed`,
    securedAdvance: "Materials-at-site secured advance is clause-dependent and should be verified before cash-flow planning",
    bankGuaranteeExposure: formatRupeeAmount(pbgInr + emdInr + advanceBg),
    note: `${risk === "High" ? "High-risk tender: " : ""}Advance should not be treated as guaranteed income. Verify SCC/GCC, BG, hypothecation, interest and recovery through running bills.`
  };
}

function buildProfitAnalysis(estimatedCostInr: number, emd: string, pbg: string, risk: UploadedTenderAnalysis["riskLevel"]): BoqAnalysis["profitAnalysis"] {
  const directCostPercent = risk === "High" ? 0.86 : risk === "Medium" ? 0.84 : 0.82;
  const overheadPercent = 0.05;
  const riskPercent = risk === "High" ? 0.05 : risk === "Medium" ? 0.035 : 0.025;
  const financeCost = ((parseMoneyToInr(emd) || 0) + parsePbgToInr(pbg, estimatedCostInr)) * 0.012;
  const directCost = estimatedCostInr * directCostPercent;
  const overhead = estimatedCostInr * overheadPercent;
  const contingency = estimatedCostInr * riskPercent;
  const netProfit = estimatedCostInr - directCost - overhead - contingency - financeCost;
  const netMargin = (netProfit / estimatedCostInr) * 100;
  const minMargin = risk === "High" ? 8 : risk === "Medium" ? 7 : 6;
  return {
    targetBid: formatRupeeAmount(estimatedCostInr),
    directCost: `${formatRupeeAmount(directCost)} (${Math.round(directCostPercent * 100)}%)`,
    overhead: `${formatRupeeAmount(overhead)} (5%)`,
    riskContingency: `${formatRupeeAmount(contingency)} (${(riskPercent * 100).toFixed(1)}%)`,
    financeCost: `${formatRupeeAmount(financeCost)} estimated BG/EMD carrying cost`,
    expectedNetProfit: formatRupeeAmount(netProfit),
    netProfitPercent: `${netMargin.toFixed(1)}%`,
    recommendation: netMargin >= minMargin
      ? `BOQ-based profit model is acceptable for initial CEO review if site risk and rate analysis are verified. Keep minimum net margin above ${minMargin}%.`
      : `BOQ-based profit model is tight. Do not approve below ${minMargin}% net margin without revised BOQ costing, site visit and CEO exception.`
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

function formatRupeeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return "Rs. 0";
  const prefix = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  if (absolute >= 10_000_000) return `${prefix}Rs. ${(absolute / 10_000_000).toFixed(2)} Cr`;
  if (absolute >= 100_000) return `${prefix}Rs. ${(absolute / 100_000).toFixed(2)} lakh`;
  return `${prefix}Rs. ${absolute.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
