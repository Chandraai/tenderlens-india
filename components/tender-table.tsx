"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Brain, Building2, Download, ExternalLink, Eye, Filter, Loader2, MapPin, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Badge, ScoreRing } from "@/components/ui";
import { tenders } from "@/lib/data";
import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";
import type { Tender } from "@/lib/types";
import { formatCr, formatLakh } from "@/lib/utils";

const storageKey = "tenderlens.uploadedAnalyses";
const regionTabs = [
  { id: "All", label: "All regions", state: "All", caption: "All live rows" },
  { id: "Uttar Pradesh", label: "UP", state: "Uttar Pradesh", caption: "UP + GeM" },
  { id: "Madhya Pradesh", label: "MP", state: "Madhya Pradesh", caption: "City signals" },
  { id: "Delhi NCR", label: "Delhi NCR", state: "Delhi NCR", caption: "NCR signals" },
  { id: "Defence", label: "Defence", state: "Defence All India", caption: "DEFPROC" }
];

function statusTone(status: string) {
  if (status === "Won") return "green";
  if (status === "Closing") return "amber";
  if (status === "Lost" || status === "Closed") return "red";
  return "blue";
}

function moneyLabel(value: number, formatter: (value: number) => string) {
  return value > 0 ? formatter(value) : "Verify";
}

function splitOpenClosedRows(sourceRows: Tender[]) {
  const normalized = sourceRows.map((tender) =>
    isPastDeadline(tender.deadline) ? { ...tender, status: "Closed" as const, marginPercent: 0 } : tender
  );
  return {
    open: normalized.filter((tender) => tender.status !== "Closed"),
    closed: normalized.filter((tender) => tender.status === "Closed")
  };
}

function isPastDeadline(deadline?: string) {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  const date = new Date(`${deadline}T23:59:59+05:30`);
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now();
}

export function TenderTable({ compact = false }: { compact?: boolean }) {
  const initialRows = useMemo(() => splitOpenClosedRows(tenders), []);
  const [rows, setRows] = useState<Tender[]>(initialRows.open);
  const [closedRows, setClosedRows] = useState<Tender[]>(initialRows.closed);
  const [isLoading, setIsLoading] = useState(false);
  const [feedMeta, setFeedMeta] = useState<{ liveRows: number; syncedAt: string; warningCount: number; source: string; upOfficialCount: number | null; gemRows: number; gemSessionRequired: boolean; closedRows: number; regional: { region: string; parsedRows: number; signalRows: number }[]; defence: { parsedRows: number; signalRows: number } | null } | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [analyzingId, setAnalyzingId] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [portal, setPortal] = useState("All");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [state, setState] = useState("All");
  const [city, setCity] = useState("All");
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLiveFeed() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/tenders", { cache: "no-store" });
        if (!response.ok) throw new Error(`Feed failed ${response.status}`);
        const payload = await response.json();
        if (!mounted) return;
        if (Array.isArray(payload.tenders) && payload.tenders.length) {
          setRows(payload.tenders);
          setClosedRows(Array.isArray(payload.closedTenders) ? payload.closedTenders : []);
          setFeedMeta({
            liveRows: payload.liveRows || 0,
            syncedAt: payload.syncedAt || new Date().toISOString(),
            warningCount: Array.isArray(payload.warnings) ? payload.warnings.length : 0,
            source: payload.source || "normalized-feed",
            upOfficialCount: payload.up?.activeConstructionTenderCount ?? null,
            gemRows: payload.gem?.publicRows || payload.tenders.filter((tender: Tender) => tender.portal === "GeM").length,
            gemSessionRequired: Boolean(payload.gem?.sessionRequired),
            closedRows: payload.closedRows || payload.closedTenders?.length || 0,
            regional: Array.isArray(payload.regional) ? payload.regional : [],
            defence: payload.defence || null
          });
        }
      } catch {
        if (mounted) setFeedMeta({ liveRows: 0, syncedAt: new Date().toISOString(), warningCount: 1, source: "fallback", upOfficialCount: null, gemRows: 0, gemSessionRequired: false, closedRows: 0, regional: [], defence: null });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadLiveFeed();
    return () => {
      mounted = false;
    };
  }, []);

  const displayRows = useMemo(() => (showClosed ? [...rows, ...closedRows] : rows), [rows, closedRows, showClosed]);
  const portals = useMemo(() => ["All", ...Array.from(new Set(displayRows.map((tender) => tender.portal)))], [displayRows]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(displayRows.map((tender) => tender.status)))], [displayRows]);
  const states = useMemo(() => ["All", ...Array.from(new Set(displayRows.map((tender) => tender.state).filter(Boolean)))], [displayRows]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(displayRows.map((tender) => tender.category)))], [displayRows]);
  const upRows = useMemo(() => displayRows.filter((tender) => tender.state === "Uttar Pradesh"), [displayRows]);
  const mpRows = useMemo(() => displayRows.filter((tender) => tender.state === "Madhya Pradesh"), [displayRows]);
  const delhiNcrRows = useMemo(() => displayRows.filter((tender) => tender.state === "Delhi NCR"), [displayRows]);
  const defenceRows = useMemo(() => displayRows.filter((tender) => tender.state === "Defence All India" || tender.sourceType === "Defence eProcure Signal"), [displayRows]);
  const gemUpRows = useMemo(() => displayRows.filter((tender) => tender.portal === "GeM" && tender.state === "Uttar Pradesh"), [displayRows]);
  const verifiedValueRows = useMemo(() => displayRows.filter((tender) => tender.valueCr > 0), [displayRows]);
  const verifyPendingRows = useMemo(() => displayRows.filter((tender) => tender.valueCr <= 0 || tender.deadline === "See portal"), [displayRows]);
  const highRiskRows = useMemo(() => displayRows.filter((tender) => tender.risk === "High"), [displayRows]);
  const pipelineCr = useMemo(() => displayRows.reduce((sum, tender) => sum + tender.valueCr, 0), [displayRows]);
  const cities = useMemo(() => {
    const visibleStateRows = state === "All" ? displayRows : displayRows.filter((tender) => tender.state === state);
    return ["All", ...Array.from(new Set(visibleStateRows.map((tender) => tender.category).filter(Boolean)))];
  }, [displayRows, state]);

  useEffect(() => {
    if (!cities.includes(city)) setCity("All");
  }, [cities, city]);

  const filtered = useMemo(() => {
    return displayRows.filter((tender) => {
      const text = `${tender.id} ${tender.title} ${tender.department} ${tender.state}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        (portal === "All" || tender.portal === portal) &&
        (status === "All" || tender.status === status) &&
        (category === "All" || tender.category === category) &&
        (state === "All" || tender.state === state) &&
        (city === "All" || tender.category === city)
      );
    });
  }, [displayRows, query, portal, status, category, state, city]);

  function selectRegion(nextState: string) {
    setState(nextState);
    setCity("All");
    setPortal("All");
  }

  function clearFilters() {
    setQuery("");
    setPortal("All");
    setStatus("All");
    setCategory("All");
    setState("All");
    setCity("All");
  }

  const activeFilterCount = [query, portal !== "All", status !== "All", category !== "All", state !== "All", city !== "All"].filter(Boolean).length;

  return (
    <div className="panel overflow-hidden">
      {!compact ? (
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={feedMeta?.liveRows ? "green" : "amber"}>{feedMeta?.liveRows ? "Live feed connected" : "Live feed warming up"}</Badge>
                {feedMeta?.warningCount ? <Badge tone="amber">Manual verify required</Badge> : <Badge tone="green">No adapter warnings</Badge>}
                {feedMeta?.closedRows ? <Badge tone={showClosed ? "red" : "slate"}>{feedMeta.closedRows} closed hidden</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {filtered.length} visible from {displayRows.length} normalized rows. UP row parsing, GeM public JSON, regional signals and defence sector monitoring are separated for faster CEO review.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {feedMeta?.syncedAt ? `Synced ${new Date(feedMeta.syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Syncing"}
            </span>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FeedStat icon={<Building2 className="h-4 w-4" />} label="Open feed" value={displayRows.length.toString()} detail={`${upRows.length} UP, ${mpRows.length} MP, ${delhiNcrRows.length} NCR rows`} tone="blue" />
            <FeedStat icon={<MapPin className="h-4 w-4" />} label="Pipeline value" value={formatCr(pipelineCr)} detail={`${verifyPendingRows.length} rows need portal verification`} tone="green" />
            <FeedStat icon={<ShieldCheck className="h-4 w-4" />} label="Defence watch" value={defenceRows.length.toString()} detail={feedMeta?.defence ? `${feedMeta.defence.signalRows || feedMeta.defence.parsedRows} DEFPROC signals` : "Signal feed"} tone="red" />
            <FeedStat icon={<AlertTriangle className="h-4 w-4" />} label="Risk focus" value={highRiskRows.length.toString()} detail={`${gemUpRows.length} GeM UP rows`} tone="amber" />
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {regionTabs.map((tab) => {
              const count = tab.state === "All" ? displayRows.length : displayRows.filter((tender) => tender.state === tab.state).length;
              const active = state === tab.state;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectRegion(tab.state)}
                  className={`min-h-20 rounded border p-3 text-left transition ${active ? "border-brand-500 bg-white shadow-sm ring-2 ring-brand-500/10 dark:bg-slate-900" : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${active ? "text-brand-700 dark:text-brand-50" : "text-slate-900 dark:text-white"}`}>{tab.label}</span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{count}</span>
                  </span>
                  <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">{tab.caption}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="font-semibold">Verification rule:</span> UP/GeM rows can expose live/public fields. MP, Delhi NCR and Defence may require portal token/session, so the app shows signal rows and keeps value, EMD, PBG and deadline as verify until source documents are downloaded.
          </div>

          {feedMeta?.regional?.length || feedMeta?.defence ? (
            <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500">
              {feedMeta.regional.map((item) => (
                <Badge key={item.region} tone={item.parsedRows ? "green" : "amber"}>
                  {item.region}: {item.parsedRows ? `${item.parsedRows} parsed` : `${item.signalRows} portal signals`}
                </Badge>
              ))}
              {feedMeta.defence ? (
                <Badge tone={feedMeta.defence.parsedRows ? "green" : "red"}>
                  Defence: {feedMeta.defence.parsedRows ? `${feedMeta.defence.parsedRows} parsed` : `${feedMeta.defence.signalRows} DEFPROC signals`}
                </Badge>
              ) : null}
              {feedMeta?.upOfficialCount ? <Badge tone="slate">{feedMeta.upOfficialCount.toLocaleString("en-IN")} official UP active count</Badge> : null}
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount ? <Badge tone="blue">{activeFilterCount} active</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => { setPortal("GeM"); setState("Uttar Pradesh"); setCity("All"); }} className="rounded border border-emerald-200 bg-white px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
                GeM UP
              </button>
              <button type="button" onClick={() => setShowClosed((value) => !value)} className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {showClosed ? "Hide closed" : "Show closed"}
              </button>
              <button type="button" onClick={clearFilters} className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Reset
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_1fr_1fr]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Search tender, department, ID"
              />
            </label>
            <select value={portal} onChange={(event) => setPortal(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {portals.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={state} onChange={(event) => setState(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {states.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {cities.map((item) => <option key={item}>{item === "All" ? "All cities/categories" : item}</option>)}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{filtered.length} tenders match current filters</span>
            <span>{verifiedValueRows.length} rows have parsed value, {verifyPendingRows.length} rows need portal verification</span>
          </div>
        </div>
      ) : null}
      <div className="space-y-3 p-3 2xl:hidden">
        {filtered.slice(0, compact ? 5 : filtered.length).map((tender) => (
          <TenderCard
            key={tender.id}
            tender={tender}
            analyzingId={analyzingId}
            downloadingId={downloadingId}
            onView={() => setSelectedTender(tender)}
            onDownload={() => downloadTender(tender, setDownloadingId, setActionError)}
            onAnalyze={() => analyzeTender(tender, setAnalyzingId, setActionError)}
          />
        ))}
        {!filtered.length ? <EmptyTenderState onReset={clearFilters} /> : null}
      </div>
      <div className="hidden overflow-x-auto 2xl:block">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Tender</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3">Portal</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">EMD</th>
              <th className="px-4 py-3">AI</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.slice(0, compact ? 5 : filtered.length).map((tender) => (
              <tr key={tender.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/80">
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-950 dark:text-white">{tender.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{tender.id}</span>
                    {tender.sourceType ? <span>{tender.sourceType}</span> : null}
                    {tender.sourceUrl ? (
                      <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={tender.sourceUrl} target="_blank" rel="noreferrer">
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTender(tender)}
                      className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 px-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTender(tender, setDownloadingId, setActionError)}
                      disabled={downloadingId === tender.id}
                      className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 px-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      {downloadingId === tender.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {downloadLabel(tender)}
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeTender(tender, setAnalyzingId, setActionError)}
                      disabled={analyzingId === tender.id}
                      className="inline-flex h-9 items-center gap-1 rounded bg-slate-950 px-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                      {analyzingId === tender.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                      Analyze
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4"><Badge tone={tender.portal === "GeM" ? "green" : tender.portal === "CPPP" ? "blue" : "amber"}>{tender.portal}</Badge></td>
                <td className="px-4 py-4">{tender.state}</td>
                <td className="px-4 py-4">{tender.department}</td>
                <td className="px-4 py-4 font-medium">{moneyLabel(tender.valueCr, formatCr)}</td>
                <td className="px-4 py-4">{tender.deadline}</td>
                <td className="px-4 py-4">{moneyLabel(tender.emdLakh, formatLakh)}</td>
                <td className="px-4 py-4"><ScoreRing score={tender.aiScore} /></td>
                <td className="px-4 py-4"><Badge tone={statusTone(tender.status)}>{tender.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <EmptyTenderState onReset={clearFilters} /> : null}
      </div>
      {actionError ? <p className="border-t border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{actionError}</p> : null}
      {selectedTender ? (
        <TenderDetailDialog
          tender={selectedTender}
          onClose={() => setSelectedTender(null)}
          onAnalyze={() => analyzeTender(selectedTender, setAnalyzingId, setActionError)}
          onDownload={() => downloadTender(selectedTender, setDownloadingId, setActionError)}
        />
      ) : null}
    </div>
  );
}

function TenderCard({
  tender,
  analyzingId,
  downloadingId,
  onView,
  onDownload,
  onAnalyze
}: {
  tender: Tender;
  analyzingId: string;
  downloadingId: string;
  onView: () => void;
  onDownload: () => void;
  onAnalyze: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={tender.portal === "GeM" ? "green" : tender.portal === "CPPP" ? "blue" : "amber"}>{tender.portal}</Badge>
        <Badge tone={statusTone(tender.status)}>{tender.status}</Badge>
        <Badge tone={tender.risk === "Low" ? "green" : tender.risk === "Medium" ? "amber" : "red"}>{tender.risk} risk</Badge>
        {tender.sourceType ? <Badge tone={tender.sourceType.includes("Signal") ? "amber" : "slate"}>{tender.sourceType}</Badge> : null}
      </div>
      <h3 className="text-base font-semibold leading-snug text-slate-950 dark:text-white">{tender.title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{tender.id} · {tender.department}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <MiniMetric label="State" value={tender.state || "India"} />
        <MiniMetric label="Value" value={moneyLabel(tender.valueCr, formatCr)} />
        <MiniMetric label="Deadline" value={tender.deadline} />
        <MiniMetric label="EMD" value={moneyLabel(tender.emdLakh, formatLakh)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        {tender.sourceUrl ? (
          <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={tender.sourceUrl} target="_blank" rel="noreferrer">
            source <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        <span className="font-medium">AI score {tender.aiScore}/100</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onView} className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 px-3 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button type="button" onClick={onDownload} disabled={downloadingId === tender.id} className="inline-flex h-9 items-center gap-1 rounded border border-slate-200 px-3 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900">
          {downloadingId === tender.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloadLabel(tender)}
        </button>
        <button type="button" onClick={onAnalyze} disabled={analyzingId === tender.id} className="inline-flex h-9 items-center gap-1 rounded bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
          {analyzingId === tender.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          Analyze
        </button>
      </div>
    </article>
  );
}

function FeedStat({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    red: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
  };
  return (
    <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded ring-1 ${toneClass[tone]}`}>{icon}</span>
        <span className="text-right text-xl font-semibold text-slate-950 dark:text-white">{value}</span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function EmptyTenderState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">No tenders match these filters</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Try another region, clear city/category filters, or switch to all regions to compare UP, MP, Delhi NCR and Defence opportunities together.
      </p>
      <button type="button" onClick={onReset} className="mt-4 inline-flex h-9 items-center rounded bg-slate-950 px-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
        Reset filters
      </button>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function TenderDetailDialog({ tender, onClose, onAnalyze, onDownload }: { tender: Tender; onClose: () => void; onAnalyze: () => void; onDownload: () => void }) {
  const [sourceAnalysis, setSourceAnalysis] = useState<UploadedTenderAnalysis | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const commercialItems = buildCommercialView(tender, sourceAnalysis);
  const effectiveStatus = sourceAnalysis?.deadlineStatus === "Closed" ? "Closed" : tender.status;
  const effectiveRisk = sourceAnalysis?.deadlineStatus === "Closed" ? "High" : sourceAnalysis?.riskLevel || tender.risk;

  useEffect(() => {
    let mounted = true;
    async function loadSourceDetails() {
      if (!tender.sourceUrl) return;
      setSourceLoading(true);
      setSourceError("");
      try {
        const response = await fetch("/api/tenders/analyze-source", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tender })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Source extraction failed");
        if (mounted) setSourceAnalysis(body.analysis as UploadedTenderAnalysis);
      } catch (error) {
        if (mounted) setSourceError(error instanceof Error ? error.message : "Source extraction failed");
      } finally {
        if (mounted) setSourceLoading(false);
      }
    }
    loadSourceDetails();
    return () => {
      mounted = false;
    };
  }, [tender]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={tender.portal === "GeM" ? "green" : tender.portal === "CPPP" ? "blue" : "amber"}>{tender.portal}</Badge>
              <Badge tone={statusTone(effectiveStatus)}>{effectiveStatus}</Badge>
              <Badge tone={effectiveRisk === "Low" ? "green" : effectiveRisk === "Medium" ? "amber" : "red"}>{effectiveRisk} risk</Badge>
              <Badge tone={tender.sourceUrl ? "green" : "amber"}>{tender.sourceUrl ? (isPdfTender(tender) ? "Real PDF available" : "Official source page") : "Brief only"}</Badge>
            </div>
            <h3 className="text-xl font-semibold">{tender.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{tender.id} · {tender.department} · {tender.state || "India"}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded border border-slate-200 dark:border-slate-700" aria-label="Close tender details">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-4">
          <DetailMetric label="Value" value={sourceAnalysis?.estimatedValue && sourceAnalysis.estimatedValue !== "Not clearly found" ? sourceAnalysis.estimatedValue : moneyLabel(tender.valueCr, formatCr)} />
          <DetailMetric label="Deadline" value={sourceAnalysis?.deadline && sourceAnalysis.deadline !== "Not clearly found" ? sourceAnalysis.deadline : tender.deadline} />
          <DetailMetric label="EMD" value={sourceAnalysis?.emd && sourceAnalysis.emd !== "Not clearly found" ? sourceAnalysis.emd : moneyLabel(tender.emdLakh, formatLakh)} />
          <DetailMetric label="Win probability" value={`${tender.winProbability}%`} />
        </div>

        {effectiveStatus === "Closed" ? (
          <ClosedTenderDecision deadline={sourceAnalysis?.deadline || tender.deadline} />
        ) : null}

        <SourceExtractionPanel analysis={sourceAnalysis} loading={sourceLoading} error={sourceError} />

        <div className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
          <DetailBlock title="Key clauses" items={tender.clauses} />
          <DetailBlock title="PQ readiness" items={tender.pqChecks.map((item) => `${item.passed ? "Ready" : "Verify"}: ${item.label}`)} />
          <DetailBlock
            title="Commercial view"
            items={commercialItems}
          />
          <DetailBlock title="Scoring / Finance Basis" items={buildScoringBasis(tender, sourceAnalysis)} />
          <DetailBlock
            title="Source"
            items={[
              `Source type: ${tender.sourceType || "Curated"}`,
              tender.sourceUrl
                ? isPdfTender(tender)
                  ? "Real tender PDF can be downloaded as an attachment."
                  : "Official portal source page can be downloaded as HTML. Tender PDF may require portal login/session."
                : "No official PDF/source URL is attached to this normalized row yet. Download will create an internal tender brief."
            ]}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
          {tender.sourceUrl ? (
            <a href={tender.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
              <ExternalLink className="h-4 w-4" />
              Open source
            </a>
          ) : null}
          <button type="button" onClick={onDownload} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
            <Download className="h-4 w-4" />
            {downloadLongLabel(tender)}
          </button>
          <button type="button" onClick={onAnalyze} className="inline-flex h-10 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            <Brain className="h-4 w-4" />
            Send to AI Insights
          </button>
        </div>
      </div>
    </div>
  );
}

function buildScoringBasis(tender: Tender, analysis: UploadedTenderAnalysis | null) {
  const pqPassed = tender.pqChecks.filter((check) => check.passed).length;
  const pqTotal = tender.pqChecks.length || 1;
  const exposureCr = tender.valueCr && tender.pbgPercent ? (tender.valueCr * tender.pbgPercent) / 100 : 0;
  const pbgSource = analysis?.pbg && analysis.pbg !== "Not clearly found"
    ? `PBG basis: official source extraction detected ${analysis.pbg}.`
    : tender.pbgPercent
      ? `PBG basis: ${tender.pbgPercent}% is a normalized/default exposure assumption for dashboard finance planning; verify exact PBG/additional performance security in NIT/BOQ before bid spend.`
      : "PBG basis: not found in source/row, so finance must verify on official portal.";
  const isClosed = tender.status === "Closed" || analysis?.deadlineStatus === "Closed";
  const probabilityBasis = isClosed
    ? `Probability basis: ${tender.winProbability}% is a historical/fit score only; current CEO decision is No-Bid because deadline is closed.`
    : `Probability basis: ${tender.winProbability}% combines AI score ${tender.aiScore}/100, PQ readiness ${pqPassed}/${pqTotal}, risk ${tender.risk}, margin ${tender.marginPercent || "verify"}%, deadline status and source completeness.`;
  const riskBasis = analysis?.riskReasons?.length
    ? `Risk basis: ${analysis.riskLevel} from source clauses: ${analysis.riskReasons.slice(0, 2).join(" | ")}`
    : `Risk basis: ${tender.risk} from normalized feed signals, missing/ready PQ gates, EMD/PBG completeness, deadline status and whether NIT/BOQ is parsed.`;

  return [
    probabilityBasis,
    riskBasis,
    pbgSource,
    exposureCr ? `PBG exposure estimate: ${formatCr(exposureCr)} based on tender value ${formatCr(tender.valueCr)} x ${tender.pbgPercent}%.` : "PBG exposure estimate: cannot compute until tender value and PBG percent are confirmed.",
    "Final rule: source-extracted values override model defaults; any remaining Verify field must be checked on the official portal before CEO approval."
  ];
}

function buildCommercialView(tender: Tender, analysis: UploadedTenderAnalysis | null) {
  const sourceValueCr = analysis?.estimatedValue && analysis.estimatedValue !== "Not clearly found" ? parseMoneyToCr(analysis.estimatedValue) : 0;
  const valueCr = sourceValueCr || tender.valueCr || 0;
  const lowCr = tender.recommendedBidLowCr > 0 ? tender.recommendedBidLowCr : valueCr > 0 ? roundCr(valueCr * 0.94) : 0;
  const highCr = tender.recommendedBidHighCr > 0 ? tender.recommendedBidHighCr : valueCr > 0 ? roundCr(valueCr * 0.98) : 0;
  const competitorCr = tender.competitorEstimateCr > 0 ? tender.competitorEstimateCr : valueCr > 0 ? roundCr(valueCr * 0.96) : 0;
  const margin = tender.status === "Closed" || analysis?.deadlineStatus === "Closed" ? "0% (closed tender)" : tender.marginPercent > 0 ? `${tender.marginPercent}%` : "Verify after BOQ costing";
  const pbgLabel = buildPbgLabel(tender, analysis, valueCr);

  return [
    lowCr && highCr ? `Recommended bid range: ${formatCr(lowCr)} to ${formatCr(highCr)}` : "Recommended bid range: Verify after tender value/BOQ is confirmed",
    competitorCr ? `Competitor estimate: ${formatCr(competitorCr)}` : "Competitor estimate: Verify after value and L1 history are available",
    `Margin guardrail: ${margin}`,
    `PBG: ${pbgLabel}`,
    sourceValueCr && (!tender.valueCr || !tender.recommendedBidLowCr)
      ? "Commercials recalculated from extracted official source value; verify final BOQ before bid spend."
      : "Commercials are based on normalized feed values; verify final BOQ and corrigendum before approval."
  ];
}

function buildPbgLabel(tender: Tender, analysis: UploadedTenderAnalysis | null, valueCr: number) {
  if (analysis?.pbg && analysis.pbg !== "Not clearly found") {
    const percent = analysis.pbg.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
    if (percent && valueCr > 0) return `${percent}% (${formatCr(roundCr((valueCr * Number(percent)) / 100))} exposure)`;
    return analysis.pbg;
  }
  if (tender.pbgPercent > 0) {
    return valueCr > 0 ? `${tender.pbgPercent}% (${formatCr(roundCr((valueCr * tender.pbgPercent) / 100))} exposure)` : `${tender.pbgPercent}%`;
  }
  return "Verify in NIT/GeM ATC/BOQ";
}

function parseMoneyToCr(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, "");
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;
  if (/crore|\bcr\b/.test(normalized)) return roundCr(amount);
  if (/lakh|lac|\bl\b/.test(normalized)) return roundCr(amount / 100);
  return amount >= 10_000_000 ? roundCr(amount / 10_000_000) : 0;
}

function roundCr(value: number) {
  return Math.round(value * 100) / 100;
}

function ClosedTenderDecision({ deadline }: { deadline: string }) {
  return (
    <div className="mx-5 mb-5 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">CEO decision: No-Bid for current cycle</p>
          <p className="mt-1">Submission deadline {deadline} has passed. Do not spend on EMD, pricing, BOQ or bid preparation unless an official corrigendum reopens or extends this tender.</p>
          <p className="mt-2 font-medium">Recommended action: archive as closed, keep only corrigendum watch, and move team effort to open tenders.</p>
        </div>
      </div>
    </div>
  );
}

function SourceExtractionPanel({ analysis, loading, error }: { analysis: UploadedTenderAnalysis | null; loading: boolean; error: string }) {
  if (loading) {
    return (
      <div className="mx-5 mb-5 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        Extracting tender value, EMD, scope and PQ from source document...
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-5 mb-5 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Source extraction warning: {error}. Use Open source/PDF for manual verification.
      </div>
    );
  }
  if (!analysis) return null;
  if (isPortalSignalAnalysis(analysis)) {
    const tender = analysis.sourceTender;
    const sourceName = tender?.sourceType === "Defence eProcure Signal" ? "DEFPROC Defence eProcurement" : "official state portal";
    return (
      <div className="mx-5 mb-5 rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Official Portal Verification Pending</h4>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              This is a sector/portal signal, not a downloaded NIT/RFP/BOQ document. Open {sourceName} to verify exact tender value, EMD, PBG and deadline.
            </p>
          </div>
          <Badge tone="amber">{tender?.sourceType || "Portal signal"}</Badge>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <MiniMetric label="Value" value="Verify on official portal" />
          <MiniMetric label="EMD" value="Verify on official portal" />
          <MiniMetric label="PBG" value="Verify on NIT/RFP" />
          <MiniMetric label="Deadline" value="Verify latest corrigendum" />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <ExtractList
            title="Sector Signal"
            items={[
              tender?.category || analysis.title,
              tender?.department || analysis.department,
              "Use this row to track the defence opportunity bucket before committing bid-team effort."
            ]}
          />
          <ExtractList
            title="CEO Verification"
            items={[
              "Open official source and download actual NIT/RFP/BOQ before commercial review.",
              "Confirm tender ID, estimated value, EMD, PBG/security deposit, submission date and corrigendum.",
              "Do not approve bid spend while value/deadline/eligibility remain unverified."
            ]}
          />
          <ExtractList
            title="Defence Checks"
            items={[
              "Check vendor registration, security restrictions, make/OEM requirements and sensitive document handling.",
              "Confirm whether tender is works, services, supply, maintenance or restricted procurement.",
              "Map eligibility documents before sending to AI Insights."
            ]}
          />
        </div>
      </div>
    );
  }
  const display = sanitizeSourceAnalysisForModal(analysis);
  return (
    <div className="mx-5 mb-5 rounded border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Extracted From Source Document</h4>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">Use these fields for CEO review, then verify final BOQ/EMD on the official portal.</p>
        </div>
        <Badge tone={analysis.isTenderDocument ? "green" : "amber"}>{analysis.documentType}</Badge>
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-4">
        <MiniMetric label="Value" value={display.estimatedValue} />
        <MiniMetric label="EMD" value={display.emd} />
        <MiniMetric label="PBG" value={display.pbg} />
        <MiniMetric label="Deadline" value={display.deadline} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <ExtractList title="Scope" items={display.scope} />
        <ExtractList title="PQ / Eligibility" items={display.pqCriteria} />
        <ExtractList title="Key Clauses" items={display.keyClauses} />
      </div>
    </div>
  );
}

function isPortalSignalAnalysis(analysis: UploadedTenderAnalysis) {
  const sourceType = analysis.sourceTender?.sourceType || "";
  return sourceType === "Defence eProcure Signal" || sourceType === "Regional Portal Signal";
}

function ExtractList({ title, items }: { title: string; items: string[] }) {
  const cleanItems = items.map(formatModalExtractItem).filter(Boolean);
  return (
    <div className="rounded border border-emerald-200 bg-white/70 p-3 dark:border-emerald-900 dark:bg-slate-950/40">
      <p className="mb-2 text-xs font-semibold uppercase text-emerald-900 dark:text-emerald-200">{title}</p>
      <div className="space-y-1.5">
        {cleanItems.slice(0, 4).map((item, index) => (
          <p key={`${index}-${item}`} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <p key={`${index}-${item}`} className="text-sm text-slate-600 dark:text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function sanitizeSourceAnalysisForModal(analysis: UploadedTenderAnalysis): Pick<UploadedTenderAnalysis, "estimatedValue" | "emd" | "pbg" | "deadline" | "scope" | "pqCriteria" | "keyClauses"> {
  const sourceText = [
    ...analysis.scope,
    ...analysis.pqCriteria,
    ...analysis.keyClauses,
    analysis.extractedTextPreview || ""
  ].join(" ");
  const derivedScope = deriveConstructionScope(sourceText);
  const derivedPq = derivePqCriteria(sourceText);
  const derivedClauses = deriveKeyClauses(sourceText, analysis);

  return {
    estimatedValue: analysis.estimatedValue,
    emd: analysis.emd,
    pbg: analysis.pbg,
    deadline: analysis.deadline,
    scope: derivedScope.length ? derivedScope : sanitizeModalItems(analysis.scope, [
      "Work scope is not clearly parsed. Verify item category, BOQ and drawings from the official source.",
      "Confirm quantities, location, completion period and measurement basis before pricing."
    ]),
    pqCriteria: derivedPq.length ? derivedPq : sanitizeModalItems(analysis.pqCriteria, [
      "Confirm turnover, similar work experience and document requirements from NIT/ATC.",
      "Map GST, PAN, contractor registration, audited financials and MSME/Udyam proof to document owners."
    ]),
    keyClauses: derivedClauses.length ? derivedClauses : sanitizeModalItems(analysis.keyClauses, [
      "Verify EMD exemption, performance security/PBG, GeM GTC and corrigendum before bid spend.",
      "Check inspection, delivery/completion period, payment terms and penalty/LD clauses."
    ])
  };
}

function deriveConstructionScope(text: string) {
  const items: string[] = [];
  if (/structural steel/i.test(text)) items.push("Structural steel work including supply and fixing as per BOQ/specification.");
  if (/pre-?coated galvanized iron|profile sheets?/i.test(text)) items.push("Providing and fixing pre-coated galvanized iron profile sheets.");
  if (/welding by gas or electric/i.test(text)) items.push("Welding by gas/electric method for shed structural work.");
  if (/priming coat/i.test(text)) items.push("Applying primer/priming coat on specified steel surfaces.");
  if (/synthetic enamel paint|painting/i.test(text)) items.push("Painting with synthetic enamel paint as per tender specification.");
  if (/construction of shed/i.test(text) && !items.length) items.push("Construction of shed package; verify BOQ line items and drawings before pricing.");
  return items.slice(0, 5);
}

function derivePqCriteria(text: string) {
  const items: string[] = [];
  const turnover =
    text.match(/minimum average annual (?:financial )?turnover[^.]{0,220}?([0-9.]+\s*(?:lakh|lac|crore|cr))/i)?.[1] ||
    text.match(/turnover[^.]{0,180}?([0-9.]+\s*(?:lakh|lac|crore|cr))/i)?.[1];
  if (turnover) items.push(`Minimum average annual turnover requirement: ${turnover.trim()}.`);
  else if (/minimum average annual (?:financial )?turnover|turnover of the bidder/i.test(text)) items.push("Minimum average annual turnover requirement exists; exact amount was not reliably parsed, verify GeM ATC/source document.");
  if (/audited balance sheets?|chartered accountant/i.test(text)) items.push("Audited balance sheets or Chartered Accountant certificate required for turnover proof.");
  const experience = text.match(/years of past experience[^0-9]{0,80}([0-9]+)/i)?.[1];
  if (experience) items.push(`Similar/past experience requirement detected: ${experience} year(s).`);
  if (/inspection required|empanelled inspection authority/i.test(text)) items.push("Inspection required by empanelled inspection authority.");
  if (/mse exemption|msme|udyam/i.test(text)) items.push("MSME/Udyam exemption may apply; bidder must upload valid supporting documents.");
  if (/document required|requested in atc/i.test(text)) items.push("Additional documents requested in ATC; verify exact upload list before submission.");
  return items.slice(0, 5);
}

function deriveKeyClauses(text: string, analysis: UploadedTenderAnalysis) {
  const items: string[] = [];
  if (/epbg detail|required no/i.test(text) || analysis.pbg === "Not clearly found") items.push("ePBG/PBG not clearly required in parsed source; finance must verify final performance security rule.");
  if (/emd exemption|seeking emd exemption/i.test(text)) items.push("EMD exemption requires valid category/MSME supporting document with the bid.");
  if (/gem gtc/i.test(text)) items.push("GeM GTC applies; verify buyer ATC and corrigendum for deviations.");
  if (/bid offer validity/i.test(text)) items.push("Bid validity clause present; confirm validity period from source before approval.");
  if (/bid opening date/i.test(text)) items.push("Bid opening schedule present; align internal submission calendar with portal dates.");
  if (!items.length && analysis.emd !== "Not clearly found") items.push(`EMD/bid security detected as ${analysis.emd}; verify payment/exemption mode on portal.`);
  return items.slice(0, 5);
}

function sanitizeModalItems(items: string[], fallback: string[]) {
  const clean = Array.from(new Set(items.map(formatModalExtractItem).filter(Boolean)));
  return clean.length ? clean.slice(0, 5) : fallback;
}

function formatModalExtractItem(item: string) {
  const cleaned = item
    .replace(/\s+/g, " ")
    .replace(/\bबड\s+बड\b/gi, "")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/[^\x00-\x7F]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned || isNoisyModalExtract(cleaned)) return "";
  return cleaned.length > 190 ? `${cleaned.slice(0, 187).trim()}...` : cleaned;
}

function isNoisyModalExtract(value: string) {
  if (/(searched strings used in gemarpts|searched result generated|category not available on gem|N \?\?\?)/i.test(value)) return true;
  const separatorCount = (value.match(/\|/g) || []).length;
  const labelCount = (value.match(/(bid details|date|organisation|office|category|searched|string|document|required|turnover|experience)/gi) || []).length;
  return value.length > 260 || (separatorCount >= 4 && labelCount >= 4);
}

async function analyzeTender(tender: Tender, setAnalyzingId: (value: string) => void, setActionError: (value: string) => void) {
  setAnalyzingId(tender.id);
  setActionError("");
  try {
    const response = await fetch("/api/tenders/analyze-source", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tender })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Tender analysis failed");
    saveAnalysis(body.analysis as UploadedTenderAnalysis);
    window.location.href = "/ai-insights";
  } catch (error) {
    setActionError(error instanceof Error ? error.message : "Tender analysis failed");
  } finally {
    setAnalyzingId("");
  }
}

function saveAnalysis(analysis: UploadedTenderAnalysis) {
  const existing = readStoredAnalyses().filter((item) => item.title !== analysis.title);
  window.localStorage.setItem(storageKey, JSON.stringify([analysis, ...existing].slice(0, 10)));
  window.dispatchEvent(new Event("tenderlens:analysis-updated"));
}

function readStoredAnalyses(): UploadedTenderAnalysis[] {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]") as UploadedTenderAnalysis[];
  } catch {
    return [];
  }
}

async function downloadTender(tender: Tender, setDownloadingId: (value: string) => void, setActionError: (value: string) => void) {
  setDownloadingId(tender.id);
  setActionError("");
  try {
    const response = await fetch("/api/tenders/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tender })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Tender download failed");
    }
    const blob = await response.blob();
    const header = response.headers.get("content-disposition") || "";
    const fileName = header.match(/filename="([^"]+)"/)?.[1] || `${safeName(tender.id)}-tender-download`;
    triggerDownload(blob, fileName);
  } catch (error) {
    setActionError(error instanceof Error ? error.message : "Tender download failed");
  } finally {
    setDownloadingId("");
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadLabel(tender: Tender) {
  if (isPdfTender(tender)) return "PDF";
  if (tender.sourceUrl) return "Source";
  return "Brief";
}

function downloadLongLabel(tender: Tender) {
  if (isPdfTender(tender)) return "Download real PDF";
  if (tender.sourceUrl) return "Download official source";
  return "Download normalized brief";
}

function isPdfTender(tender: Tender) {
  return Boolean(tender.sourceUrl && (tender.sourceType === "GeM Live" || /\.pdf(?:$|\?)/i.test(tender.sourceUrl)));
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "tender";
}
