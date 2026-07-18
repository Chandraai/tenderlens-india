export type CompanyDocumentType =
  | "GST"
  | "PAN"
  | "MSME/Udyam"
  | "ISO"
  | "Contractor Registration"
  | "ITR"
  | "Net Worth Certificate"
  | "Bank Solvency"
  | "Work Experience"
  | "PF/ESI"
  | "Unknown";

export type CompanyDocumentAnalysis = {
  id: string;
  fileName: string;
  type: CompanyDocumentType;
  confidence: number;
  status: "Valid" | "Expiring Soon" | "Expired" | "Needs Review";
  health: number;
  extractedFields: { label: string; value: string }[];
  expiryDate: string;
  issueDate: string;
  owner: string;
  redFlags: string[];
  tenderUseCases: string[];
  extractedTextPreview: string;
  createdAt: string;
};

const currentDate = new Date("2026-05-15T00:00:00+05:30");

const typeSignals: Record<CompanyDocumentType, string[]> = {
  GST: ["gstin", "goods and services tax", "gst registration", "legal name", "principal place of business"],
  PAN: ["income tax department", "permanent account number", "pan", "father's name"],
  "MSME/Udyam": ["udyam", "msme", "micro small and medium", "enterprise type", "udyam registration"],
  ISO: ["iso 9001", "iso 14001", "iso 45001", "iso 27001", "quality management system", "certificate no"],
  "Contractor Registration": ["contractor registration", "class of contractor", "pwd registration", "cpwd", "enlistment", "category of works"],
  ITR: ["income tax return", "assessment year", "acknowledgement number", "gross total income", "itr"],
  "Net Worth Certificate": ["net worth", "chartered accountant", "assets", "liabilities", "certificate of net worth"],
  "Bank Solvency": ["solvency certificate", "bank", "credit facility", "financial standing"],
  "Work Experience": ["work order", "completion certificate", "similar work", "agreement no", "executed value"],
  "PF/ESI": ["provident fund", "epfo", "esi", "employees state insurance", "establishment code"],
  Unknown: []
};

export function analyzeCompanyDocument(fileName: string, rawText: string): CompanyDocumentAnalysis {
  const text = normalize(rawText);
  const lower = text.toLowerCase();
  const type = detectType(fileName, lower);
  const expiryDate = extractDateNear(text, ["valid till", "valid up to", "expiry", "expires on", "date of expiry", "validity"]) || "Not clearly found";
  const issueDate = extractDateNear(text, ["issue date", "issued on", "date of issue", "registration date", "certificate date"]) || "Not clearly found";
  const status = documentStatus(expiryDate, type);
  const redFlags = buildRedFlags(type, lower, expiryDate, status);
  const confidence = scoreConfidence(type, lower, expiryDate);
  const health = scoreHealth(status, confidence, redFlags);

  return {
    id: `DOC-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    fileName,
    type,
    confidence,
    status,
    health,
    extractedFields: extractFields(type, text, expiryDate, issueDate),
    expiryDate,
    issueDate,
    owner: extractOwner(text),
    redFlags,
    tenderUseCases: documentUseCases(type),
    extractedTextPreview: text.slice(0, 1000),
    createdAt: new Date().toISOString()
  };
}

export function requiredConstructionDocuments() {
  return [
    "GST",
    "PAN",
    "MSME/Udyam",
    "ISO",
    "Contractor Registration",
    "ITR",
    "Net Worth Certificate",
    "Bank Solvency",
    "Work Experience",
    "PF/ESI"
  ] as CompanyDocumentType[];
}

function detectType(fileName: string, lower: string): CompanyDocumentType {
  const corpus = `${fileName.toLowerCase()} ${lower}`;
  const scored = Object.entries(typeSignals)
    .filter(([type]) => type !== "Unknown")
    .map(([type, signals]) => ({
      type: type as CompanyDocumentType,
      score: signals.reduce((sum, signal) => sum + (corpus.includes(signal) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].type : "Unknown";
}

function extractFields(type: CompanyDocumentType, text: string, expiryDate: string, issueDate: string) {
  const fields = [
    { label: "Detected type", value: type },
    { label: "Owner / legal name", value: extractOwner(text) },
    { label: "Issue date", value: issueDate },
    { label: "Expiry date", value: expiryDate }
  ];

  const gstin = text.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i)?.[0];
  const pan = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i)?.[0];
  const udyam = text.match(/\bUDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}\b/i)?.[0];
  const iso = text.match(/\bISO\s?(?:9001|14001|45001|27001)\b/i)?.[0];

  if (gstin) fields.push({ label: "GSTIN", value: gstin.toUpperCase() });
  if (pan) fields.push({ label: "PAN", value: pan.toUpperCase() });
  if (udyam) fields.push({ label: "Udyam number", value: udyam.toUpperCase() });
  if (iso) fields.push({ label: "ISO standard", value: iso.toUpperCase() });

  return fields.filter((field) => field.value && field.value !== "Not clearly found");
}

function extractOwner(text: string) {
  const patterns = [
    /legal name\s*[:\-]?\s*([A-Za-z0-9 &.,()-]{4,90})/i,
    /name of enterprise\s*[:\-]?\s*([A-Za-z0-9 &.,()-]{4,90})/i,
    /this is to certify that\s*([A-Za-z0-9 &.,()-]{4,90})/i,
    /name\s*[:\-]?\s*([A-Za-z0-9 &.,()-]{4,90})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (match) return clean(match);
  }
  return "Not clearly found";
}

function extractDateNear(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^0-9A-Za-z]{0,30}(\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4})`, "i");
    const match = text.match(pattern)?.[1];
    if (match) return clean(match);
  }
  return "";
}

function documentStatus(expiryDate: string, type: CompanyDocumentType): CompanyDocumentAnalysis["status"] {
  if (["GST", "PAN", "MSME/Udyam", "ITR", "Net Worth Certificate", "Work Experience"].includes(type) && expiryDate === "Not clearly found") {
    return "Valid";
  }
  const parsed = parseDate(expiryDate);
  if (!parsed) return "Needs Review";
  const days = Math.ceil((parsed.getTime() - currentDate.getTime()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days <= 45) return "Expiring Soon";
  return "Valid";
}

function parseDate(value: string) {
  if (value === "Not clearly found") return null;
  const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
  const numeric = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (numeric) {
    const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
    return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRedFlags(type: CompanyDocumentType, lower: string, expiryDate: string, status: CompanyDocumentAnalysis["status"]) {
  const flags: string[] = [];
  if (type === "Unknown") flags.push("Document type could not be detected confidently.");
  if (status === "Expired") flags.push("Document appears expired for tender submission.");
  if (status === "Expiring Soon") flags.push("Document is close to expiry; renew before long-validity bids.");
  if (expiryDate === "Not clearly found" && ["ISO", "Contractor Registration", "Bank Solvency", "PF/ESI"].includes(type)) {
    flags.push("Expiry/validity date was not detected and should be manually verified.");
  }
  if (/blacklist|debar|suspended/i.test(lower)) flags.push("Possible blacklist/debarment wording detected.");
  if (type === "Contractor Registration" && !/class|category|civil|building|road|works/i.test(lower)) {
    flags.push("Contractor class/category was not detected.");
  }
  return flags.length ? flags : ["No immediate red flag detected."];
}

function scoreConfidence(type: CompanyDocumentType, lower: string, expiryDate: string) {
  if (type === "Unknown") return 35;
  const signalHits = typeSignals[type].filter((signal) => lower.includes(signal)).length;
  const dateBonus = expiryDate !== "Not clearly found" ? 10 : 0;
  return Math.min(96, 55 + signalHits * 10 + dateBonus);
}

function scoreHealth(status: CompanyDocumentAnalysis["status"], confidence: number, redFlags: string[]) {
  const statusPenalty = status === "Expired" ? 45 : status === "Expiring Soon" ? 25 : status === "Needs Review" ? 20 : 0;
  const flagPenalty = redFlags.filter((flag) => !flag.startsWith("No immediate")).length * 7;
  return Math.max(5, Math.min(100, confidence - statusPenalty - flagPenalty + 12));
}

function documentUseCases(type: CompanyDocumentType) {
  const map: Record<CompanyDocumentType, string[]> = {
    GST: ["Mandatory tax registration", "Buyer invoice validation", "Tender fee and award compliance"],
    PAN: ["Identity and tax compliance", "Financial bid documentation"],
    "MSME/Udyam": ["MSME exemption claim", "EMD/tender-fee relief where allowed", "Turnover/experience relaxation check"],
    ISO: ["Quality/safety/environment PQ", "Building and infrastructure technical qualification"],
    "Contractor Registration": ["PWD/CPWD/state works eligibility", "Class/category validation", "Bid capacity check"],
    ITR: ["Financial PQ", "Turnover validation", "Net worth support"],
    "Net Worth Certificate": ["Financial strength PQ", "Bank guarantee and solvency support"],
    "Bank Solvency": ["Working capital proof", "Large EMD/PBG approval"],
    "Work Experience": ["Similar work PQ", "Completion certificate mapping", "Bid capacity evidence"],
    "PF/ESI": ["Labour compliance", "Site workforce eligibility"],
    Unknown: ["Manual review required"]
  };
  return map[type];
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[^\w]+|[^\w.)-]+$/g, "").trim();
}
