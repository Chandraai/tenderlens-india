"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, CheckCircle2, FileSpreadsheet, IndianRupee, Landmark, ShieldAlert, Target, TrendingUp, WalletCards } from "lucide-react";
import { useState } from "react";
import { Badge, Progress, SectionHeader } from "@/components/ui";
import { tenders } from "@/lib/data";
import { formatCr } from "@/lib/utils";

const active = tenders.filter((tender) => tender.status === "Open" || tender.status === "Closing");
const pipelineCr = active.reduce((sum, tender) => sum + tender.valueCr, 0);
const weightedForecastCr = active.reduce((sum, tender) => sum + tender.valueCr * (tender.winProbability / 100), 0);
const emdBlockedCr = active.reduce((sum, tender) => sum + tender.emdLakh / 100, 0);
const pbgExposureCr = active.reduce((sum, tender) => sum + (tender.valueCr * tender.pbgPercent) / 100, 0);
const avgMargin = active.length ? active.reduce((sum, tender) => sum + tender.marginPercent, 0) / active.length : 0;
const highCapitalRows = [...active].sort((a, b) => b.emdLakh - a.emdLakh).slice(0, 6);
const forecastRows = [...active]
  .map((tender) => ({
    id: tender.id,
    name: shortName(tender.title),
    valueCr: round(tender.valueCr),
    forecastCr: round(tender.valueCr * (tender.winProbability / 100)),
    margin: tender.marginPercent,
    emdCr: round(tender.emdLakh / 100)
  }))
  .sort((a, b) => b.forecastCr - a.forecastCr)
  .slice(0, 8);
const topForecastTender = [...active].sort((a, b) => (b.valueCr * b.winProbability) - (a.valueCr * a.winProbability))[0];
const topCapitalTender = [...active].sort((a, b) => (b.emdLakh / 100 + (b.valueCr * b.pbgPercent) / 100) - (a.emdLakh / 100 + (a.valueCr * a.pbgPercent) / 100))[0];
const tightMarginCount = active.filter((tender) => tender.marginPercent > 0 && tender.marginPercent < 9).length;
const highPriorityCount = active.filter((tender) => tender.valueCr * (tender.winProbability / 100) > 20 && tender.marginPercent >= 10).length;
const forecastConversion = pipelineCr ? (weightedForecastCr / pipelineCr) * 100 : 0;
const emdCapitalRate = pipelineCr ? (emdBlockedCr / pipelineCr) * 100 : 0;

export function FinancialAnalytics() {
  const [activeView, setActiveView] = useState<FinanceView>("pipeline");

  function jumpTo(view: FinanceView) {
    setActiveView(view);
    const target = document.getElementById(view === "capital" ? "capital-section" : view === "margin" ? "guardrails-section" : view === "register" ? "register-section" : "forecast-section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportCsv() {
    const csv = [
      ["Tender ID", "Title", "Value Cr", "Win Probability", "Forecast Cr", "Margin %", "EMD Lakh", "PBG %", "Status"].join(","),
      ...active.map((tender) =>
        [
          tender.id,
          tender.title,
          tender.valueCr,
          tender.winProbability,
          round(tender.valueCr * (tender.winProbability / 100)),
          tender.marginPercent,
          tender.emdLakh,
          tender.pbgPercent,
          tender.status
        ].map(csvCell).join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "financial-analytics.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financial Analytics"
        kicker="Construction pipeline, margin, EMD, PBG and forecast"
        action={
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiButton title="Pipeline value" value={formatCr(pipelineCr)} icon={<IndianRupee className="h-5 w-5" />} tone="blue" active={activeView === "pipeline"} onClick={() => jumpTo("pipeline")} detail="Open bid value chart" />
        <KpiButton title="Weighted forecast" value={formatCr(weightedForecastCr)} icon={<TrendingUp className="h-5 w-5" />} tone="green" active={activeView === "forecast"} onClick={() => jumpTo("forecast")} detail="Open forecast chart" />
        <KpiButton title="EMD blocked" value={formatCr(emdBlockedCr)} icon={<WalletCards className="h-5 w-5" />} tone="amber" active={activeView === "capital"} onClick={() => jumpTo("capital")} detail="Open capital exposure" />
        <KpiButton title="PBG exposure" value={formatCr(pbgExposureCr)} icon={<Landmark className="h-5 w-5" />} tone="red" active={activeView === "capital"} onClick={() => jumpTo("capital")} detail="Open PBG exposure" />
        <KpiButton title="Avg margin" value={`${avgMargin.toFixed(1)}%`} icon={<Banknote className="h-5 w-5" />} tone="green" active={activeView === "margin"} onClick={() => jumpTo("margin")} detail="Open margin guardrails" />
      </div>

      <section className="panel p-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">CEO explanation</Badge>
              <Badge tone="amber">Cash exposure</Badge>
              <Badge tone="green">Forecast realism</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">What this page means</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This page turns tender values into finance decisions. Use it to see how much revenue is realistic, how much EMD/PBG capital can get blocked,
              which bids deserve CEO priority, and where margin is too thin for safe approval.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FinanceStep title="1. Forecast revenue" text="Weighted forecast applies win probability to the pipeline." />
              <FinanceStep title="2. Check blocked capital" text="EMD and PBG show cash/BG exposure before submission." />
              <FinanceStep title="3. Protect margin" text="Low-margin bids need BOQ recosting or CEO exception." />
            </div>
          </div>
          <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Today&apos;s finance call</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-950 dark:text-white">{formatCr(weightedForecastCr)}</span> is the realistic forecast from {formatCr(pipelineCr)} open pipeline.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{topForecastTender?.title || "No tender"}</span> is the largest forecast contributor.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{topCapitalTender?.title || "No tender"}</span> needs finance approval first because EMD/PBG exposure is highest.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <DecisionCard icon={<Target className="h-5 w-5" />} title="Priority bids" value={`${highPriorityCount}`} text="Forecast above ₹20 Cr with healthy margin." tone="green" />
        <DecisionCard icon={<ShieldAlert className="h-5 w-5" />} title="Margin watch" value={`${tightMarginCount}`} text="Bids below 9% margin need recosting." tone="amber" />
        <DecisionCard icon={<WalletCards className="h-5 w-5" />} title="EMD intensity" value={`${emdCapitalRate.toFixed(2)}%`} text="EMD as percentage of open pipeline." tone="blue" />
        <DecisionCard icon={<TrendingUp className="h-5 w-5" />} title="Forecast conversion" value={`${forecastConversion.toFixed(1)}%`} text="How much pipeline is realistically weighted." tone="green" />
      </section>

      <div id="forecast-section" className="scroll-mt-28 grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
        <div className="panel min-w-0 p-4">
          <PanelTitle title="Pipeline vs realistic forecast" caption="Blue is total bid value; green is win-probability weighted revenue" />
          <div className="h-[340px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastRows} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis tickFormatter={(value) => `₹${value}`} width={48} />
                <Tooltip formatter={(value) => [formatCr(Number(value)), ""]} />
                <Legend />
                <Bar dataKey="valueCr" name="Bid value" fill="#1976d2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="forecastCr" name="Forecast" fill="#1c9a7d" radius={[6, 6, 0, 0]} />
                <Line dataKey="margin" name="Margin %" stroke="#f59e0b" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="capital-section" className="panel min-w-0 scroll-mt-28 p-4">
          <PanelTitle title="EMD and PBG exposure" caption="Largest cash/BG lock-ups requiring finance approval before submission" />
          <div className="h-[340px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={highCapitalRows.map((tender) => ({ name: shortName(tender.title), emdCr: round(tender.emdLakh / 100), pbgCr: round((tender.valueCr * tender.pbgPercent) / 100) }))} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
                <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [formatCr(Number(value)), ""]} />
                <Bar dataKey="emdCr" name="EMD" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                <Bar dataKey="pbgCr" name="PBG" fill="#e11d48" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
        <div id="guardrails-section" className="panel scroll-mt-28 p-4">
          <PanelTitle title="Finance Guardrails" caption="Simple red-flag checks before bid spend" />
          <div className="space-y-4">
            <Guardrail label="EMD capital used" value={(emdBlockedCr / Math.max(pipelineCr * 0.02, 1)) * 100} note={`${formatCr(emdBlockedCr)} blocked now`} tone="amber" />
            <Guardrail label="Forecast conversion" value={(weightedForecastCr / Math.max(pipelineCr, 1)) * 100} note={`${formatCr(weightedForecastCr)} weighted forecast`} tone="green" />
            <Guardrail label="Margin comfort" value={avgMargin * 6} note={`${avgMargin.toFixed(1)}% average margin`} tone={avgMargin >= 11 ? "green" : "amber"} />
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>CEO rule: do not approve final commercial bid until EMD payment mode, PBG/BG limit, GST/tax treatment, BOQ margin and payment cycle are signed off.</p>
              </div>
            </div>
          </div>
        </div>

        <div id="register-section" className="panel min-w-0 scroll-mt-28 overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <PanelTitle title="Tender Finance Register" caption="CEO-ready action register; values are in crore/lakh units" />
          </div>
          <div className="space-y-3 p-3 xl:hidden">
            {active.map((tender) => {
              const forecast = tender.valueCr * (tender.winProbability / 100);
              return (
                <article key={tender.id} className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold leading-snug text-slate-950 dark:text-white">{tender.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{tender.id}</p>
                    </div>
                    <Badge tone={forecast > 20 && tender.marginPercent >= 10 ? "green" : tender.risk === "High" ? "red" : "amber"}>{forecast > 20 && tender.marginPercent >= 10 ? "Prioritize" : tender.risk === "High" ? "CEO Review" : "Watch"}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <FinanceMiniMetric label="Bid value" value={formatCr(tender.valueCr)} />
                    <FinanceMiniMetric label="Forecast" value={formatCr(forecast)} />
                    <FinanceMiniMetric label="Margin" value={`${tender.marginPercent}%`} />
                    <FinanceMiniMetric label="EMD" value={`Rs. ${tender.emdLakh} L`} />
                    <FinanceMiniMetric label="PBG" value={formatCr((tender.valueCr * tender.pbgPercent) / 100)} />
                    <FinanceMiniMetric label="Status" value={tender.status} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tender</th>
                  <th className="px-4 py-3">Bid Value</th>
                  <th className="px-4 py-3">Forecast</th>
                  <th className="px-4 py-3">Margin</th>
                  <th className="px-4 py-3">EMD</th>
                  <th className="px-4 py-3">PBG</th>
                  <th className="px-4 py-3">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {active.map((tender) => {
                  const forecast = tender.valueCr * (tender.winProbability / 100);
                  return (
                    <tr key={tender.id} className="align-top">
                      <td className="max-w-[280px] px-4 py-4">
                        <p className="font-medium leading-snug text-slate-950 dark:text-white">{tender.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{tender.id}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold">{formatCr(tender.valueCr)}</td>
                      <td className="px-4 py-4">{formatCr(forecast)}</td>
                      <td className="px-4 py-4"><Badge tone={tender.marginPercent >= 12 ? "green" : tender.marginPercent >= 9 ? "amber" : "red"}>{tender.marginPercent}%</Badge></td>
                      <td className="px-4 py-4">₹{tender.emdLakh} L</td>
                      <td className="px-4 py-4">{formatCr((tender.valueCr * tender.pbgPercent) / 100)}</td>
                      <td className="px-4 py-4"><Badge tone={forecast > 20 && tender.marginPercent >= 10 ? "green" : tender.risk === "High" ? "red" : "amber"}>{forecast > 20 && tender.marginPercent >= 10 ? "Prioritize" : tender.risk === "High" ? "CEO Review" : "Watch"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionNote icon={<CheckCircle2 className="h-5 w-5" />} title="Approve bid spend when" text="Forecast is meaningful, margin is above guardrail, EMD/PBG limits are available, and BOQ value is verified." />
        <ActionNote icon={<AlertTriangle className="h-5 w-5" />} title="Hold for clarification when" text="Value, deadline, EMD, PBG, GST/tax treatment or payment cycle is still marked verify." />
        <ActionNote icon={<ShieldAlert className="h-5 w-5" />} title="No-bid finance trigger" text="Margin falls below floor, PBG/BG exposure is too high, or working-capital cycle damages cashflow." />
      </section>
    </div>
  );
}

function FinanceMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-2 dark:border-slate-800">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function FinanceStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function DecisionCard({ icon, title, value, text, tone }: { icon: React.ReactNode; title: string; value: string; text: string; tone: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    red: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
  };
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className={`grid h-10 w-10 place-items-center rounded ring-1 ${toneClass[tone]}`}>{icon}</span>
      <p className="mt-4 text-xs font-medium uppercase text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function ActionNote({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

type FinanceView = "pipeline" | "forecast" | "capital" | "margin" | "register";

function KpiButton({
  title,
  value,
  icon,
  tone,
  active,
  onClick,
  detail
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "red";
  active: boolean;
  onClick: () => void;
  detail: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${active ? "border-brand-500 ring-2 ring-brand-500/20" : ""}`}
    >
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded ${tones[tone]}`}>{icon}</div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs font-medium text-brand-700 dark:text-brand-50">{detail}</p>
    </button>
  );
}

function PanelTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function Guardrail({ label, value, note, tone }: { label: string; value: number; note: string; tone: "green" | "amber" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{note}</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, value))} tone={tone} />
    </div>
  );
}

function shortName(value: string) {
  return value
    .replace(/construction of/gi, "")
    .replace(/works?/gi, "")
    .trim()
    .slice(0, 24);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
