import { PDFParse } from "pdf-parse";
import { readFile } from "fs/promises";
import { tenders as curatedTenders } from "@/lib/data";
import { syncDefencePortal } from "@/lib/integrations/defence-portal";
import { syncGeMPortal } from "@/lib/integrations/gem-portal";
import { syncRegionalPortals } from "@/lib/integrations/regional-portals";
import { syncUpPortal } from "@/lib/integrations/up-portal";
import { analyzeTenderText } from "@/lib/tender-analysis";
import type { Tender } from "@/lib/types";

const cwcTenderPdfUrl =
  "https://cewacor.nic.in/Document/2026/March/Work_Documents/Applicant_Recno1/TenderDoc56T1_a7d6a946-ef09-46e2-8c19-6f46d7a27745.pdf";

export async function getLiveTenderFeed() {
  const warnings: string[] = [];
  const liveRows: Tender[] = [];

  const upSyncPromise = syncUpPortal().catch((error) => {
    warnings.push(`UP eTender sync failed: ${error instanceof Error ? error.message : "unknown"}`);
    return null;
  });
  const cwcTenderPromise = fetchPublicPdfTender().catch((error) => {
    warnings.push(`Public CWC PDF tender parse failed: ${error instanceof Error ? error.message : "unknown"}`);
    return null;
  });
  const gemSyncPromise = syncGeMPortal().catch((error) => {
    warnings.push(`GeM sync failed: ${error instanceof Error ? error.message : "unknown"}`);
    return null;
  });
  const regionalSyncPromise = syncRegionalPortals().catch((error) => {
    warnings.push(`Regional MP/Delhi NCR sync failed: ${error instanceof Error ? error.message : "unknown"}`);
    return [];
  });
  const defenceSyncPromise = syncDefencePortal().catch((error) => {
    warnings.push(`Defence eProcure sync failed: ${error instanceof Error ? error.message : "unknown"}`);
    return null;
  });

  const [upSync, cwcTender, gemSync, regionalSyncs, defenceSync] = await Promise.all([upSyncPromise, cwcTenderPromise, gemSyncPromise, regionalSyncPromise, defenceSyncPromise]);

  if (upSync?.liveTenderSignals?.length) {
    liveRows.push(
      ...upSync.liveTenderSignals.map((signal): Tender => ({
        id: signal.tenderId,
        title: signal.title,
        portal: "State",
        state: "Uttar Pradesh",
        department: signal.organisation,
        category: signal.category || "Construction Works",
        valueCr: signal.valueCr || 0,
        deadline: signal.deadline || "See portal",
        emdLakh: signal.emdLakh || 0,
        pbgPercent: 0,
        aiScore: 64,
        status: isPastDeadline(signal.deadline) ? "Closed" : "Open",
        risk: "Medium",
        winProbability: 52,
        recommendedBidLowCr: signal.valueCr ? round(signal.valueCr * 0.94) : 0,
        recommendedBidHighCr: signal.valueCr ? round(signal.valueCr * 0.98) : 0,
        competitorEstimateCr: signal.valueCr ? round(signal.valueCr * 0.96) : 0,
        marginPercent: signal.valueCr ? 8.5 : 0,
        clauses: [
          "Live UP eTender source parsed",
          signal.location ? `Location: ${signal.location}` : "Open portal detail before bid spend",
          signal.periodDays ? `Period of work: ${signal.periodDays} days` : "Verify period of work",
          "Verify corrigendum, NIT and BOQ before bid spend"
        ],
        pqChecks: [
          { label: "Portal source reachable", passed: true },
          { label: "Tender value parsed", passed: Boolean(signal.valueCr) },
          { label: "EMD parsed", passed: Boolean(signal.emdLakh) }
        ],
        sourceUrl: signal.sourceUrl,
        sourceType: "UP eTender Live"
      }))
    );
  }

  if (cwcTender) liveRows.push(cwcTender);

  if (gemSync?.tenders?.length) {
    liveRows.push(...gemSync.tenders);
    warnings.push(...gemSync.sync.warnings);
  }
  if (regionalSyncs?.length) {
    for (const regionalSync of regionalSyncs) {
      liveRows.push(...regionalSync.tenders);
      warnings.push(...regionalSync.warnings);
    }
  }
  if (defenceSync?.tenders?.length) {
    liveRows.push(...defenceSync.tenders);
    warnings.push(...defenceSync.warnings);
  }

  const curatedRows: Tender[] = curatedTenders.map((tender) => ({
    ...tender,
    sourceType: (tender.sourceType || "Curated") as Tender["sourceType"]
  }));
  const merged = dedupeTenders([...liveRows, ...curatedRows]).map(normalizeDeadlineStatus);
  const openTenders = merged.filter((tender) => !isClosedTender(tender));
  const closedTenders = merged.filter(isClosedTender);
  return {
    tenders: openTenders,
    closedTenders,
    closedRows: closedTenders.length,
    liveRows: liveRows.filter((tender) => !isClosedTender(tender)).length,
    source: "live-normalized-feed",
    syncedAt: new Date().toISOString(),
    up: upSync
      ? {
          ok: upSync.ok,
          activeConstructionTenderCount: upSync.activeConstructionTenderCount,
          activeConstructionOrgCount: upSync.activeConstructionOrgCount
        }
      : null,
    gem: gemSync
      ? {
          ok: gemSync.sync.ok,
          publicRows: gemSync.sync.publicRows,
          totalMatched: gemSync.sync.totalMatched,
          mode: gemSync.sync.mode,
          sessionRequired: gemSync.sync.sessionRequired,
          credentialsRequired: gemSync.sync.credentialsRequired,
          source: gemSync.sync.source
        }
      : null,
    regional: regionalSyncs.map((sync) => ({
      ok: sync.ok,
      region: sync.region,
      parsedRows: sync.parsedRows,
      signalRows: sync.signalRows,
      source: sync.source
    })),
    defence: defenceSync
      ? {
          ok: defenceSync.ok,
          parsedRows: defenceSync.parsedRows,
          signalRows: defenceSync.signalRows,
          source: defenceSync.source
        }
      : null,
    warnings
  };
}

async function fetchPublicPdfTender(): Promise<Tender> {
  const buffer = await fetchPublicPdfBuffer();
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const analysis = analyzeTenderText("CWC-Lucknow-construction-tender.pdf", parsed.text);

  return {
    id: "CWC-RO-LKO-56T-2026",
    title: analysis.title,
    portal: "CPPP",
    state: "Uttar Pradesh",
    department: "Central Warehousing Corporation RO Lucknow",
    category: "Building Construction",
    valueCr: parseMoneyToCr(analysis.estimatedValue),
    deadline: normalizeDate(analysis.deadline),
    emdLakh: parseMoneyToLakh(analysis.emd),
    pbgPercent: parsePercent(analysis.pbg),
    aiScore: analysis.bidReadinessScore,
    status: analysis.deadlineStatus === "Closed" ? "Closed" : analysis.deadlineStatus === "Closing Soon" ? "Closing" : "Open",
    risk: analysis.riskLevel,
    winProbability: analysis.winProbability,
    recommendedBidLowCr: Math.max(0, parseMoneyToCr(analysis.estimatedValue) * 0.94),
    recommendedBidHighCr: Math.max(0, parseMoneyToCr(analysis.estimatedValue) * 0.98),
    competitorEstimateCr: Math.max(0, parseMoneyToCr(analysis.estimatedValue) * 0.96),
    marginPercent: analysis.deadlineStatus === "Closed" ? 0 : 8.5,
    clauses: analysis.keyClauses.slice(0, 4),
    pqChecks: [
      { label: "Tender PDF parsed", passed: true },
      { label: "Deadline open", passed: analysis.deadlineStatus !== "Closed" },
      { label: "GST/PAN PQ found", passed: analysis.pqCriteria.some((item) => /gst|pan/i.test(item)) }
    ],
    sourceUrl: cwcTenderPdfUrl,
    sourceType: "Public PDF"
  };
}

async function fetchPublicPdfBuffer() {
  try {
    const response = await fetch(cwcTenderPdfUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
      headers: {
        "user-agent": "TenderLensIndia/0.1 construction tender monitor",
        accept: "application/pdf,*/*"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    try {
      return await readFile("/tmp/indian-construction-tender.pdf");
    } catch {
      throw error;
    }
  }
}

function dedupeTenders(rows: Tender[]) {
  const map = new Map<string, Tender>();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, row);
  }
  return [...map.values()];
}

function isPastDeadline(deadline?: string) {
  if (!deadline) return false;
  const date = new Date(`${deadline}T23:59:59+05:30`);
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now();
}

function isClosedTender(tender: Tender) {
  return tender.status === "Closed" || isPastDeadline(tender.deadline);
}

function normalizeDeadlineStatus(tender: Tender): Tender {
  return isPastDeadline(tender.deadline)
    ? {
        ...tender,
        status: "Closed",
        marginPercent: 0
      }
    : tender;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function parseMoneyToCr(value: string) {
  if (!value || /not/i.test(value)) return 0;
  const number = extractMoneyNumber(value);
  if (!Number.isFinite(number)) return 0;
  if (/crore|cr/i.test(value)) return number;
  if (/lakh|lac/i.test(value)) return number / 100;
  return number / 10_000_000;
}

function parseMoneyToLakh(value: string) {
  if (!value || /not/i.test(value)) return 0;
  const number = extractMoneyNumber(value);
  if (!Number.isFinite(number)) return 0;
  if (/crore|cr/i.test(value)) return number * 100;
  if (/lakh|lac/i.test(value)) return number;
  if (number > 0 && number < 100 && !/₹|rs\.?|inr|,|rupee/i.test(value)) return number;
  return number / 100_000;
}

function extractMoneyNumber(value: string) {
  const match = value.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return 0;
  return Number(match[0].replace(/,/g, ""));
}

function parsePercent(value: string) {
  const number = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function normalizeDate(value: string) {
  if (!value || /not|applicable/i.test(value)) return "Not found";
  const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return value;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
