import type { Tender } from "@/lib/types";

type RegionalPortalConfig = {
  key: "mp" | "delhi-ncr";
  state: string;
  label: string;
  sourceType: NonNullable<Tender["sourceType"]>;
  baseUrl: string;
  searchUrl: string;
  departments: string[];
  cities: string[];
};

export type RegionalPortalSync = {
  ok: boolean;
  syncedAt: string;
  source: string;
  region: string;
  parsedRows: number;
  signalRows: number;
  tenders: Tender[];
  warnings: string[];
};

const constructionKeywords = [
  "construction",
  "building",
  "road",
  "bridge",
  "civil",
  "repair",
  "renovation",
  "pwd",
  "housing",
  "development",
  "drain",
  "water",
  "school",
  "hospital"
];

const regionalConfigs: RegionalPortalConfig[] = [
  {
    key: "mp",
    state: "Madhya Pradesh",
    label: "Madhya Pradesh",
    sourceType: "MP eTender Live",
    baseUrl: "https://mptenders.gov.in/nicgep/app",
    searchUrl: "https://mptenders.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=page",
    departments: [
      "Public Works Department MP",
      "Urban Administration and Development MP",
      "MP State Agricultural Marketing Board",
      "Madhya Pradesh Housing and Infrastructure Development"
    ],
    cities: ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"]
  },
  {
    key: "delhi-ncr",
    state: "Delhi NCR",
    label: "Delhi NCR",
    sourceType: "Delhi eTender Live",
    baseUrl: "https://govtprocurement.delhi.gov.in/nicgep/app",
    searchUrl: "https://govtprocurement.delhi.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=page",
    departments: [
      "PWD Delhi",
      "Delhi Development Authority",
      "Delhi Jal Board",
      "Municipal Corporation of Delhi",
      "NCR Development / Urban Works"
    ],
    cities: ["Delhi", "Noida", "Ghaziabad", "Gurugram", "Faridabad"]
  }
];

export async function syncRegionalPortals(): Promise<RegionalPortalSync[]> {
  return Promise.all(regionalConfigs.map(syncRegionalPortal));
}

async function syncRegionalPortal(config: RegionalPortalConfig): Promise<RegionalPortalSync> {
  const warnings: string[] = [];
  const html = await fetchText(config.searchUrl).catch((error) => {
    warnings.push(`${config.label} active-tender page unavailable without portal token/session: ${error instanceof Error ? error.message : "unknown error"}`);
    return "";
  });
  const parsed = parseTenderRows(html, config);
  if (!parsed.length) warnings.push(`${config.label} row parser did not find open construction rows; showing official portal search signals for city-wise monitoring.`);
  const tenders = parsed.length ? parsed : buildPortalSignals(config);
  return {
    ok: Boolean(tenders.length),
    syncedAt: new Date().toISOString(),
    source: config.searchUrl,
    region: config.state,
    parsedRows: parsed.length,
    signalRows: parsed.length ? 0 : tenders.length,
    tenders,
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
      referer: url
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  if (/CommonErrorPage|redirectError/i.test(text)) throw new Error("portal returned common-error page");
  return text;
}

function parseTenderRows(html: string, config: RegionalPortalConfig): Tender[] {
  if (!html) return [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rows
    .map((row, index) => parseTenderRow(row, index, config))
    .filter((row): row is Tender => Boolean(row));
}

function parseTenderRow(row: string, index: number, config: RegionalPortalConfig): Tender | null {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripTags(match[1]));
  const text = cells.join(" ");
  if (!constructionKeywords.some((keyword) => text.toLowerCase().includes(keyword))) return null;
  const title = cells.find((cell) => /construction|building|road|bridge|repair|renovation|civil/i.test(cell)) || `${config.label} construction tender`;
  const id = text.match(/\b20\d{2}_[A-Z0-9]+_\d+_\d+\b/i)?.[0] || `${config.key.toUpperCase()}-LIVE-${index + 1}`;
  const deadline = normalizeDate(text.match(/\b\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{4}\b/)?.[0] || text.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/)?.[0] || "");
  const valueCr = parseRupeeToCr(text);
  const city = detectCity(text, config.cities) || config.cities[0];
  return buildTender({
    id,
    title,
    config,
    city,
    department: cells.find((cell) => /department|pwd|authority|board|corporation|mcd|dda|jal/i.test(cell)) || config.departments[0],
    valueCr,
    deadline: deadline || "See portal",
    emdLakh: 0,
    sourceType: config.sourceType
  });
}

function buildPortalSignals(config: RegionalPortalConfig): Tender[] {
  return config.cities.slice(0, 5).map((city, index) =>
    buildTender({
      id: `${config.key.toUpperCase()}-${city.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-CONSTRUCTION`,
      title: `${config.label} construction tender monitor - ${city}`,
      config,
      city,
      department: config.departments[index % config.departments.length],
      valueCr: 0,
      deadline: "See portal",
      emdLakh: 0,
      sourceType: "Regional Portal Signal"
    })
  );
}

function buildTender({
  id,
  title,
  config,
  city,
  department,
  valueCr,
  deadline,
  emdLakh,
  sourceType
}: {
  id: string;
  title: string;
  config: RegionalPortalConfig;
  city: string;
  department: string;
  valueCr: number;
  deadline: string;
  emdLakh: number;
  sourceType: NonNullable<Tender["sourceType"]>;
}): Tender {
  const hasValue = valueCr > 0;
  return {
    id,
    title,
    portal: "State",
    state: config.state,
    department,
    category: city,
    valueCr,
    deadline,
    emdLakh,
    pbgPercent: 0,
    aiScore: hasValue ? 68 : 52,
    status: "Open",
    risk: hasValue ? "Medium" : "High",
    winProbability: hasValue ? 56 : 42,
    recommendedBidLowCr: hasValue ? round(valueCr * 0.94) : 0,
    recommendedBidHighCr: hasValue ? round(valueCr * 0.98) : 0,
    competitorEstimateCr: hasValue ? round(valueCr * 0.96) : 0,
    marginPercent: hasValue ? 8.5 : 0,
    clauses: [
      `${config.label} official portal monitoring signal`,
      `City/region: ${city}`,
      hasValue ? "Tender value parsed from official portal row" : "Open official portal to fetch exact value, EMD, BOQ and deadline",
      "Verify corrigendum and BOQ before bid spend"
    ],
    pqChecks: [
      { label: "Official portal source linked", passed: true },
      { label: "Construction/civil category signal", passed: true },
      { label: "Value/EMD/deadline verified from portal detail", passed: hasValue && deadline !== "See portal" }
    ],
    sourceUrl: config.searchUrl,
    sourceType
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

function detectCity(text: string, cities: string[]) {
  return cities.find((city) => new RegExp(`\\b${escapeRegExp(city)}\\b`, "i").test(text));
}

function parseRupeeToCr(value: string) {
  const match = value.match(/(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*(?:\.\d+)?)/i) || value.match(/\b([0-9][0-9,]*(?:\.\d+)?)\s*(?:crore|cr)\b/i);
  if (!match) return 0;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return 0;
  if (/crore|cr/i.test(match[0])) return round(amount);
  return round(amount / 10_000_000);
}

function normalizeDate(value: string) {
  if (!value) return "";
  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  const named = value.match(/^(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{4})$/);
  if (!named) return "";
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
  const month = months[named[2].slice(0, 3).toLowerCase()];
  return month ? `${named[3]}-${month}-${named[1].padStart(2, "0")}` : "";
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
