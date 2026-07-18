"use client";

import { Bell, Download, FileSpreadsheet, IndianRupee, Timer, Trophy } from "lucide-react";
import { DepartmentWinChart, MonthlyBidChart } from "@/components/charts";
import { Badge, Progress, SectionHeader, ScoreRing } from "@/components/ui";
import { TenderTable } from "@/components/tender-table";
import { marketNotes, tenders } from "@/lib/data";
import { formatCr } from "@/lib/utils";

const today = new Date("2026-06-08T00:00:00+05:30");
const active = tenders.filter((tender) => (tender.status === "Open" || tender.status === "Closing") && !isPastDeadline(tender.deadline));
const hiddenClosed = tenders.filter((tender) => (tender.status === "Open" || tender.status === "Closing") && isPastDeadline(tender.deadline)).length;
const closingSoon = active.filter((tender) => daysUntil(tender.deadline) <= 7).length;
const pipeline = active.reduce((sum, tender) => sum + tender.valueCr, 0);
const weightedForecast = active.reduce((sum, tender) => sum + tender.valueCr * (tender.winProbability / 100), 0);
const winRate = Math.round(tenders.reduce((sum, tender) => sum + tender.winProbability, 0) / tenders.length);
const bestTender = [...active].sort((a, b) => b.aiScore - a.aiScore)[0] || [...tenders].sort((a, b) => b.aiScore - a.aiScore)[0];
const dashboardAlerts = buildDashboardAlerts();

export function Dashboard() {
  function exportBoardReport() {
    const content = [
      "<html><head><title>TenderLens Board Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}h1{margin-bottom:4px}.kpi{display:inline-block;margin:8px 16px 8px 0;padding:12px;border:1px solid #cbd5e1}</style></head><body>",
      "<h1>Construction Tender Dashboard</h1>",
      "<p>Board-ready tender pipeline report</p>",
      `<div class='kpi'><b>Active tenders</b><br/>${active.length}</div>`,
      `<div class='kpi'><b>Pipeline value</b><br/>${formatCr(pipeline)}</div>`,
      `<div class='kpi'><b>Win rate</b><br/>${winRate}%</div>`,
      `<div class='kpi'><b>Closing in 7 days</b><br/>${closingSoon}</div>`,
      "<table><thead><tr><th>Tender</th><th>Department</th><th>Value</th><th>Deadline</th><th>EMD</th><th>AI Score</th><th>Status</th></tr></thead><tbody>",
      ...tenders.map((tender) => `<tr><td>${escapeHtml(tender.title)}<br/><small>${escapeHtml(tender.id)}</small></td><td>${escapeHtml(tender.department)}</td><td>${formatCr(tender.valueCr)}</td><td>${tender.deadline}</td><td>${tender.emdLakh} lakh</td><td>${tender.aiScore}</td><td>${tender.status}</td></tr>`),
      "</tbody></table><script>window.print()</script></body></html>"
    ].join("");
    const report = window.open("", "_blank", "noopener,noreferrer");
    report?.document.write(content);
    report?.document.close();
  }

  function exportExcelCsv() {
    const csv = [
      ["Tender ID", "Title", "Portal", "State", "Department", "Category", "Value Cr", "Deadline", "EMD Lakh", "AI Score", "Status"].join(","),
      ...tenders.map((tender) =>
        [
          tender.id,
          tender.title,
          tender.portal,
          tender.state || "",
          tender.department,
          tender.category,
          tender.valueCr,
          tender.deadline,
          tender.emdLakh,
          tender.aiScore,
          tender.status
        ].map(csvCell).join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "construction-tender-dashboard.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Construction Tender Dashboard"
        kicker="UP + all-India civil works"
        action={
          <div className="flex gap-2">
            <button onClick={exportBoardReport} className="inline-flex h-10 items-center gap-2 rounded bg-slate-900 px-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button onClick={exportExcelCsv} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi title="Actionable tenders" value={active.length.toString()} icon={<Timer className="h-5 w-5" />} tone="blue" detail={`${hiddenClosed} stale/closed hidden from spend`} />
        <Kpi title="Pipeline value" value={formatCr(pipeline)} icon={<IndianRupee className="h-5 w-5" />} tone="green" detail={`${formatCr(weightedForecast)} weighted forecast`} />
        <Kpi title="Win rate" value={`${winRate}%`} icon={<Trophy className="h-5 w-5" />} tone="amber" detail="Average fit score across tracked rows" />
        <Kpi title="Closing in 7 days" value={closingSoon.toString()} icon={<Bell className="h-5 w-5" />} tone="red" detail="Needs deadline/corrigendum check" />
      </div>

      <section className="panel p-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="blue">CEO explanation</Badge>
              <Badge tone="green">Current open pipeline</Badge>
              <Badge tone="amber">Civil works focus</Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">What this dashboard means</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This is the first-screen command view for UP and all-India construction tenders. It separates actionable open tenders from stale/past-deadline rows,
              highlights realistic pipeline value, and points the team toward deadline, EMD/PBG, BOQ and source-verification work.
            </p>
          </div>
          <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Today&apos;s dashboard call</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-950 dark:text-white">{active.length}</span> tenders are actionable after removing past-deadline rows.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{bestTender.title}</span> is currently the strongest AI-fit tender.</p>
              <p>Before bid spend, verify source PDF/BOQ, EMD/PBG and latest corrigendum for every high-value row.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Live Tender Feed</h2>
            <TenderTable compact />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-4">
              <h2 className="mb-3 text-lg font-semibold">Win Rate by Department</h2>
              <DepartmentWinChart />
            </div>
            <div className="panel p-4">
              <h2 className="mb-3 text-lg font-semibold">Monthly Bid Volume</h2>
              <MonthlyBidChart />
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <div className="panel p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">AI Win Predictor</p>
                <h2 className="mt-1 text-lg font-semibold">{bestTender.title}</h2>
              </div>
              <ScoreRing score={bestTender.aiScore} />
            </div>
            <Progress value={bestTender.winProbability} tone="green" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Probability" value={`${bestTender.winProbability}%`} />
              <Metric label="Bid range" value={`${formatCr(bestTender.recommendedBidLowCr)}-${formatCr(bestTender.recommendedBidHighCr)}`} />
              <Metric label="Risk" value={bestTender.risk} />
              <Metric label="PBG" value={`${bestTender.pbgPercent}%`} />
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 text-lg font-semibold">Smart Alerts</h2>
            <div className="space-y-3">
              {dashboardAlerts.map((alert) => (
                <div key={alert.id} className="rounded border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge tone={alert.severity === "Critical" ? "red" : alert.severity === "Warning" ? "amber" : "blue"}>{alert.severity}</Badge>
                    <span className="text-xs text-slate-500">{alert.time}</span>
                  </div>
                  <p className="text-sm font-medium">{alert.title}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="mb-4 text-lg font-semibold">Bid Readiness Tracker</h2>
            {[
              { label: "Source PDF/NIT verification", value: 68, status: "Verify" },
              { label: "BOQ and costing readiness", value: 58, status: "Needs BOQ" },
              { label: "EMD/PBG finance check", value: 72, status: "Finance review" },
              { label: "PQ document mapping", value: 76, status: "In progress" },
              { label: "Corrigendum watch", value: 64, status: "Open" }
            ].map((item) => (
              <div key={item.label} className="mb-3 last:mb-0">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-slate-500">{item.status}</span>
                </div>
                <Progress value={item.value} tone={item.value >= 75 ? "green" : item.value >= 55 ? "amber" : "red"} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel p-5">
        <h2 className="mb-3 text-lg font-semibold">Market Read</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {marketNotes.map((note) => (
            <p key={note} className="rounded border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{note}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function Kpi({ title, value, icon, tone, detail }: { title: string; value: string; icon: React.ReactNode; tone: "blue" | "green" | "amber" | "red"; detail: string }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
  };
  return (
    <div className="panel p-4">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded ${tones[tone]}`}>{icon}</div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function buildDashboardAlerts() {
  const deadlineAlerts = tenders
    .map((tender) => ({ tender, days: daysUntil(tender.deadline) }))
    .filter((item) => Number.isFinite(item.days) && item.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)
    .map(({ tender, days }) => ({
      id: `deadline-${tender.id}`,
      severity: days < 0 ? "Critical" as const : days <= 2 ? "Critical" as const : "Warning" as const,
      time: days < 0 ? `${Math.abs(days)}d past` : `${days}d left`,
      title: days < 0
        ? `${tender.title} is past deadline; no bid spend unless corrigendum reopens`
        : `${tender.title} closes in ${days} day${days === 1 ? "" : "s"}; freeze bid/no-bid`
    }));

  const financeAlerts = [...active]
    .sort((a, b) => (b.emdLakh / 100 + (b.valueCr * b.pbgPercent) / 100) - (a.emdLakh / 100 + (a.valueCr * a.pbgPercent) / 100))
    .slice(0, 1)
    .map((tender) => ({
      id: `finance-${tender.id}`,
      severity: "Warning" as const,
      time: "Finance",
      title: `${tender.title}: verify EMD Rs. ${tender.emdLakh}L and PBG ${tender.pbgPercent}% before approval`
    }));

  const sourceAlerts = tenders
    .filter((tender) => tender.valueCr <= 0 || tender.emdLakh <= 0 || tender.deadline === "See portal")
    .slice(0, 1)
    .map((tender) => ({
      id: `source-${tender.id}`,
      severity: "Info" as const,
      time: "Verify",
      title: `${tender.title}: source value/EMD/deadline needs official portal verification`
    }));

  return [...deadlineAlerts, ...financeAlerts, ...sourceAlerts].slice(0, 5);
}

function isPastDeadline(deadline: string) {
  const date = parseDeadline(deadline);
  return Boolean(date && date < today);
}

function daysUntil(deadline: string) {
  const date = parseDeadline(deadline);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function parseDeadline(deadline: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  return new Date(`${deadline}T00:00:00+05:30`);
}
