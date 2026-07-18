import { tenders } from "@/lib/data";

const upOrgUrl = "https://etender.up.nic.in/nicgep/app?page=FrontEndTendersByOrganisation&service=page";
const upActivePwdUrl =
  "https://etender.up.nic.in/nicgep/app?component=%24DirectLink&page=FrontEndLatestActiveTenders&service=direct&sp=SD0pvl4aI14aIciJHvwQAUA%3D%3D";

const constructionSignals = [
  "PWD",
  "Development Authority",
  "Construction",
  "Infrastructure",
  "Housing",
  "Awas",
  "Jal Nigam",
  "Expressway",
  "Municipal",
  "Rural Development",
  "Industrial Development"
];

export type UpPortalOrg = {
  organisation: string;
  tenderCount: number;
};

export type UpPortalSync = {
  ok: boolean;
  syncedAt: string;
  source: string;
  activeConstructionOrgCount: number;
  activeConstructionTenderCount: number;
  organisations: UpPortalOrg[];
  liveTenderSignals: {
    tenderId: string;
    organisation: string;
    title: string;
    category: string;
    sourceUrl: string;
    valueCr?: number;
    emdLakh?: number;
    deadline?: string;
    location?: string;
    periodDays?: number;
  }[];
  appMatchedTenders: number;
  warnings: string[];
};

export async function syncUpPortal(): Promise<UpPortalSync> {
  const warnings: string[] = [];
  const [orgHtml, activeHtml] = await Promise.all([
    fetchText(upOrgUrl).catch((error) => {
      warnings.push(`Organisation feed unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      return "";
    }),
    fetchText(upActivePwdUrl).catch((error) => {
      warnings.push(`Active tender detail unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      return "";
    })
  ]);

  const organisations = parseOrganisationCounts(orgHtml)
    .filter((item) => constructionSignals.some((signal) => item.organisation.toLowerCase().includes(signal.toLowerCase())))
    .sort((a, b) => b.tenderCount - a.tenderCount)
    .slice(0, 30);

  const liveTenderSignals = parseActiveTender(activeHtml);
  if (!organisations.length) warnings.push("UP organisation list did not expose construction counts in the expected format.");
  if (!liveTenderSignals.length) warnings.push("Latest active tender detail was not parseable; portal session may have changed.");

  return {
    ok: Boolean(organisations.length || liveTenderSignals.length),
    syncedAt: new Date().toISOString(),
    source: upOrgUrl,
    activeConstructionOrgCount: organisations.length,
    activeConstructionTenderCount: organisations.reduce((sum, item) => sum + item.tenderCount, 0),
    organisations,
    liveTenderSignals,
    appMatchedTenders: tenders.filter((tender) => tender.state === "Uttar Pradesh").length,
    warnings
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-IN,en;q=0.9",
      referer: "https://etender.up.nic.in/nicgep/app"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function parseOrganisationCounts(html: string): UpPortalOrg[] {
  const clean = html.replace(/&nbsp;/g, " ").replace(/\r?\n/g, " ");
  const rows = clean.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const orgs: UpPortalOrg[] = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripTags(match[1]));
    const organisation = cells.find((cell) => /[A-Za-z]/.test(cell) && !/^\d+$/.test(cell) && !/organisation name|tender count/i.test(cell));
    const countCell = [...cells].reverse().find((cell) => /^\d+$/.test(cell));
    if (organisation && countCell) {
      orgs.push({ organisation, tenderCount: Number(countCell) });
    }
  }

  return dedupeOrgs(orgs);
}

function parseActiveTender(html: string) {
  if (!html) return [];
  const text = stripTags(html);
  const tenderId = text.match(/Tender ID\s*([0-9]{4}_[A-Z0-9]+_[0-9]+_[0-9]+)/i)?.[1] || "";
  const organisation = field(text, "Organisation Chain", "Tender Reference Number")?.replace(/\|\|/g, " / ") || "UP eTender active tender";
  const category = field(text, "Product Category", "Sub category") || text.match(/Road Works/i)?.[0] || "Construction Works";
  const valueCr = parseRupeeToCr(field(text, "Tender Value in", "Product Category") || "");
  const emdLakh = parseRupeeToLakh(field(text, "EMD Amount in", "EMD Exemption Allowed") || "");
  const deadline = normalizeUpDate(field(text, "Bid Submission End Date", "Tenders Documents") || "");
  const location = text.match(/Period Of Work\(Days\)\s*\d+\s*Location\s*([\s\S]*?)\s*Pincode/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
  const periodDays = Number(field(text, "Period Of Work(Days)", "Location")?.replace(/[^0-9]/g, "") || 0);
  const title =
    field(text, "Work Item Details Title", "Work Description") ||
    fieldLast(text, "Title", "Work Description") ||
    field(text, "Work Description", "NDA/Pre Qualification") ||
    "UP PWD active construction tender";

  if (!tenderId && !/PWD|Road Works|Construction/i.test(text)) return [];
  return [
    {
      tenderId: tenderId || "UP-LIVE-PWD",
      organisation,
      title: title.trim(),
      category: category.trim(),
      sourceUrl: upActivePwdUrl,
      valueCr,
      emdLakh,
      deadline,
      location,
      periodDays: Number.isFinite(periodDays) ? periodDays : 0
    }
  ];
}

function parseRupeeToCr(value: string) {
  const amount = parseIndianNumber(value);
  return amount ? Math.round((amount / 10_000_000) * 1000) / 1000 : 0;
}

function parseRupeeToLakh(value: string) {
  const amount = parseIndianNumber(value);
  return amount ? Math.round((amount / 100_000) * 100) / 100 : 0;
}

function parseIndianNumber(value: string) {
  const match = value.match(/[0-9][0-9,]*(?:\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, "")) : 0;
}

function normalizeUpDate(value: string) {
  const match = value.match(/(\d{1,2})-([A-Za-z]{3,9})-(\d{4})/);
  if (!match) return "";
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12"
  };
  const month = months[match[2].slice(0, 3).toLowerCase()];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : "";
}

function field(text: string, start: string, end: string) {
  const pattern = new RegExp(`${escapeRegExp(start)}\\s*([\\s\\S]*?)\\s*${escapeRegExp(end)}`, "i");
  return text.match(pattern)?.[1]?.replace(/\s+/g, " ").trim();
}

function fieldLast(text: string, start: string, end: string) {
  const pattern = new RegExp(`${escapeRegExp(start)}\\s*([\\s\\S]*?)\\s*${escapeRegExp(end)}`, "gi");
  const matches = [...text.matchAll(pattern)];
  return matches.at(-1)?.[1]?.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function dedupeOrgs(orgs: UpPortalOrg[]) {
  const map = new Map<string, UpPortalOrg>();
  for (const org of orgs) {
    if (!map.has(org.organisation)) map.set(org.organisation, org);
  }
  return [...map.values()];
}
