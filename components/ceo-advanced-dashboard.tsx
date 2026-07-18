"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, Database, IndianRupee, Loader2, RefreshCw, ShieldAlert, Target, Timer } from "lucide-react";
import { Badge, Progress, SectionHeader } from "@/components/ui";
import type { buildCeoAnalytics } from "@/lib/ceo-analytics";
import { formatCr } from "@/lib/utils";

type CeoAnalytics = ReturnType<typeof buildCeoAnalytics>;
type StateHeatmapRow = CeoAnalytics["stateHeatmap"][number];
type MlRankingRow = CeoAnalytics["mlRankings"][number];
type ActionQueueItem = CeoAnalytics["actionQueue"][number];

type CeoPayload = {
  analytics: CeoAnalytics;
  persistence: { mode: string; tenderRows: number; snapshots: number; postgresReady: boolean };
  ml: { source: string; predictions: number };
  feed: { liveRows: number; up: { activeConstructionTenderCount: number; activeConstructionOrgCount: number } | null; warnings: string[] };
};

const colors = ["#1976d2", "#1c9a7d", "#f59e0b", "#e11d48", "#7c3aed", "#0f766e", "#ea580c", "#475569"];

export function CeoAdvancedDashboard() {
  const [payload, setPayload] = useState<CeoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ceo-dashboard", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "CEO dashboard failed");
      setPayload(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CEO dashboard failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !payload) {
    return (
      <div className="panel grid min-h-96 place-items-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-slate-500">Building CEO cockpit from DB, live feed and ML model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel flex items-start gap-3 border-rose-200 p-5 text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  const analytics = payload!.analytics;
  const kpis = analytics.kpis;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CEO Advanced Cockpit"
        kicker="DB-backed pipeline, Python ML scoring and board analytics"
        action={
          <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh intelligence
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi title="Active tenders" value={kpis.activeTenders} icon={<Timer className="h-5 w-5" />} />
        <Kpi title="Pipeline" value={formatCr(kpis.pipelineCr)} icon={<IndianRupee className="h-5 w-5" />} />
        <Kpi title="Weighted forecast" value={formatCr(kpis.weightedPipelineCr)} icon={<Target className="h-5 w-5" />} />
        <Kpi title="EMD blocked" value={formatCr(kpis.emdBlockedCr)} icon={<Database className="h-5 w-5" />} />
        <Kpi title="ML win avg" value={`${kpis.avgWinProbability}%`} icon={<BrainCircuit className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel p-4">
          <PanelTitle title="State Opportunity Heatmap" caption="Where CEO attention and BD travel should go first" />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analytics.stateHeatmap} margin={{ left: 6, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valueCr" name="Pipeline Cr" radius={[6, 6, 0, 0]}>
                {analytics.stateHeatmap.map((_: StateHeatmapRow, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-4">
          <PanelTitle title="Risk vs Value Matrix" caption="No-bid discipline and mitigation load" />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={analytics.riskMatrix} margin={{ left: 4, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="risk" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="valueCr" name="Value Cr" fill="#1976d2" radius={[6, 6, 0, 0]} />
              <Line dataKey="count" name="Tender count" stroke="#e11d48" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel p-4 xl:col-span-2">
          <PanelTitle title="Python ML Bid Ranking" caption={`Model source: ${payload!.ml.source}; predictions: ${payload!.ml.predictions}`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-3">Tender</th>
                  <th className="py-3 pr-3">Dept</th>
                  <th className="py-3 pr-3">Model win</th>
                  <th className="py-3 pr-3">Risk</th>
                  <th className="py-3 pr-3">Price band</th>
                  <th className="py-3 pr-3">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {analytics.mlRankings.map((row: MlRankingRow) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-3">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.id} · {row.state}</p>
                    </td>
                    <td className="py-3 pr-3">{row.department}</td>
                    <td className="py-3 pr-3">
                      <span className="font-semibold">{row.modelWin}%</span>
                      <Progress value={row.modelWin} tone={row.modelWin >= 70 ? "green" : row.modelWin >= 50 ? "amber" : "red"} />
                    </td>
                    <td className="py-3 pr-3">{row.riskScore}/100</td>
                    <td className="py-3 pr-3">{row.priceBand}</td>
                    <td className="py-3 pr-3"><Badge tone={row.decision === "Bid" ? "green" : row.decision === "Clarify" ? "amber" : "red"}>{row.decision}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-4">
          <PanelTitle title="CEO Action Queue" caption="What needs owner attention now" />
          <div className="space-y-3">
            {analytics.actionQueue.map((item: ActionQueueItem) => (
              <div key={item.id} className="rounded border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge tone={item.priority >= 85 ? "red" : item.priority >= 65 ? "amber" : "blue"}>P{Math.round(item.priority)}</Badge>
                  <span className="text-xs text-slate-500">{item.owner}</span>
                </div>
                <p className="text-sm font-semibold">{item.nextAction}</p>
                <p className="mt-1 text-xs text-slate-500">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <PanelTitle title="Capital Stack" caption="EMD, PBG and weighted revenue exposure" />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.capitalStack}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="id" hide />
              <YAxis />
              <Tooltip />
              <Area dataKey="weightedCr" name="Weighted Cr" fill="#1976d2" stroke="#1976d2" fillOpacity={0.25} />
              <Area dataKey="emdCr" name="EMD Cr" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.35} />
              <Area dataKey="pbgCr" name="PBG Cr" fill="#e11d48" stroke="#e11d48" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-4">
          <PanelTitle title="Board Narrative" caption="Auto-generated CEO talking points" />
          <div className="space-y-3">
            {analytics.boardNarrative.map((item: string) => (
              <p key={item} className="rounded border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{item}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-2 rounded border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p className="flex items-center gap-2"><Database className="h-4 w-4" /> DB: {payload!.persistence.mode}, {payload!.persistence.tenderRows} tender rows, {payload!.persistence.snapshots} snapshots</p>
            <p className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> UP live count: {payload!.feed.up?.activeConstructionTenderCount || 0}; live source rows: {payload!.feed.liveRows}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{icon}</div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
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
