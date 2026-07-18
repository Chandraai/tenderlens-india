"use client";

import { AlertTriangle, BellRing, CheckCircle2, Clock3, ExternalLink, Filter, RefreshCw, ShieldAlert, Siren, Target, UserCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, SectionHeader } from "@/components/ui";
import { tenders } from "@/lib/data";
import { formatCr } from "@/lib/utils";
import type { Tender } from "@/lib/types";

type SmartAlert = {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  category: "Deadline" | "Finance" | "Verification" | "Margin" | "CEO approval";
  title: string;
  detail: string;
  owner: string;
  action: string;
  time: string;
  tender?: Tender;
};

const today = new Date("2026-06-08T00:00:00+05:30");
const categories = ["All", "Deadline", "Finance", "Verification", "Margin", "CEO approval"];

export default function AlertsPage() {
  const [category, setCategory] = useState("All");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const smartAlerts = useMemo(() => buildSmartAlerts(), []);
  const visible = useMemo(() => smartAlerts.filter((alert) => category === "All" || alert.category === category), [category, smartAlerts]);
  const pending = smartAlerts.filter((alert) => !acknowledged.includes(alert.id));
  const criticalCount = pending.filter((alert) => alert.severity === "Critical").length;
  const deadlineCount = pending.filter((alert) => alert.category === "Deadline").length;
  const financeExposureCr = tenders.reduce((sum, tender) => sum + tender.emdLakh / 100 + (tender.valueCr * tender.pbgPercent) / 100, 0);

  function syncAlerts() {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      setNotice(`Synced ${smartAlerts.length} action alerts at ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`);
    }, 700);
  }

  function notifyTeam() {
    setNotice(`Notification queued for ${pending.length} pending alert${pending.length === 1 ? "" : "s"} across bid, finance and tender-desk owners.`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alert Center"
        kicker="Deadline, corrigendum, finance and source-verification actions"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={syncAlerts} disabled={syncing} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync alerts
            </button>
            <button type="button" onClick={notifyTeam} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              <BellRing className="h-4 w-4" />
              Notify owners
            </button>
          </div>
        }
      />

      {notice ? <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">{notice}</p> : null}

      <section className="panel p-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">CEO explanation</Badge>
              <Badge tone="red">No-bid protection</Badge>
              <Badge tone="amber">Owner actions</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">What this page means</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Alert Center converts tender signals into tasks. It tells the team what is urgent, who owns it, and what action blocks CEO approval.
              Past deadlines are marked as no-bid/corrigendum watch, while unverified value, EMD, PBG and BOQ fields are kept out of approval.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Step title="1. Stop wrong spend" text="Closed/past-deadline tenders cannot consume EMD or pricing effort." />
              <Step title="2. Assign owner" text="Every alert has a bid, finance, tender-desk or CEO owner." />
              <Step title="3. Clear blockers" text="Acknowledge only after source, finance or PQ evidence is checked." />
            </div>
          </div>
          <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Today&apos;s alert call</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-950 dark:text-white">{criticalCount}</span> critical pending alerts need same-day decision.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{deadlineCount}</span> deadline/corrigendum alerts should be checked before bid-team effort starts.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{formatCr(financeExposureCr)}</span> total EMD + PBG exposure needs finance visibility.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Critical pending" value={criticalCount.toString()} icon={<Siren className="h-5 w-5" />} tone="red" detail="Needs same-day owner action" />
        <Kpi title="Deadline actions" value={deadlineCount.toString()} icon={<Clock3 className="h-5 w-5" />} tone="amber" detail="Close/corrigendum checks" />
        <Kpi title="Finance exposure" value={formatCr(financeExposureCr)} icon={<ShieldAlert className="h-5 w-5" />} tone="blue" detail="EMD + PBG watch" />
        <Kpi title="Acknowledged" value={`${acknowledged.length}/${smartAlerts.length}`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" detail="Cleared action trail" />
      </div>

      <div className="panel p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded border px-3 py-1.5 text-sm font-medium ${category === item ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-50" : "border-slate-200 dark:border-slate-700"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {visible.map((alert) => {
            const done = acknowledged.includes(alert.id);
            return (
              <article key={alert.id} className={`rounded border p-4 ${done ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded ${alert.severity === "Critical" ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : alert.severity === "Warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
                      {alert.severity === "Critical" ? <AlertTriangle className="h-5 w-5" /> : alert.category === "Finance" ? <WalletCards className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge tone={alert.severity === "Critical" ? "red" : alert.severity === "Warning" ? "amber" : "blue"}>{alert.severity}</Badge>
                        <Badge tone="slate">{alert.category}</Badge>
                        <Badge tone="blue">{alert.owner}</Badge>
                      </div>
                      <h2 className="font-semibold text-slate-950 dark:text-white">{alert.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{alert.time}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{alert.detail}</p>
                      <p className="mt-3 rounded bg-slate-50 p-3 text-sm font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-300">{alert.action}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAcknowledged((items) => (items.includes(alert.id) ? items.filter((item) => item !== alert.id) : [...items, alert.id]))}
                      className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${done ? "bg-emerald-600 text-white" : "border border-slate-200 dark:border-slate-700"}`}
                    >
                      <UserCheck className="h-4 w-4" />
                      {done ? "Acknowledged" : "Acknowledge"}
                    </button>
                    <Link href={alert.tender ? "/tenders" : "/documents"} className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
                      <ExternalLink className="h-4 w-4" />
                      Open source
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionNote icon={<Target className="h-5 w-5" />} title="Before bid spend" text="Clear deadline, corrigendum, EMD/PBG and source-value alerts before assigning estimator time." />
        <ActionNote icon={<WalletCards className="h-5 w-5" />} title="Before finance approval" text="Check EMD payment mode, BG limit, PBG percentage, validity and bank charges." />
        <ActionNote icon={<AlertTriangle className="h-5 w-5" />} title="Before CEO approval" text="Critical alerts must be acknowledged with evidence, not just marked done." />
      </section>
    </div>
  );
}

function buildSmartAlerts(): SmartAlert[] {
  const deadlineAlerts = tenders
    .map((tender) => ({ tender, date: parseDeadline(tender.deadline) }))
    .filter((item) => item.date)
    .map(({ tender, date }) => {
      const days = differenceInDays(date!, today);
      if (days < 0) {
        return {
          id: `deadline-closed-${tender.id}`,
          severity: "Critical" as const,
          category: "Deadline" as const,
          title: `Past deadline: ${tender.title}`,
          detail: `Detected deadline ${tender.deadline} is already over. Treat as no-bid unless official corrigendum reopens submission.`,
          owner: "Tender Desk",
          action: "Stop EMD/pricing spend, verify corrigendum, and archive or move to watchlist.",
          time: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past deadline`,
          tender
        };
      }
      if (days <= 7) {
        return {
          id: `deadline-soon-${tender.id}`,
          severity: days <= 2 ? "Critical" as const : "Warning" as const,
          category: "Deadline" as const,
          title: `Deadline in ${days} day${days === 1 ? "" : "s"}: ${tender.title}`,
          detail: `Submission date is ${tender.deadline}. Bid calendar, EMD, BOQ and PQ documents need owner confirmation.`,
          owner: "Bid Manager",
          action: "Freeze bid/no-bid, lock submission owner, and check latest corrigendum before pricing.",
          time: "Deadline watch",
          tender
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => deadlinePriority(a!, b!)) as SmartAlert[];

  const verificationAlerts = tenders
    .filter((tender) => tender.valueCr <= 0 || tender.emdLakh <= 0 || tender.deadline === "See portal")
    .slice(0, 4)
    .map((tender) => ({
      id: `verify-${tender.id}`,
      severity: "Warning" as const,
      category: "Verification" as const,
      title: `Source verification pending: ${tender.title}`,
      detail: "Tender value, EMD, PBG or deadline is not fully source-verified. CEO should not approve bid spend yet.",
      owner: "Analyst",
      action: "Open official source, download NIT/BOQ/GeM bid document, and update AI Insights.",
      time: "Verification pending",
      tender
    }));

  const financeAlerts = [...tenders]
    .filter((tender) => tender.valueCr > 0)
    .sort((a, b) => (b.emdLakh / 100 + (b.valueCr * b.pbgPercent) / 100) - (a.emdLakh / 100 + (a.valueCr * a.pbgPercent) / 100))
    .slice(0, 3)
    .map((tender) => ({
      id: `finance-${tender.id}`,
      severity: "Warning" as const,
      category: "Finance" as const,
      title: `High EMD/PBG exposure: ${tender.title}`,
      detail: `EMD is Rs. ${tender.emdLakh} lakh and PBG exposure is approx ${formatCr((tender.valueCr * tender.pbgPercent) / 100)}.`,
      owner: "Finance",
      action: "Check BG limits, EMD payment mode, exemption eligibility and cashflow before bid approval.",
      time: "Finance watch",
      tender
    }));

  const marginAlerts = tenders
    .filter((tender) => tender.marginPercent > 0 && tender.marginPercent < 9)
    .slice(0, 3)
    .map((tender) => ({
      id: `margin-${tender.id}`,
      severity: "Warning" as const,
      category: "Margin" as const,
      title: `Thin margin guardrail: ${tender.title}`,
      detail: `Current margin guardrail is ${tender.marginPercent}%. This needs BOQ recosting and competitor/L1 check.`,
      owner: "Estimator",
      action: "Recheck BOQ rates, escalation, site risk and net profit before final price.",
      time: "Margin watch",
      tender
    }));

  const ceoAlerts = tenders
    .filter((tender) => tender.valueCr >= 50 || tender.risk === "High")
    .slice(0, 3)
    .map((tender) => ({
      id: `ceo-${tender.id}`,
      severity: tender.risk === "High" ? "Critical" as const : "Warning" as const,
      category: "CEO approval" as const,
      title: `CEO review required: ${tender.title}`,
      detail: `Large value/risk tender with value ${formatCr(tender.valueCr)}, win probability ${tender.winProbability}% and margin ${tender.marginPercent}%.`,
      owner: "CEO",
      action: "Review finance exposure, PQ readiness, BOQ profit and no-bid triggers before commercial submission.",
      time: "CEO review",
      tender
    }));

  return [
    ...deadlineAlerts.slice(0, 6),
    ...financeAlerts,
    ...verificationAlerts,
    ...marginAlerts,
    ...ceoAlerts
  ]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || categoryRank(a.category) - categoryRank(b.category))
    .slice(0, 18);
}

function Kpi({ title, value, icon, tone, detail }: { title: string; value: string; icon: React.ReactNode; tone: "red" | "amber" | "blue" | "green"; detail: string }) {
  const tones = {
    red: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
  };
  return (
    <div className="panel p-4">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded ${tones[tone]}`}>{icon}</div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
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

function parseDeadline(deadline: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  return new Date(`${deadline}T00:00:00+05:30`);
}

function differenceInDays(date: Date, base: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - base.getTime()) / dayMs);
}

function severityRank(severity: SmartAlert["severity"]) {
  return severity === "Critical" ? 3 : severity === "Warning" ? 2 : 1;
}

function categoryRank(category: SmartAlert["category"]) {
  const order: Record<SmartAlert["category"], number> = {
    Deadline: 1,
    "CEO approval": 2,
    Finance: 3,
    Verification: 4,
    Margin: 5
  };
  return order[category];
}

function deadlinePriority(a: SmartAlert, b: SmartAlert) {
  const aClosed = a.title.startsWith("Past deadline");
  const bClosed = b.title.startsWith("Past deadline");
  if (aClosed !== bClosed) return aClosed ? 1 : -1;
  const aDays = Number(a.time.match(/\d+/)?.[0] || 99);
  const bDays = Number(b.time.match(/\d+/)?.[0] || 99);
  return aDays - bDays;
}
