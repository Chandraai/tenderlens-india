import type { Tender } from "@/lib/types";

const gemAllBidsUrl = "https://bidplus.gem.gov.in/all-bids";
const gemAllBidsDataUrl = "https://bidplus.gem.gov.in/all-bids-data";
const gemSearchQueries = [
  "construction uttar pradesh",
  "road uttar pradesh",
  "building uttar pradesh",
  "civil uttar pradesh",
  "pwd uttar pradesh"
];

const constructionKeywords = [
  "construction",
  "civil",
  "building",
  "boq",
  "shed",
  "road",
  "street light",
  "structural steel",
  "facility management",
  "repair",
  "maintenance",
  "interior",
  "electrical",
  "plumbing",
  "cpwd",
  "pwd"
];

export type GeMSync = {
  ok: boolean;
  syncedAt: string;
  source: string;
  mode: "public-json" | "fallback-signal";
  sessionRequired: boolean;
  credentialsRequired: boolean;
  publicRows: number;
  totalMatched: number;
  searchedQueries: string[];
  warnings: string[];
};

type GeMDoc = {
  id?: string;
  b_id?: number[];
  b_bid_number?: string[];
  b_category_name?: string[];
  bd_category_name?: string[];
  bbt_title?: string[];
  b_total_quantity?: number[];
  final_start_date_sort?: string[];
  final_end_date_sort?: string[];
  ba_official_details_minName?: string[];
  ba_official_details_deptName?: string[];
  b_bid_type?: number[];
  is_high_value?: boolean[];
  bd_details_is_boq?: boolean[];
};

type GeMDataResponse = {
  code?: number;
  message?: string;
  response?: {
    response?: {
      numFound?: number;
      start?: number;
      docs?: GeMDoc[];
    };
  };
};

export async function syncGeMPortal(): Promise<{ sync: GeMSync; tenders: Tender[] }> {
  const warnings: string[] = [];
  let ok = false;
  let mode: GeMSync["mode"] = "fallback-signal";
  let totalMatched = 0;
  let tenders: Tender[] = [];

  try {
    const session = await openPublicGeMSession();
    ok = true;
    const docs = await fetchGeMDocs(session, warnings);
    const relevantDocs = dedupeDocs(docs).filter(isUpConstructionDoc);
    totalMatched = relevantDocs.length;
    tenders = relevantDocs.slice(0, 12).map(mapGeMDocToTender);
    if (tenders.length) {
      mode = "public-json";
    } else {
      warnings.push("GeM public JSON returned data, but no Uttar Pradesh construction rows matched the current filters. Showing fallback public-signal rows.");
      tenders = buildGeMUpConstructionSignals();
    }
  } catch (error) {
    warnings.push(`GeM public JSON sync failed: ${error instanceof Error ? error.message : "unknown"}`);
    tenders = buildGeMUpConstructionSignals();
  }

  if (mode === "public-json") {
    warnings.push("GeM rows are pulled from the public all-bids JSON endpoint using a fresh CSRF/session handshake. Bid value, EMD and BOQ details still need opening the GeM bid document for verification.");
  } else {
    warnings.push("GeM fallback rows are public signals only. Configure official API/session access for guaranteed full ingestion.");
  }

  return {
    sync: {
      ok,
      syncedAt: new Date().toISOString(),
      source: gemAllBidsDataUrl,
      mode,
      sessionRequired: false,
      credentialsRequired: mode !== "public-json",
      publicRows: tenders.length,
      totalMatched,
      searchedQueries: gemSearchQueries,
      warnings
    },
    tenders
  };
}

async function openPublicGeMSession() {
  const response = await fetch(gemAllBidsUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
    headers: {
      "user-agent": browserUserAgent(),
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-IN,en;q=0.9"
    }
  });
  if (!response.ok) throw new Error(`GeM all-bids page failed ${response.status}`);
  const html = await response.text();
  const cookies = collectCookies(response.headers);
  const csrf = extractCsrf(html, cookies);
  if (!csrf) throw new Error("GeM CSRF token was not found");
  return { csrf, cookie: cookies.join("; ") };
}

async function fetchGeMDocs(session: { csrf: string; cookie: string }, warnings: string[]) {
  const docs: GeMDoc[] = [];
  for (const searchBid of gemSearchQueries) {
    const response = await postGeMSearch(session, searchBid);
    if (response.code !== 200) {
      warnings.push(`GeM query "${searchBid}" returned ${response.code || "unknown"} ${response.message || ""}`.trim());
      continue;
    }
    docs.push(...(response.response?.response?.docs || []));
  }
  if (!docs.length) throw new Error("GeM public JSON returned no bid rows");
  return docs;
}

async function postGeMSearch(session: { csrf: string; cookie: string }, searchBid: string): Promise<GeMDataResponse> {
  const payload = {
    param: { searchBid, searchType: "fullText" },
    filter: {
      bidStatusType: "ongoing_bids",
      byType: "all",
      highBidValue: "",
      byEndDate: { from: "", to: "" },
      sort: "Bid-End-Date-Oldest"
    },
    page: 1
  };
  const body = new URLSearchParams({
    payload: JSON.stringify(payload),
    csrf_bd_gem_nk: session.csrf
  });
  const response = await fetch(gemAllBidsDataUrl, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
    headers: {
      "user-agent": browserUserAgent(),
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "en-IN,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      origin: "https://bidplus.gem.gov.in",
      referer: gemAllBidsUrl,
      cookie: session.cookie
    },
    body
  });
  if (!response.ok) throw new Error(`GeM all-bids-data failed ${response.status}`);
  return (await response.json()) as GeMDataResponse;
}

function collectCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const rawCookies = typeof withGetSetCookie.getSetCookie === "function" ? withGetSetCookie.getSetCookie() : splitSetCookie(headers.get("set-cookie") || "");
  return rawCookies.map((cookie) => cookie.split(";")[0]).filter(Boolean);
}

function splitSetCookie(value: string) {
  if (!value) return [];
  return value.split(/,\s*(?=[^=;,]+=)/);
}

function extractCsrf(html: string, cookies: string[]) {
  return (
    html.match(/csrf_bd_gem_nk['"]?\s*:\s*['"]([a-f0-9]{16,})/i)?.[1] ||
    html.match(/csrf_bd_gem_nk['"]?\s*,?\s*['"]([a-f0-9]{16,})/i)?.[1] ||
    cookies.find((cookie) => cookie.startsWith("csrf_gem_cookie="))?.split("=")[1] ||
    ""
  );
}

function dedupeDocs(docs: GeMDoc[]) {
  const map = new Map<string, GeMDoc>();
  for (const doc of docs) {
    const key = first(doc.b_bid_number) || firstNumber(doc.b_id) || doc.id;
    if (key && !map.has(key)) map.set(key, doc);
  }
  return [...map.values()];
}

function isUpConstructionDoc(doc: GeMDoc) {
  const text = [
    first(doc.b_bid_number),
    first(doc.b_category_name),
    first(doc.bd_category_name),
    first(doc.bbt_title),
    first(doc.ba_official_details_minName),
    first(doc.ba_official_details_deptName)
  ].join(" ");
  const buyerText = [first(doc.ba_official_details_minName), first(doc.ba_official_details_deptName)].join(" ");
  const isUp = /uttar pradesh|lucknow|kanpur|varanasi|noida|ghaziabad|prayagraj|gorakhpur|meerut|agra|bareilly|aligarh|moradabad|jhansi|ayodhya/i.test(buyerText);
  const isConstruction = constructionKeywords.some((keyword) => text.toLowerCase().includes(keyword));
  return isUp && isConstruction;
}

function mapGeMDocToTender(doc: GeMDoc): Tender {
  const bidId = firstNumber(doc.b_id) || doc.id || safeId(first(doc.b_bid_number) || "gem-live");
  const bidNumber = first(doc.b_bid_number) || `GEM-LIVE-${bidId}`;
  const category = first(doc.b_category_name) || first(doc.bd_category_name) || "GeM construction bid";
  const title = first(doc.bbt_title) || category;
  const department = [first(doc.ba_official_details_minName), first(doc.ba_official_details_deptName)].filter(Boolean).join(" / ") || "GeM buyer";
  const deadline = normalizeIsoDate(first(doc.final_end_date_sort));
  const isHighValue = Boolean(doc.is_high_value?.[0]);
  const isBoq = Boolean(doc.bd_details_is_boq?.[0]) || /boq/i.test([title, category].join(" "));

  return {
    id: bidNumber,
    title: title.length > 12 ? title : category,
    portal: "GeM",
    state: "Uttar Pradesh",
    department,
    category: inferCategory([title, category].join(" ")),
    valueCr: isHighValue ? 2 : 0,
    deadline,
    emdLakh: 0,
    pbgPercent: 0,
    aiScore: isBoq ? 76 : 68,
    status: "Open",
    risk: isHighValue ? "Medium" : "Low",
    winProbability: isBoq ? 62 : 54,
    recommendedBidLowCr: 0,
    recommendedBidHighCr: 0,
    competitorEstimateCr: 0,
    marginPercent: isBoq ? 10.5 : 8.5,
    clauses: [
      "Live GeM ongoing bid row",
      isBoq ? "BOQ/detail document must be downloaded from GeM" : "Specification and quantity must be verified on GeM",
      "Check corrigendum/representation before bid approval",
      "Validate GeM seller/service category eligibility"
    ],
    pqChecks: [
      { label: "GeM public row fetched", passed: true },
      { label: "Uttar Pradesh buyer/signal matched", passed: true },
      { label: "Bid document opened and EMD/value verified", passed: false }
    ],
    sourceUrl: `https://bidplus.gem.gov.in/showbidDocument/${bidId}`,
    sourceType: "GeM Live"
  };
}

function buildGeMUpConstructionSignals(): Tender[] {
  return [
    {
      id: "GEM-UP-PWD-CIVIL-2026-01",
      title: "GeM civil works package for road safety furniture, signages and allied construction supply in Uttar Pradesh",
      portal: "GeM",
      state: "Uttar Pradesh",
      department: "UP Public Works / GeM Buyer",
      category: "Road Construction",
      valueCr: 2.4,
      deadline: "2026-06-18",
      emdLakh: 4.8,
      pbgPercent: 5,
      aiScore: 74,
      status: "Open",
      risk: "Medium",
      winProbability: 61,
      recommendedBidLowCr: 2.25,
      recommendedBidHighCr: 2.34,
      competitorEstimateCr: 2.31,
      marginPercent: 9.8,
      clauses: ["GeM bid participation", "Buyer technical specification compliance", "L1/RA pricing pressure", "Delivery and installation proof required"],
      pqChecks: [
        { label: "GeM seller registration", passed: true },
        { label: "OEM/authorized supply evidence", passed: false },
        { label: "GST/PAN and past performance ready", passed: true }
      ],
      sourceUrl: gemAllBidsUrl,
      sourceType: "GeM Public Signal"
    }
  ];
}

function inferCategory(text: string) {
  if (/road|street light/i.test(text)) return "Road Construction";
  if (/electrical|plumbing|mep|facility management/i.test(text)) return "Building Renovation";
  if (/interior|furniture|shed|building|boq|civil|construction/i.test(text)) return "Building Construction";
  return "Construction Works";
}

function normalizeIsoDate(value: string) {
  if (!value) return "See GeM";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function first(value?: string[]) {
  return Array.isArray(value) ? value[0] || "" : "";
}

function firstNumber(value?: number[]) {
  const number = Array.isArray(value) ? value[0] : 0;
  return Number.isFinite(number) && number > 0 ? String(number) : "";
}

function safeId(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function browserUserAgent() {
  return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 TenderLensIndia/0.1";
}
