export type Role = "CEO" | "Manager" | "Analyst";

export type TenderStatus = "Open" | "Closing" | "Closed" | "Won" | "Lost";
export type Portal = "GeM" | "CPPP" | "State";
export type RiskLevel = "Low" | "Medium" | "High";

export type Tender = {
  id: string;
  title: string;
  portal: Portal;
  state?: string;
  department: string;
  category: string;
  valueCr: number;
  deadline: string;
  emdLakh: number;
  pbgPercent: number;
  aiScore: number;
  status: TenderStatus;
  risk: RiskLevel;
  winProbability: number;
  recommendedBidLowCr: number;
  recommendedBidHighCr: number;
  competitorEstimateCr: number;
  marginPercent: number;
  clauses: string[];
  pqChecks: { label: string; passed: boolean }[];
  sourceUrl?: string;
  sourceType?: "Curated" | "UP eTender Live" | "MP eTender Live" | "Delhi eTender Live" | "Regional Portal Signal" | "Defence eProcure Signal" | "Public PDF" | "GeM Public Signal" | "GeM Live";
};

export type Competitor = {
  name: string;
  wins: number;
  avgDiscount: number;
  dominantDepartments: string[];
  l1Trend: number[];
};

export type Alert = {
  id: string;
  severity: "Info" | "Warning" | "Critical";
  title: string;
  source: Portal | "System";
  time: string;
};
