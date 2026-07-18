"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, IndianRupee, ShieldCheck, XCircle } from "lucide-react";
import { Badge, Progress } from "@/components/ui";
import { tenders } from "@/lib/data";
import { formatCr, formatLakh } from "@/lib/utils";
import type { Tender } from "@/lib/types";

type Decision = "Approve Bid" | "Hold for Review" | "No-Bid";

const marketRules = [
  "Technical bid rejection risk usually comes from PQ mismatch, wrong EMD/BG format, missing turnover/similar-work proof, or annexure non-compliance.",
  "Civil works pricing is L1-heavy; EPC and large building works also need schedule, escalation, site handover, safety and cashflow review.",
  "EMD, PBG/additional performance security, retention, mobilisation advance and working-capital cycle must be cleared before CEO approval.",
  "For CPWD/PWD/NHAI style tenders, contractor class, similar completed work, bid capacity, key personnel and plant access are decision gates."
];

export function CeoAiInsights() {
  const [selectedId, setSelectedId] = useState(tenders[0]?.id);
  const [decision, setDecision] = useState<Decision | null>(null);
  const selected = tenders.find((tender) => tender.id === selectedId) || tenders[0];
  const portfolio = useMemo(() => buildPortfolio(), []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Open pipeline" value={formatCr(portfolio.pipeline)} icon={<IndianRupee className="h-5 w-5" />} />
        <SummaryCard label="EMD blocked" value={formatCr(portfolio.emdCr)} icon={<ShieldCheck className="h-5 w-5" />} />
        <SummaryCard label="CEO approve-ready" value={portfolio.approveReady.toString()} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label="High-risk reviews" value={portfolio.highRisk.toString()} icon={<AlertTriangle className="h-5 w-5" />} />
      </section>

      <section className="panel overflow-hidden">
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="order-2 border-t border-slate-200 p-4 dark:border-slate-800 lg:order-1 lg:border-r lg:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tender Decision Queue</h2>
              <Badge tone="blue">{tenders.length} open</Badge>
            </div>
            <div className="space-y-2">
              {tenders.map((tender) => (
                <button
                  key={tender.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(tender.id);
                    setDecision(null);
                  }}
                  className={`w-full rounded border p-3 text-left transition ${selected.id === tender.id ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone={decisionTone(recommendDecision(tender))}>{recommendDecision(tender)}</Badge>
                    <span className="text-xs text-slate-500">{tender.state}</span>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold">{tender.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatCr(tender.valueCr)} · {tender.department}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="order-1 lg:order-2">
            <TenderDecisionPanel tender={selected} decision={decision} setDecision={setDecision} />
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-lg font-semibold">Indian Construction Tender Decision Rules</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {marketRules.map((rule) => (
            <p key={rule} className="rounded border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{rule}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function TenderDecisionPanel({ tender, decision, setDecision }: { tender: Tender; decision: Decision | null; setDecision: (decision: Decision) => void }) {
  const recommended = recommendDecision(tender);
  const bidCapacity = bidCapacityScore(tender);
  const financeExposure = Math.round(((tender.emdLakh / 100) + (tender.valueCr * tender.pbgPercent) / 100) * 10) / 10;
  const pqPassed = tender.pqChecks.filter((check) => check.passed).length;
  const pqScore = Math.round((pqPassed / tender.pqChecks.length) * 100);
  const risks = buildRiskRegister(tender);

  return (
    <div className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone={decisionTone(recommended)}>AI says: {recommended}</Badge>
            <Badge tone={tender.risk === "Low" ? "green" : tender.risk === "Medium" ? "amber" : "red"}>{tender.risk} risk</Badge>
            <Badge tone="blue">{tender.portal}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{tender.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{tender.id} · {tender.department} · {tender.state}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DecisionButton label="Approve Bid" icon={<CheckCircle2 className="h-4 w-4" />} active={decision === "Approve Bid"} onClick={() => setDecision("Approve Bid")} tone="green" />
          <DecisionButton label="Hold for Review" icon={<AlertTriangle className="h-4 w-4" />} active={decision === "Hold for Review"} onClick={() => setDecision("Hold for Review")} tone="amber" />
          <DecisionButton label="No-Bid" icon={<XCircle className="h-4 w-4" />} active={decision === "No-Bid"} onClick={() => setDecision("No-Bid")} tone="red" />
          <button type="button" onClick={() => downloadBoardMemo(tender, decision || recommended)} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
            <Download className="h-4 w-4" />
            Board memo
          </button>
        </div>
      </div>

      {decision ? (
        <div className="mt-4 rounded border border-brand-500/30 bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-50">
          CEO decision recorded locally: {decision}. Export board memo for approval trail.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Tender value" value={formatCr(tender.valueCr)} />
        <Metric label="EMD" value={formatLakh(tender.emdLakh)} />
        <Metric label="PBG" value={`${tender.pbgPercent}%`} />
        <Metric label="Deadline" value={tender.deadline} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ScorePanel label="Win probability" value={tender.winProbability} detail={`L1 estimate ${formatCr(tender.competitorEstimateCr)}`} />
        <ScorePanel label="PQ readiness" value={pqScore} detail={`${pqPassed}/${tender.pqChecks.length} gates passed`} />
        <ScorePanel label="Bid capacity" value={bidCapacity} detail={`Exposure approx ${formatCr(financeExposure)}`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <InsightBlock
          title="CEO Approval Gates"
          items={[
            `Finance: EMD + PBG exposure approx ${formatCr(financeExposure)}.`,
            `Pricing: recommended bid band ${formatCr(tender.recommendedBidLowCr)} to ${formatCr(tender.recommendedBidHighCr)}.`,
            `Margin guardrail: do not go below ${Math.max(7, Math.round(tender.marginPercent - 2))}% without CEO approval.`,
            tender.risk === "High" ? "Legal/project team must sign off before pricing." : "Commercial team can proceed after PQ proof check."
          ]}
        />
        <InsightBlock title="PQ Eligibility" items={tender.pqChecks.map((check) => `${check.passed ? "Pass" : "Gap"}: ${check.label}`)} />
        <InsightBlock title="Risk Register" items={risks} />
        <InsightBlock
          title="L1 / Bid Strategy"
          items={[
            `Target L1 zone: ${formatCr(tender.recommendedBidLowCr)}-${formatCr(tender.recommendedBidHighCr)}.`,
            "Validate BOQ quantities, drawings, site handover, material escalation and labour availability.",
            "Check whether additional performance security applies for aggressive discounting.",
            "Use similar-work references and contractor registration class as technical-bid protection."
          ]}
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-50">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ScorePanel({ label, value, detail }: { label: string; value: number; detail: string }) {
  const tone = value >= 75 ? "green" : value >= 55 ? "amber" : "red";
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-lg font-semibold">{value}%</span>
      </div>
      <Progress value={value} tone={tone} />
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function InsightBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function DecisionButton({ label, icon, active, onClick, tone }: { label: Decision; icon: React.ReactNode; active: boolean; onClick: () => void; tone: "green" | "amber" | "red" }) {
  const colors = {
    green: active ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "",
    amber: active ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "",
    red: active ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : ""
  };
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700 ${colors[tone]}`}>
      {icon}
      {label}
    </button>
  );
}

function buildPortfolio() {
  const active = tenders.filter((tender) => tender.status === "Open" || tender.status === "Closing");
  return {
    pipeline: active.reduce((sum, tender) => sum + tender.valueCr, 0),
    emdCr: active.reduce((sum, tender) => sum + tender.emdLakh / 100, 0),
    approveReady: active.filter((tender) => recommendDecision(tender) === "Approve Bid").length,
    highRisk: active.filter((tender) => tender.risk === "High" || tender.pqChecks.some((check) => !check.passed)).length
  };
}

function recommendDecision(tender: Tender): Decision {
  if (tender.status === "Closed") return "No-Bid";
  const pqScore = tender.pqChecks.filter((check) => check.passed).length / tender.pqChecks.length;
  if (tender.risk === "High" || tender.winProbability < 58 || pqScore < 0.67) return "Hold for Review";
  if (tender.marginPercent < 8 || tender.aiScore < 58) return "No-Bid";
  return "Approve Bid";
}

function decisionTone(decision: Decision) {
  if (decision === "Approve Bid") return "green";
  if (decision === "Hold for Review") return "amber";
  return "red";
}

function bidCapacityScore(tender: Tender) {
  const exposure = tender.emdLakh / 100 + (tender.valueCr * tender.pbgPercent) / 100;
  const score = 92 - exposure * 4 - (tender.risk === "High" ? 18 : tender.risk === "Medium" ? 8 : 0);
  return Math.max(20, Math.min(95, Math.round(score)));
}

function buildRiskRegister(tender: Tender) {
  const risks = [
    `EMD/PBG exposure: ${formatLakh(tender.emdLakh)} EMD and ${tender.pbgPercent}% PBG.`,
    `Execution risk: ${tender.clauses.slice(0, 2).join(", ")}.`,
    tender.pqChecks.some((check) => !check.passed) ? `PQ gaps: ${tender.pqChecks.filter((check) => !check.passed).map((check) => check.label).join(", ")}.` : "PQ documents appear largely ready.",
    tender.deadline <= "2026-05-20" ? "Deadline is tight; submission calendar needs same-day owner." : "Submission window is manageable."
  ];
  return risks;
}

function downloadBoardMemo(tender: Tender, decision: Decision) {
  const memo = [
    "TenderLens CEO Board Memo",
    `Tender: ${tender.title}`,
    `Decision: ${decision}`,
    `Department: ${tender.department}`,
    `State: ${tender.state}`,
    `Value: ${formatCr(tender.valueCr)}`,
    `EMD: ${formatLakh(tender.emdLakh)}`,
    `PBG: ${tender.pbgPercent}%`,
    `Win probability: ${tender.winProbability}%`,
    `Bid band: ${formatCr(tender.recommendedBidLowCr)}-${formatCr(tender.recommendedBidHighCr)}`,
    "",
    "Approval Gates",
    ...buildRiskRegister(tender).map((item) => `- ${item}`),
    "",
    "PQ Checks",
    ...tender.pqChecks.map((check) => `- ${check.passed ? "PASS" : "GAP"}: ${check.label}`)
  ].join("\n");
  const blob = new Blob([memo], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${tender.id.replace(/[^a-z0-9]/gi, "-")}-board-memo.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
