import { Alert, Competitor, Tender } from "@/lib/types";

export const tenders: Tender[] = [
  {
    id: "2026_REDUP_1144852_1",
    title: "Construction of road from Shahzadpur paved road to Kotiachitra village, Raebareli",
    portal: "State",
    state: "Uttar Pradesh",
    department: "Rural Engineering Department UP",
    category: "Road Construction",
    valueCr: 1.86,
    deadline: "2026-09-25",
    emdLakh: 3.72,
    pbgPercent: 5,
    aiScore: 88,
    status: "Open",
    risk: "Low",
    winProbability: 79,
    recommendedBidLowCr: 1.74,
    recommendedBidHighCr: 1.82,
    competitorEstimateCr: 1.78,
    marginPercent: 11.8,
    clauses: ["Percentage rate contract", "Village road works", "PWD/RED registration", "Performance security within award window"],
    pqChecks: [
      { label: "Similar rural road work", passed: true },
      { label: "Valid contractor registration", passed: true },
      { label: "GST and PAN ready", passed: true }
    ]
  },
  {
    id: "2026_REDUP_1135619_23",
    title: "Construction of CC road from Deepu Jaiswal house to tower side, Rehra Bazar",
    portal: "State",
    state: "Uttar Pradesh",
    department: "Rural Engineering Department UP",
    category: "Road Construction",
    valueCr: 0.42,
    deadline: "2026-09-25",
    emdLakh: 0.84,
    pbgPercent: 5,
    aiScore: 81,
    status: "Open",
    risk: "Low",
    winProbability: 73,
    recommendedBidLowCr: 0.39,
    recommendedBidHighCr: 0.41,
    competitorEstimateCr: 0.4,
    marginPercent: 10.6,
    clauses: ["CC pavement", "Local body measurement book", "Defect liability period", "Material testing at site"],
    pqChecks: [
      { label: "CC road execution experience", passed: true },
      { label: "Plant and machinery declaration", passed: true },
      { label: "Local labour compliance", passed: false }
    ]
  },
  {
    id: "UP-PWD-DHARMAPUR-140922745",
    title: "Patch repair works of different village roads in Vikas Khand Dharmapur",
    portal: "State",
    state: "Uttar Pradesh",
    department: "Public Works Department UP",
    category: "Road Maintenance",
    valueCr: 0.68,
    deadline: "2026-09-15",
    emdLakh: 1.2,
    pbgPercent: 3,
    aiScore: 67,
    status: "Closing",
    risk: "Medium",
    winProbability: 57,
    recommendedBidLowCr: 0.63,
    recommendedBidHighCr: 0.66,
    competitorEstimateCr: 0.64,
    marginPercent: 8.9,
    clauses: ["Short closing window", "Patch repair BOQ", "Hot mix/material quality", "Running bill certification"],
    pqChecks: [
      { label: "PWD registration", passed: true },
      { label: "Bituminous repair experience", passed: true },
      { label: "Bid preparation time available", passed: false }
    ]
  },
  {
    id: "ICP-SONAULI/EPC/2026/01",
    title: "EPC construction of stakeholder accommodation, multipurpose block, roads and external development at ICP Sonauli",
    portal: "CPPP",
    state: "Uttar Pradesh",
    department: "Land Ports Authority / Central Works",
    category: "Building Construction",
    valueCr: 94.5,
    deadline: "2026-09-30",
    emdLakh: 95,
    pbgPercent: 5,
    aiScore: 76,
    status: "Open",
    risk: "High",
    winProbability: 62,
    recommendedBidLowCr: 88.2,
    recommendedBidHighCr: 92.1,
    competitorEstimateCr: 90.4,
    marginPercent: 9.4,
    clauses: ["EPC mode", "Building plus roads and landscaping", "Border infrastructure security compliance", "Milestone-linked payments"],
    pqChecks: [
      { label: "Large EPC building project", passed: true },
      { label: "Average turnover above threshold", passed: true },
      { label: "Security-zone work experience", passed: false }
    ]
  },
  {
    id: "CPWD/2026-27/CIVIL/TOILET-BATH-KADANA",
    title: "Construction of toilet-cum-bathroom and renovation works at Rangeli site office",
    portal: "CPPP",
    state: "Gujarat",
    department: "Central Water Commission / CPWD Works",
    category: "Building Renovation",
    valueCr: 0.31,
    deadline: "2026-09-20",
    emdLakh: 0.62,
    pbgPercent: 3,
    aiScore: 71,
    status: "Open",
    risk: "Low",
    winProbability: 65,
    recommendedBidLowCr: 0.29,
    recommendedBidHighCr: 0.3,
    competitorEstimateCr: 0.3,
    marginPercent: 12.2,
    clauses: ["Civil renovation", "Sanitary and plumbing works", "Site office constraints", "CPWD specifications"],
    pqChecks: [
      { label: "Civil renovation experience", passed: true },
      { label: "Sanitary/plumbing vendor tie-up", passed: true },
      { label: "CPWD class registration", passed: false }
    ]
  },
  {
    id: "NHAI/RO-LKO/2026/ROB-04",
    title: "Construction of minor bridge and approach road on NH corridor package",
    portal: "CPPP",
    state: "Uttar Pradesh",
    department: "NHAI Regional Office Lucknow",
    category: "Bridge & Highway",
    valueCr: 38.7,
    deadline: "2026-09-03",
    emdLakh: 38.7,
    pbgPercent: 5,
    aiScore: 73,
    status: "Open",
    risk: "Medium",
    winProbability: 61,
    recommendedBidLowCr: 36.1,
    recommendedBidHighCr: 37.8,
    competitorEstimateCr: 37.0,
    marginPercent: 8.5,
    clauses: ["IRC/MoRTH specifications", "Traffic diversion plan", "Bridge QA/QC", "Mobilisation advance conditions"],
    pqChecks: [
      { label: "Bridge work completed", passed: true },
      { label: "Hot mix plant access", passed: true },
      { label: "Traffic safety plan", passed: false }
    ]
  },
  {
    id: "MH-PWD/BLDG/2026/221",
    title: "Construction of district administrative building and parking block",
    portal: "State",
    state: "Maharashtra",
    department: "Maharashtra Public Works Department",
    category: "Building Construction",
    valueCr: 52.4,
    deadline: "2026-10-05",
    emdLakh: 52,
    pbgPercent: 5,
    aiScore: 84,
    status: "Open",
    risk: "Medium",
    winProbability: 72,
    recommendedBidLowCr: 49.3,
    recommendedBidHighCr: 51.2,
    competitorEstimateCr: 50.1,
    marginPercent: 12.7,
    clauses: ["RCC framed structure", "Fire NOC compliance", "Basement parking waterproofing", "Green building provisions"],
    pqChecks: [
      { label: "RCC public building references", passed: true },
      { label: "Fire and MEP subcontractors", passed: true },
      { label: "Local registration", passed: false }
    ]
  },
  {
    id: "RAJ-HOUSING/2026/AFF-18",
    title: "Affordable housing block construction with internal roads and drainage",
    portal: "State",
    state: "Rajasthan",
    department: "Rajasthan Housing Board",
    category: "Housing",
    valueCr: 76.2,
    deadline: "2026-10-12",
    emdLakh: 76,
    pbgPercent: 5,
    aiScore: 79,
    status: "Open",
    risk: "Medium",
    winProbability: 69,
    recommendedBidLowCr: 71.4,
    recommendedBidHighCr: 74.8,
    competitorEstimateCr: 73.1,
    marginPercent: 11.2,
    clauses: ["Mass housing", "Internal roads", "Drainage and water supply", "Stage-wise handover"],
    pqChecks: [
      { label: "Housing project experience", passed: true },
      { label: "Labour camp compliance", passed: true },
      { label: "Material escalation clause favourable", passed: false }
    ]
  },
  {
    id: "KAR-PWD/2026/ROAD-77",
    title: "Widening and strengthening of district major road with CD works",
    portal: "State",
    state: "Karnataka",
    department: "Karnataka PWD",
    category: "Road Construction",
    valueCr: 24.8,
    deadline: "2026-09-30",
    emdLakh: 24.8,
    pbgPercent: 5,
    aiScore: 70,
    status: "Open",
    risk: "Medium",
    winProbability: 58,
    recommendedBidLowCr: 23.1,
    recommendedBidHighCr: 24.2,
    competitorEstimateCr: 23.5,
    marginPercent: 9.1,
    clauses: ["Road widening", "CD structures", "Utility shifting", "Monsoon execution risk"],
    pqChecks: [
      { label: "Road widening references", passed: true },
      { label: "Crusher/hot mix source", passed: true },
      { label: "Monsoon buffer plan", passed: false }
    ]
  },
  {
    id: "TN-TWAD/2026/WATER-14",
    title: "Construction of OHT, pumping main and distribution network for town water supply",
    portal: "State",
    state: "Tamil Nadu",
    department: "TWAD Board",
    category: "Water Infrastructure",
    valueCr: 31.6,
    deadline: "2026-10-07",
    emdLakh: 31.6,
    pbgPercent: 5,
    aiScore: 75,
    status: "Open",
    risk: "Medium",
    winProbability: 64,
    recommendedBidLowCr: 29.4,
    recommendedBidHighCr: 30.8,
    competitorEstimateCr: 30.2,
    marginPercent: 10.1,
    clauses: ["OHT construction", "DI/HDPE pipeline", "Hydraulic testing", "Trial run and O&M handover"],
    pqChecks: [
      { label: "Water supply project references", passed: true },
      { label: "Pipeline pressure testing capability", passed: true },
      { label: "Local statutory approvals", passed: false }
    ]
  }
];

export const alerts: Alert[] = [
  { id: "a1", severity: "Critical", title: "UP PWD Dharmapur road repair closes today; BOQ and EMD must be confirmed", source: "State", time: "Today 09:20" },
  { id: "a2", severity: "Warning", title: "UP RED Raebareli road package closes on 25 May 2026", source: "State", time: "Today 07:45" },
  { id: "a3", severity: "Info", title: "New construction matches found across CPWD, PWD, housing and water works", source: "CPPP", time: "Yesterday" },
  { id: "a4", severity: "Warning", title: "ISO / contractor registration expiry checks affect 3 building tenders", source: "System", time: "Yesterday" }
];

export const competitors: Competitor[] = [
  { name: "L&T Construction", wins: 28, avgDiscount: 5.2, dominantDepartments: ["NHAI", "Metro", "Large EPC"], l1Trend: [101, 99, 98, 97, 97, 96] },
  { name: "NCC Limited", wins: 22, avgDiscount: 6.8, dominantDepartments: ["Buildings", "Water", "Roads"], l1Trend: [99, 97, 96, 96, 94, 95] },
  { name: "PNC Infratech", wins: 18, avgDiscount: 7.4, dominantDepartments: ["UP PWD", "NHAI"], l1Trend: [98, 96, 95, 93, 94, 92] },
  { name: "Ahluwalia Contracts", wins: 14, avgDiscount: 4.9, dominantDepartments: ["CPWD", "Housing", "Institutional Buildings"], l1Trend: [100, 99, 98, 98, 97, 97] }
];

export const monthlyBidVolume = [
  { month: "Dec", bids: 14, won: 5 },
  { month: "Jan", bids: 19, won: 7 },
  { month: "Feb", bids: 22, won: 8 },
  { month: "Mar", bids: 26, won: 10 },
  { month: "Apr", bids: 31, won: 12 },
  { month: "May", bids: 37, won: 15 }
];

export const departmentWinRates = [
  { department: "UP RED", winRate: 79 },
  { department: "UP PWD", winRate: 72 },
  { department: "CPWD", winRate: 65 },
  { department: "Housing", winRate: 61 },
  { department: "NHAI", winRate: 58 }
];

export const financials = [
  { label: "Pipeline", valueCr: 321.5 },
  { label: "Likely won", valueCr: 201.8 },
  { label: "Weighted risk", valueCr: 67.2 },
  { label: "EMD blocked", valueCr: 3.25 }
];

export const marketNotes = [
  "Construction tender demand is concentrated in PWD, CPWD, NHAI, housing boards, development authorities, Jal Nigam/water boards and local bodies.",
  "UP has active road, CC road, PWD repair, housing, border infrastructure and rural engineering packages that fit small-to-large contractors.",
  "All-state tracking needs portal adapters for GePNIC/eProcure, UP eTender, state PWD portals, housing boards and municipal procurement pages.",
  "CEO decisioning should check EMD/PBG blocked capital, contractor class, turnover, similar work, plant access, local approvals and defect liability.",
  "L1 remains important in civil works, but EPC and large public buildings need schedule risk, escalation clauses, cashflow and subcontractor readiness."
];
