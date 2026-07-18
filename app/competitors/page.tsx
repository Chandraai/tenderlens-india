"use client";

import { AlertTriangle, Building2, CheckCircle2, IndianRupee, ShieldAlert, Target, TrendingDown, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Progress, SectionHeader } from "@/components/ui";
import { competitors } from "@/lib/data";

const watchlist = competitors.map((competitor) => {
  const latestL1Index = competitor.l1Trend.at(-1) || 100;
  const firstL1Index = competitor.l1Trend[0] || latestL1Index;
  const pressure = Math.max(0, 100 - latestL1Index);
  const trendMove = latestL1Index - firstL1Index;
  const threatScore = Math.min(96, Math.round(competitor.wins * 1.6 + competitor.avgDiscount * 6 + pressure * 3));
  const posture = threatScore >= 80 ? "Avoid blind price war" : threatScore >= 65 ? "Compete selectively" : "Attack with proof";
  const tone: "red" | "amber" | "green" = threatScore >= 80 ? "red" : threatScore >= 65 ? "amber" : "green";

  return {
    ...competitor,
    latestL1Index,
    pressure,
    trendMove,
    threatScore,
    posture,
    tone
  };
});

const strongest = [...watchlist].sort((a, b) => b.threatScore - a.threatScore)[0];
const mostAggressive = [...watchlist].sort((a, b) => b.avgDiscount - a.avgDiscount)[0];
const totalWins = watchlist.reduce((sum, item) => sum + item.wins, 0);
const avgDiscount = watchlist.reduce((sum, item) => sum + item.avgDiscount, 0) / watchlist.length;
const departmentRows = Array.from(new Set(watchlist.flatMap((item) => item.dominantDepartments))).map((department) => {
  const players = watchlist.filter((item) => item.dominantDepartments.includes(department));
  const topPlayer = [...players].sort((a, b) => b.threatScore - a.threatScore)[0];
  return {
    department,
    players: players.length,
    topPlayer: topPlayer?.name || "Unknown",
    action: players.length >= 2 ? "Price with caution" : "Opportunity window"
  };
});

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Competitor Intelligence" kicker="Who we are bidding against, and how to price smarter" />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Tracked contractors" value={`${watchlist.length}`} detail="Active competitor watchlist" tone="blue" />
        <MetricCard icon={<Building2 className="h-5 w-5" />} label="Historical wins" value={`${totalWins}`} detail="Known wins in civil, buildings and EPC" tone="green" />
        <MetricCard icon={<TrendingDown className="h-5 w-5" />} label="Avg L1 discount" value={`${avgDiscount.toFixed(1)}%`} detail="How much below estimate market is going" tone="amber" />
        <MetricCard icon={<ShieldAlert className="h-5 w-5" />} label="Strongest threat" value={strongest.name} detail={`${strongest.threatScore}/100 threat score`} tone="red" />
      </section>

      <section className="panel p-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">CEO explanation</Badge>
              <Badge tone="amber">L1 pricing pressure</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">What this page means</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This page converts competitor history into bid decisions. Use it before final price approval to see who usually wins in a department,
              how aggressive their L1 pricing is, and whether our bid should attack, wait for clarification, or avoid a margin-damaging price war.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PlainStep title="1. Identify rival" text="Check which contractor dominates the buyer or work type." />
              <PlainStep title="2. Read L1 pressure" text="Higher discount means market may bid lower than estimate." />
              <PlainStep title="3. Choose strategy" text="Protect margin, attack selectively, or no-bid if price risk is too high." />
            </div>
          </div>
          <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Today&apos;s competitor call</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-950 dark:text-white">{mostAggressive.name}</span> is the most aggressive price player at {mostAggressive.avgDiscount}% average discount.</p>
              <p><span className="font-semibold text-slate-950 dark:text-white">{strongest.name}</span> is the highest overall threat because of wins, department reach and pricing trend.</p>
              <p>For UP PWD/NHAI style tenders, do not approve final price until BOQ rate analysis and L1 simulation are checked.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {watchlist.map((competitor) => (
          <article key={competitor.name} className="panel p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={competitor.tone}>{competitor.threatScore}/100 threat</Badge>
                  <Badge tone="blue">{competitor.posture}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{competitor.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{competitor.wins} known wins · {competitor.avgDiscount}% average discount below estimate</p>
              </div>
              <div className="min-w-40">
                <p className="text-xs font-medium uppercase text-slate-500">Price pressure</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{competitor.pressure.toFixed(1)}%</p>
                <Progress value={competitor.threatScore} tone={competitor.tone === "red" ? "red" : competitor.tone === "amber" ? "amber" : "green"} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniFact label="Latest L1 index" value={`${competitor.latestL1Index}%`} detail="100 means near estimate; lower means more aggressive" />
              <MiniFact label="Trend move" value={`${competitor.trendMove > 0 ? "+" : ""}${competitor.trendMove}%`} detail={competitor.trendMove < 0 ? "Getting more aggressive" : "Stable or less aggressive"} />
              <MiniFact label="Bid response" value={shortStrategy(competitor.threatScore)} detail="Recommended commercial posture" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {competitor.dominantDepartments.map((department) => <Badge key={department} tone="slate">{department}</Badge>)}
            </div>

            <div className="mt-5 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={competitor.l1Trend.map((value, index) => ({ period: `Bid ${index + 1}`, value }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis domain={[85, 105]} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`${value}% of estimate`, "L1 index"]} />
                  <Line dataKey="value" stroke="#1976d2" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <ActionStrip score={competitor.threatScore} />
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Department dominance</h2>
          <p className="mt-1 text-sm text-slate-500">Shows where competitors repeatedly appear strong.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={watchlist.map((item) => ({ name: item.name.split(" ")[0], wins: item.wins, discount: item.avgDiscount }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="wins" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Where to attack vs avoid</h2>
          <div className="mt-4 grid gap-3">
            {departmentRows.map((row) => (
              <div key={row.department} className="grid gap-3 rounded border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{row.department}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.players} tracked competitor{row.players === 1 ? "" : "s"} active</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Top rival: {row.topPlayer}</p>
                <Badge tone={row.action === "Price with caution" ? "amber" : "green"}>{row.action}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DecisionNote icon={<Target className="h-5 w-5" />} title="Before final bid price" text="Run L1 simulation against the top two likely competitors and compare with BOQ margin guardrail." />
        <DecisionNote icon={<IndianRupee className="h-5 w-5" />} title="When discount pressure is high" text="Do not cut below net margin floor unless CEO approves strategic entry value." />
        <DecisionNote icon={<AlertTriangle className="h-5 w-5" />} title="When data is incomplete" text="Mark competitor estimate as advisory and verify official L1 history from portal/award data." />
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    red: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
  };
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded ring-1 ${toneClass[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function PlainStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function MiniFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function ActionStrip({ score }: { score: number }) {
  const items = score >= 80
    ? ["CEO approval needed before aggressive pricing", "Protect cashflow and BG exposure", "No-bid if BOQ margin falls below floor"]
    : score >= 65
      ? ["Bid only where PQ/site advantage exists", "Use competitor L1 as price ceiling", "Keep alternate tender pipeline ready"]
      : ["Attack with documentation strength", "Use faster execution as advantage", "Price near estimate if competition is thin"];
  return (
    <div className="mt-4 grid gap-2">
      {items.map((item, index) => (
        <p key={`${index}-${item}`} className="flex gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          {item}
        </p>
      ))}
    </div>
  );
}

function DecisionNote({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function shortStrategy(score: number) {
  if (score >= 80) return "Defend margin";
  if (score >= 65) return "Selective bid";
  return "Attack";
}
