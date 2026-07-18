"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";

type SyncResponse = {
  ok: boolean;
  syncedAt: string;
  activeConstructionOrgCount: number;
  activeConstructionTenderCount: number;
  appMatchedTenders: number;
  organisations: { organisation: string; tenderCount: number }[];
  liveTenderSignals: { tenderId: string; organisation: string; title: string; category: string; sourceUrl: string; deadline?: string }[];
  warnings: string[];
  error?: string;
};

export function UpPortalSync() {
  const [sync, setSync] = useState<SyncResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const activeSignals = (sync?.liveTenderSignals || []).filter((item) => !isPastDeadline(item.deadline));
  const closedSignalCount = (sync?.liveTenderSignals || []).length - activeSignals.length;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/up-portal", { cache: "no-store" });
      setSync(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={sync?.ok ? "green" : sync ? "amber" : "blue"}>{sync?.ok ? "UP portal connected" : sync ? "Adapter warning" : "Connecting"}</Badge>
            {sync?.syncedAt ? <span className="text-xs text-slate-500">Synced {new Date(sync.syncedAt).toLocaleString("en-IN")}</span> : null}
          </div>
          <h2 className="text-lg font-semibold">UP eTender Construction Adapter</h2>
          <p className="mt-1 text-sm text-slate-500">Official UP eProcurement organisation counts plus current open construction signals.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Construction orgs" value={sync ? sync.activeConstructionOrgCount.toString() : "..."} />
        <Metric label="Official active count" value={sync ? sync.activeConstructionTenderCount.toLocaleString("en-IN") : "..."} />
        <Metric label="App UP matches" value={sync ? sync.appMatchedTenders.toString() : "..."} />
      </div>

      {activeSignals.length ? (
        <div className="mt-4 rounded border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-sm font-semibold">Live tender signal</p>
          {activeSignals.map((item) => (
            <div key={item.tenderId} className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
              <p className="mt-1">{item.tenderId} · {item.organisation} · {item.category}{item.deadline ? ` · closes ${item.deadline}` : ""}</p>
            </div>
          ))}
        </div>
      ) : null}

      {closedSignalCount > 0 ? (
        <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {closedSignalCount} UP portal signal hidden because the official bid submission deadline has already passed.
        </p>
      ) : null}

      {sync?.organisations?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {sync.organisations.slice(0, 12).map((item) => (
            <Badge key={item.organisation} tone="slate">{item.organisation}: {item.tenderCount}</Badge>
          ))}
        </div>
      ) : null}

      {sync?.warnings?.length || sync?.error ? (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">{sync.error || sync.warnings[0]}</p>
      ) : null}
    </section>
  );
}

function isPastDeadline(deadline?: string) {
  if (!deadline) return false;
  const date = new Date(`${deadline}T23:59:59+05:30`);
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
