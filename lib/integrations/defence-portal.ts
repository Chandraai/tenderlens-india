import type { Tender } from "@/lib/types";

const defprocUrl = "https://www.defproc.gov.in/nicgep/app?page=WebTenderStatusLists&service=page";
const currentMonth = "June 2026";

const defenceSegments = [
  {
    id: "MES",
    label: "Military Engineer Services",
    department: "E-IN-C Branch - Military Engineer Services",
    category: "MES Construction / Maintenance",
    title: "MES defence works monitor - buildings, roads, repairs and station maintenance"
  },
  {
    id: "DRDO",
    label: "DRDO",
    department: "Defence Research and Development Organisation",
    category: "DRDO Labs / Technical Procurement",
    title: "DRDO defence procurement monitor - labs, test facilities and technical supply"
  },
  {
    id: "ARMY",
    label: "Indian Army",
    department: "IHQ of MoD Army",
    category: "Army Procurement",
    title: "Army procurement monitor - stores, works, logistics and station requirements"
  },
  {
    id: "NAVY",
    label: "Indian Navy",
    department: "IHQ of MoD Navy",
    category: "Navy / Dockyard Works",
    title: "Navy procurement monitor - dockyard, base works and technical services"
  },
  {
    id: "AIRFORCE",
    label: "Indian Air Force",
    department: "IHQ of MoD Air Force",
    category: "Air Force Station Works",
    title: "Air Force procurement monitor - air station civil works and services"
  },
  {
    id: "DPSU",
    label: "Defence PSU",
    department: "Defence PSU / Shipyard / Ordnance ecosystem",
    category: "Defence PSU / Shipyard",
    title: "Defence PSU monitor - shipyard, ordnance, manufacturing and services"
  }
];

export type DefencePortalSync = {
  ok: boolean;
  syncedAt: string;
  source: string;
  parsedRows: number;
  signalRows: number;
  tenders: Tender[];
  warnings: string[];
};

export async function syncDefencePortal(): Promise<DefencePortalSync> {
  const warnings: string[] = [];
  const html = await fetchDefproc().catch((error) => {
    warnings.push(`DEFPROC active tender page unavailable without portal token/session: ${error instanceof Error ? error.message : "unknown error"}`);
    return "";
  });
  const parsedRows = parseDefenceRows(html);
  if (!parsedRows.length) warnings.push("DEFPROC did not expose row HTML to server fetch; showing all-India defence sector signals for this month.");
  const tenders = parsedRows.length ? parsedRows : buildDefenceSignals();
  return {
    ok: Boolean(tenders.length),
    syncedAt: new Date().toISOString(),
    source: defprocUrl,
    parsedRows: parsedRows.length,
    signalRows: parsedRows.length ? 0 : tenders.length,
    tenders,
    warnings
  };
}

async function fetchDefproc() {
  const response = await fetch(defprocUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-IN,en;q=0.9",
      referer: "https://www.defproc.gov.in/nicgep/app"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  if (/CommonErrorPage|redirectError/i.test(text)) throw new Error("portal returned common-error page");
  return text;
}

function parseDefenceRows(html: string): Tender[] {
  if (!html) return [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rows
    .map((row, index) => parseDefenceRow(row, index))
    .filter((row): row is Tender => Boolean(row));
}

function parseDefenceRow(row: string, index: number): Tender | null {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripTags(match[1]));
  const text = cells.join(" ");
  if (!/defence|defense|mes|drdo|army|navy|air force|airforce|military|cantonment|dockyard/i.test(text)) return null;
  const id = text.match(/\b20\d{2}_[A-Z0-9]+_\d+_\d+\b/i)?.[0] || `DEFPROC-LIVE-${index + 1}`;
  if (!/^20\d{2}_[A-Z0-9]+_\d+_\d+$/i.test(id)) return null;
  const title = cells.find((cell) => /repair|construction|procurement|supply|service|works|maintenance|dockyard|station/i.test(cell)) || "Defence procurement tender";
  if (title.length > 240 || /^-Select-/i.test(title)) return null;
  const segment = defenceSegments.find((item) => new RegExp(item.id === "AIRFORCE" ? "air force|airforce" : item.id, "i").test(text)) || defenceSegments[0];
  return buildDefenceTender({
    id,
    title,
    department: segment.department,
    category: segment.category,
    hasParsedDetail: true
  });
}

function buildDefenceSignals(): Tender[] {
  return defenceSegments.map((segment) =>
    buildDefenceTender({
      id: `DEFENCE-${segment.id}-${currentMonth.replace(/\s+/g, "-").toUpperCase()}`,
      title: `${segment.title} (${currentMonth})`,
      department: segment.department,
      category: segment.category,
      hasParsedDetail: false
    })
  );
}

function buildDefenceTender({
  id,
  title,
  department,
  category,
  hasParsedDetail
}: {
  id: string;
  title: string;
  department: string;
  category: string;
  hasParsedDetail: boolean;
}): Tender {
  return {
    id,
    title,
    portal: "CPPP",
    state: "Defence All India",
    department,
    category,
    valueCr: 0,
    deadline: "See portal",
    emdLakh: 0,
    pbgPercent: 0,
    aiScore: hasParsedDetail ? 66 : 54,
    status: "Open",
    risk: "High",
    winProbability: hasParsedDetail ? 50 : 42,
    recommendedBidLowCr: 0,
    recommendedBidHighCr: 0,
    competitorEstimateCr: 0,
    marginPercent: 0,
    clauses: [
      "Official DEFPROC/CPPP defence source monitoring signal",
      "Defence tenders may require security restrictions, vendor registration, OEM/Make-in-India compliance, and sensitive document handling",
      "Open official portal to verify exact tender ID, value, EMD, PBG, corrigendum and BOQ/RFP",
      "CEO rule: do not approve bid spend until source document and eligibility gates are verified"
    ],
    pqChecks: [
      { label: "Official defence procurement source linked", passed: true },
      { label: "Security/eligibility requirements verified", passed: false },
      { label: "Value, EMD, deadline and RFP verified from source document", passed: hasParsedDetail }
    ],
    sourceUrl: defprocUrl,
    sourceType: "Defence eProcure Signal"
  };
}

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8377;/g, "Rs")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
