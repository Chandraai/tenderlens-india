"use client";

import { Bell, CalendarClock, CheckCircle2, ClipboardList, ExternalLink, KeyRound, Loader2, LockKeyhole, Mail, PlugZap, RefreshCw, Save, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, SectionHeader } from "@/components/ui";

const roles = [
  { role: "CEO", access: "Financials + win rate + board reports", users: 2, tone: "green" as const },
  { role: "Manager", access: "Pipeline + alerts + assignments", users: 5, tone: "blue" as const },
  { role: "Analyst", access: "Tender details + AI scores + uploads", users: 8, tone: "amber" as const }
];

type PortalKey = "gem" | "cppp" | "up" | "mp" | "delhi" | "defence" | "maharashtra" | "rajasthan";

type PortalRow = {
  key: PortalKey;
  name: string;
  status: string;
  health: string;
  lastSync: string;
  tone: "green" | "amber" | "blue" | "red" | "slate";
};

type UpPortalSync = {
  ok: boolean;
  syncedAt: string;
  source: string;
  activeConstructionOrgCount: number;
  activeConstructionTenderCount: number;
  organisations: { organisation: string; tenderCount: number }[];
  liveTenderSignals: { tenderId: string; organisation: string; title: string; category: string; sourceUrl: string }[];
  appMatchedTenders: number;
  warnings: string[];
  error?: string;
};

type GeMSyncResponse = {
  sync?: {
    ok: boolean;
    syncedAt: string;
    source: string;
    mode: "public-json" | "fallback-signal";
    sessionRequired: boolean;
    credentialsRequired: boolean;
    publicRows: number;
    totalMatched: number;
    warnings: string[];
  };
  tenders?: unknown[];
  error?: string;
};

const portals: PortalRow[] = [
  { key: "gem", name: "GeM live public adapter", status: "Ready", health: "Public all-bids JSON with CSRF/session handshake", lastSync: "Press Configure", tone: "blue" },
  { key: "cppp", name: "CPPP feed adapter", status: "Ready", health: "Public PDF/feed normalization available", lastSync: "On demand", tone: "blue" },
  { key: "up", name: "UP portal adapter", status: "Ready", health: "Live adapter available", lastSync: "Press Configure", tone: "blue" },
  { key: "mp", name: "MP state portal adapter", status: "Signal mode", health: "Official MP GePNIC source linked; row detail may require portal token/session", lastSync: "On demand", tone: "amber" },
  { key: "delhi", name: "Delhi NCR portal adapter", status: "Signal mode", health: "Official Delhi GePNIC source linked; row detail may require portal token/session", lastSync: "On demand", tone: "amber" },
  { key: "defence", name: "DEFPROC Defence adapter", status: "Signal mode", health: "Official defence eProcurement source linked; sensitive tender details require portal verification", lastSync: "On demand", tone: "red" },
  { key: "maharashtra", name: "Maharashtra portal adapter", status: "Ready", health: "Needs credentials", lastSync: "Not scheduled", tone: "amber" },
  { key: "rajasthan", name: "Rajasthan portal adapter", status: "Ready", health: "Needs credentials", lastSync: "Not scheduled", tone: "amber" }
];

const reportSchedules = ["Daily CEO brief", "Weekly board PDF", "Monthly Excel pack", "Corrigendum digest"];
const notificationChannels = ["Email", "WhatsApp", "Slack", "In-app"];
const settingsStorageKey = "tenderlens.settings";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [activePortal, setActivePortal] = useState<PortalKey>("up");
  const [upSync, setUpSync] = useState<UpPortalSync | null>(null);
  const [gemSync, setGemSync] = useState<GeMSyncResponse | null>(null);
  const [portalMessage, setPortalMessage] = useState("UP adapter is ready. Configure runs a live connection check against the official UP eTender source.");
  const [loadingPortal, setLoadingPortal] = useState<PortalKey | "">("");
  const [integrationSavedAt, setIntegrationSavedAt] = useState("");
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => Object.fromEntries(notificationChannels.map((channel, index) => [channel, index < 3])));
  const [reports, setReports] = useState<Record<string, boolean>>(() => Object.fromEntries(reportSchedules.map((item) => [item, true])));
  const [settingsNotice, setSettingsNotice] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(settingsStorageKey) || "{}") as { notifications?: Record<string, boolean>; reports?: Record<string, boolean>; integrationSavedAt?: string };
      if (stored.notifications) setNotifications((current) => ({ ...current, ...stored.notifications }));
      if (stored.reports) setReports((current) => ({ ...current, ...stored.reports }));
      if (stored.integrationSavedAt) setIntegrationSavedAt(stored.integrationSavedAt);
    } catch {
      // Keep defaults if local settings are unavailable.
    }
  }, []);

  function save() {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify({ notifications, reports, integrationSavedAt }));
    setSaved(true);
    setSettingsNotice("Settings saved locally for this demo workspace.");
    window.setTimeout(() => setSaved(false), 1800);
  }

  function toggleNotification(channel: string) {
    setNotifications((current) => ({ ...current, [channel]: !current[channel] }));
    setSettingsNotice(`${channel} notification ${notifications[channel] ? "disabled" : "enabled"}. Click Save changes to keep it.`);
  }

  function toggleReport(item: string) {
    setReports((current) => ({ ...current, [item]: !current[item] }));
    setSettingsNotice(`${item} schedule ${reports[item] ? "paused" : "enabled"}. Click Save changes to keep it.`);
  }

  async function configurePortal(portal: PortalRow) {
    setActivePortal(portal.key);
    setLoadingPortal(portal.key);
    setPortalMessage("");

    try {
      if (portal.key === "up") {
        const response = await fetch("/api/integrations/up-portal", { cache: "no-store" });
        const body = (await response.json()) as UpPortalSync;
        setUpSync(body);
        if (!response.ok || !body.ok) {
          throw new Error(body.error || body.warnings?.[0] || "UP portal adapter returned a warning.");
        }
        setPortalMessage(`UP portal connected: ${body.activeConstructionOrgCount} construction organisations and ${body.activeConstructionTenderCount.toLocaleString("en-IN")} official active tenders found.`);
        setIntegrationSavedAt(body.syncedAt);
        return;
      }

      if (portal.key === "gem") {
        const response = await fetch("/api/integrations/gem", { cache: "no-store" });
        const body = (await response.json()) as GeMSyncResponse;
        setGemSync(body);
        if (!response.ok || !body.sync?.ok) throw new Error(body.error || body.sync?.warnings?.[0] || "GeM public checker failed.");
        setPortalMessage(`GeM live public JSON connected: ${body.sync.publicRows} UP construction rows loaded from ${body.sync.mode}. Bid value/EMD still need GeM document verification.`);
        setIntegrationSavedAt(body.sync.syncedAt);
        return;
      }

      const response = await fetch("/api/integrations/sync", { method: "POST", cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Portal sync failed");
      const adapter = body.adapters?.find((item: { portal: string }) => item.portal.toLowerCase().includes(portal.name.split(" ")[0].toLowerCase()));
      setPortalMessage(`${portal.name} checked. ${adapter?.status || portal.health}. Production credentials can be attached in this settings area.`);
      setIntegrationSavedAt(body.syncedAt || new Date().toISOString());
    } catch (error) {
      setPortalMessage(error instanceof Error ? error.message : "Portal configuration failed");
    } finally {
      setLoadingPortal("");
    }
  }

  const portalRows = portals.map((portal) => {
    if (portal.key === "gem" && gemSync?.sync) {
      return {
        ...portal,
        status: gemSync.sync.mode === "public-json" ? "Live public JSON" : "Fallback signal",
        health: gemSync.sync.ok ? `${gemSync.sync.publicRows} rows · ${gemSync.sync.totalMatched} matched · document-level value/EMD verify pending` : gemSync.error || gemSync.sync.warnings[0] || "GeM checker warning",
        lastSync: new Date(gemSync.sync.syncedAt).toLocaleString("en-IN"),
        tone: gemSync.sync.mode === "public-json" ? "green" as const : "amber" as const
      };
    }
    if (portal.key !== "up" || !upSync) return portal;
    return {
      ...portal,
      status: upSync.ok ? "Connected" : "Warning",
      health: upSync.ok ? `${upSync.activeConstructionOrgCount} orgs · ${upSync.activeConstructionTenderCount.toLocaleString("en-IN")} active` : upSync.error || upSync.warnings[0] || "Adapter warning",
      lastSync: new Date(upSync.syncedAt).toLocaleString("en-IN"),
      tone: upSync.ok ? "green" as const : "amber" as const
    };
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        kicker="Team, portal keys, notifications, reports and security"
        action={
          <button onClick={save} className="inline-flex h-10 w-fit items-center gap-2 self-start rounded bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save changes"}
          </button>
        }
      />

      {settingsNotice ? <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">{settingsNotice}</p> : null}

      <section className="panel p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)] lg:items-start">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="blue">Demo controls</Badge>
              <Badge tone="green">Saved locally</Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">What Settings controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Use this page to check portal adapters, choose notification channels, schedule CEO reports and show role/security readiness.
              Buttons now give visible feedback and notification/report toggles are saved in this browser workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <IntegrationMetric label="Notifications on" value={Object.values(notifications).filter(Boolean).length.toString()} />
            <IntegrationMetric label="Reports on" value={Object.values(reports).filter(Boolean).length.toString()} />
            <IntegrationMetric label="Last test" value={integrationSavedAt ? new Date(integrationSavedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Pending"} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,.82fr)_minmax(0,1.18fr)]">
        <section className="panel p-4 sm:p-5">
          <PanelTitle icon={<UsersRound className="h-5 w-5" />} title="Team Management" caption="Role-based views for CEO, manager and analyst workflows" />
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.role} className="rounded border border-slate-200 p-3 dark:border-slate-800">
                <div className="grid gap-3 sm:grid-cols-[110px_1fr] sm:items-center">
                  <div>
                    <p className="font-semibold">{role.role}</p>
                    <p className="mt-1 text-sm text-slate-500">{role.users} users</p>
                  </div>
                  <div className="sm:justify-self-end">
                    <Badge tone={role.tone}>{role.access}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <PanelTitle icon={<PlugZap className="h-5 w-5" />} title="Portal Integrations" caption="Credential and sync health for Indian procurement portals" />
          <div className="space-y-3">
            {portalRows.map((portal) => (
              <div key={portal.name} className="rounded border border-slate-200 p-3 dark:border-slate-800">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold">{portal.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{portal.health} · Last sync: {portal.lastSync}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                    <Badge tone={portal.tone}>{portal.status}</Badge>
                    <button
                      type="button"
                      onClick={() => configurePortal(portal)}
                      disabled={loadingPortal === portal.key}
                      className="inline-flex h-8 items-center gap-2 rounded border border-slate-200 px-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      {loadingPortal === portal.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                      {portal.key === "up" && upSync?.ok ? "Reconnect" : portal.key === "gem" && gemSync?.sync?.ok ? "Reconnect" : portal.status === "Signal mode" ? "Check signal" : "Configure"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{portalRows.find((portal) => portal.key === activePortal)?.name}</p>
                <p className={`mt-1 text-sm ${portalMessage.toLowerCase().includes("failed") || portalMessage.toLowerCase().includes("warning") ? "text-amber-600 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
                  {portalMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => configurePortal(portalRows.find((portal) => portal.key === activePortal) || portalRows[2])}
                disabled={Boolean(loadingPortal)}
                className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loadingPortal ? "animate-spin" : ""}`} />
                Test connection
              </button>
            </div>

            {upSync && activePortal === "up" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <IntegrationMetric label="Construction orgs" value={upSync.activeConstructionOrgCount.toString()} />
                <IntegrationMetric label="Official active count" value={upSync.activeConstructionTenderCount.toLocaleString("en-IN")} />
                <IntegrationMetric label="App UP matches" value={upSync.appMatchedTenders.toString()} />
              </div>
            ) : null}

            {upSync?.liveTenderSignals?.length && activePortal === "up" ? (
              <div className="mt-3 rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold">Live signal</p>
                {upSync.liveTenderSignals.slice(0, 1).map((item) => (
                  <div key={item.tenderId} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-1">{item.tenderId} · {item.organisation} · {item.category}</p>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline">
                      Open source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : null}

            {integrationSavedAt ? <p className="mt-3 text-xs text-slate-500">Last connection test: {new Date(integrationSavedAt).toLocaleString("en-IN")}</p> : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-4 sm:p-5">
          <PanelTitle icon={<Bell className="h-5 w-5" />} title="Notification Preferences" caption="Who gets what alert and where" />
          <div className="space-y-3">
            {notificationChannels.map((channel) => (
              <label key={channel} className="flex items-center justify-between rounded border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-sm font-medium">{channel}</span>
                <input type="checkbox" checked={Boolean(notifications[channel])} onChange={() => toggleNotification(channel)} className="h-4 w-4 rounded" />
              </label>
            ))}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <PanelTitle icon={<CalendarClock className="h-5 w-5" />} title="Report Scheduling" caption="Board-ready packs and operational digests" />
          <div className="space-y-3">
            {reportSchedules.map((item) => (
              <label key={item} className="flex items-center justify-between rounded border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-sm font-medium">{item}</span>
                <input type="checkbox" checked={Boolean(reports[item])} onChange={() => toggleReport(item)} className="h-4 w-4 rounded" />
              </label>
            ))}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <PanelTitle icon={<ShieldCheck className="h-5 w-5" />} title="Security & Audit" caption="Controls needed before production rollout" />
          <div className="space-y-3">
            <SecurityRow icon={<LockKeyhole className="h-4 w-4" />} label="NextAuth role enforcement" status="Planned" />
            <SecurityRow icon={<ClipboardList className="h-4 w-4" />} label="Tender action audit trail" status="Ready schema" />
            <SecurityRow icon={<Mail className="h-4 w-4" />} label="Signed report delivery" status="Planned" />
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title, caption }: { icon: React.ReactNode; title: string; caption: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-50">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-500">{caption}</p>
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge tone={status === "Planned" ? "amber" : "blue"}>{status}</Badge>
    </div>
  );
}

function IntegrationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 sm:p-3">
      <p className="truncate text-[11px] uppercase text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-1 break-words text-base font-semibold sm:text-lg">{value}</p>
    </div>
  );
}
