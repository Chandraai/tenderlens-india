"use client";

import Link from "next/link";
import { AlertTriangle, Brain, CheckCircle2, FileSpreadsheet, FileText, RefreshCw, Target, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Progress } from "@/components/ui";
import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";

const tenderStorageKey = "tenderlens.uploadedAnalyses";

export function CompanyDocumentVault() {
  const [tenderAnalyses, setTenderAnalyses] = useState<UploadedTenderAnalysis[]>([]);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("tenderlens:analysis-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tenderlens:analysis-updated", refresh);
    };
  }, []);

  function refresh() {
    setTenderAnalyses(readTenderAnalyses());
  }

  const latestTender = tenderAnalyses[0];
  const tenderSummary = useMemo(() => buildTenderSummary(latestTender), [latestTender]);

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-50">Tender document command center</p>
            <h2 className="text-lg font-semibold">Tender Upload Readiness</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Upload tender PDF and optional BOQ Excel on the left. This panel updates from the latest tender and shows what CEO/estimator must verify before bid spend.
            </p>
          </div>
          <button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm dark:border-slate-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric label="Tender readiness" value={latestTender ? `${tenderSummary.readiness}/100` : "Upload PDF"} />
          <Metric label="Saved tenders" value={tenderAnalyses.length.toString()} />
          <Metric label="BOQ status" value={latestTender?.boqAnalysis ? latestTender.boqAnalysis.sourceConfidence : "Pending"} />
          <Metric label="Open gaps" value={latestTender ? tenderSummary.openGaps.toString() : "0"} />
        </div>
        <div className="mt-3">
          <Progress value={latestTender ? tenderSummary.readiness : 0} tone={tenderSummary.readiness >= 80 ? "green" : tenderSummary.readiness >= 55 ? "amber" : "red"} />
        </div>
      </div>

      {latestTender ? (
        <>
          <LatestTenderPanel tender={latestTender} summary={tenderSummary} />
          <TenderChecklistPanel tender={latestTender} />
        </>
      ) : (
        <EmptyTenderVault />
      )}

      <div className="panel p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Recent Tender Uploads</h3>
            <p className="mt-1 text-sm text-slate-500">Last uploaded/analysed tender packages saved for AI Insights.</p>
          </div>
          <Link href="/ai-insights" className="inline-flex h-9 items-center justify-center gap-2 rounded bg-slate-950 px-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
            <Brain className="h-4 w-4" />
            Open AI Insights
          </Link>
        </div>
        {tenderAnalyses.length ? (
          <div className="space-y-3">
            {tenderAnalyses.slice(0, 5).map((tender) => (
              <TenderHistoryRow key={tender.id} tender={tender} />
            ))}
          </div>
        ) : (
          <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
            No tender uploaded yet. Add the tender PDF from the upload box to build the vault.
          </p>
        )}
      </div>
    </section>
  );
}

function LatestTenderPanel({ tender, summary }: { tender: UploadedTenderAnalysis; summary: TenderSummary }) {
  const decisionTone = tender.recommendedDecision === "Take Tender" ? "green" : tender.recommendedDecision === "Review Carefully" ? "amber" : "red";
  const deadlineTone = tender.deadlineStatus === "Closed" ? "red" : tender.deadlineStatus === "Closing Soon" ? "amber" : "green";
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone={decisionTone}>{tender.recommendedDecision}</Badge>
            <Badge tone={deadlineTone}>{tender.deadlineStatus || "Unknown"} deadline</Badge>
            <Badge tone={tender.boqAnalysis ? "green" : "amber"}>{tender.boqAnalysis ? "BOQ linked" : "BOQ pending"}</Badge>
          </div>
          <h3 className="text-base font-semibold leading-snug text-slate-950 dark:text-white">{tender.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{tender.fileName} · {tender.department}</p>
        </div>
        <div className="min-w-44 rounded border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-xs text-slate-500">Bid readiness</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{summary.readiness}/100</p>
          <Progress value={summary.readiness} tone={summary.readiness >= 80 ? "green" : summary.readiness >= 55 ? "amber" : "red"} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric label="Estimated value" value={tender.estimatedValue} />
        <Metric label="Deadline" value={tender.deadline} />
        <Metric label="EMD" value={tender.emd} />
        <Metric label="PBG" value={tender.pbg} />
      </div>

      {tender.deadlineStatus === "Closed" ? (
        <div className="mt-4 flex gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Deadline is closed. Keep this tender only for reference/corrigendum watch; do not spend on EMD, BOQ pricing or submission.</p>
        </div>
      ) : null}

      {summary.verificationWarnings.length ? (
        <div className="mt-4 grid gap-2">
          {summary.verificationWarnings.map((warning, index) => (
            <p key={`${index}-${warning}`} className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TenderChecklistPanel({ tender }: { tender: UploadedTenderAnalysis }) {
  const checklist = buildTenderChecklist(tender);
  return (
    <div className="panel p-5">
      <h3 className="text-base font-semibold">Tender-Specific Checklist</h3>
      <p className="mt-1 text-sm text-slate-500">Generated from the uploaded tender, PQ clauses, BOQ signals and CEO verification rules.</p>
      <div className="mt-4 grid gap-3">
        {checklist.map((item) => (
          <div key={item.label} className="grid gap-3 rounded border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[auto_1fr_auto] md:items-center">
            <span className={`grid h-9 w-9 place-items-center rounded ${item.done ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
              {item.done ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </span>
            <div>
              <p className="font-medium text-slate-950 dark:text-white">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
            </div>
            <Badge tone={item.done ? "green" : "amber"}>{item.done ? "Ready" : "Verify"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTenderVault() {
  return (
    <div className="panel p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <VaultStep icon={<FileText className="h-5 w-5" />} title="Upload tender PDF" text="NIT/RFP/GeM bid document is mandatory for deadline, EMD, PQ and clauses." />
        <VaultStep icon={<FileSpreadsheet className="h-5 w-5" />} title="Attach BOQ Excel" text="Optional but recommended for project cost, GST bridge, T&P/TNP and net profit analysis." />
        <VaultStep icon={<Target className="h-5 w-5" />} title="Review in AI Insights" text="CEO summary, finance, risks, bid strategy and 72-hour plan are generated after analysis." />
      </div>
    </div>
  );
}

function TenderHistoryRow({ tender }: { tender: UploadedTenderAnalysis }) {
  const tone = tender.recommendedDecision === "Take Tender" ? "green" : tender.recommendedDecision === "Review Carefully" ? "amber" : "red";
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium leading-snug text-slate-950 dark:text-white">{tender.title}</p>
          <p className="mt-1 text-xs text-slate-500">{tender.fileName}</p>
        </div>
        <Badge tone={tone}>{tender.recommendedDecision}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <Metric label="Readiness" value={`${tender.bidReadinessScore}/100`} />
        <Metric label="BOQ" value={tender.boqAnalysis ? tender.boqAnalysis.sourceConfidence : "Pending"} />
        <Metric label="Deadline" value={tender.deadline} />
      </div>
    </div>
  );
}

function VaultStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
      <span className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

type TenderSummary = {
  readiness: number;
  openGaps: number;
  verificationWarnings: string[];
};

function buildTenderSummary(tender?: UploadedTenderAnalysis): TenderSummary {
  if (!tender) return { readiness: 0, openGaps: 0, verificationWarnings: [] };
  const warnings = [
    isVerifyField(tender.estimatedValue) ? "Estimated value is not verified from source/BOQ." : "",
    isVerifyField(tender.emd) ? "EMD is pending source verification." : "",
    isVerifyField(tender.pbg) ? "PBG/performance security must be checked in NIT/BOQ/ATC." : "",
    isVerifyField(tender.deadline) ? "Deadline/corrigendum must be confirmed on official portal." : "",
    !tender.boqAnalysis ? "Attach BOQ Excel for accurate project cost and profit analysis." : ""
  ].filter(Boolean);
  const openGaps = warnings.length + tender.documentGaps.length;
  const readiness = Math.max(0, Math.min(100, tender.bidReadinessScore - warnings.length * 5));
  return { readiness, openGaps, verificationWarnings: warnings.slice(0, 4) };
}

function buildTenderChecklist(tender: UploadedTenderAnalysis) {
  return [
    {
      label: "Tender PDF parsed",
      done: tender.isTenderDocument !== false,
      detail: tender.isTenderDocument === false ? "Upload actual NIT/RFP/BOQ tender document." : "Tender-like document detected and saved."
    },
    {
      label: "Deadline and corrigendum",
      done: !isVerifyField(tender.deadline) && tender.deadlineStatus !== "Unknown",
      detail: tender.deadlineStatus === "Closed" ? "Closed tender; only corrigendum watch is allowed." : `Current detected deadline: ${tender.deadline}.`
    },
    {
      label: "EMD/PBG finance exposure",
      done: !isVerifyField(tender.emd) && !isVerifyField(tender.pbg),
      detail: `EMD ${tender.emd}; PBG ${tender.pbg}. Verify exemption, BG format and validity.`
    },
    {
      label: "PQ eligibility",
      done: tender.pqCriteria.length > 0 && tender.documentGaps.length <= 2,
      detail: tender.pqCriteria.slice(0, 2).join(" ") || "PQ criteria not clearly detected; verify from NIT/RFP."
    },
    {
      label: "BOQ and profit model",
      done: Boolean(tender.boqAnalysis),
      detail: tender.boqAnalysis ? `${tender.boqAnalysis.sourceConfidence} confidence · ${tender.boqAnalysis.estimatedProjectCost}` : "Attach BOQ Excel for line items, GST bridge and net profit."
    },
    {
      label: "CEO report ready",
      done: tender.bidReadinessScore >= 70 && tender.deadlineStatus !== "Closed",
      detail: tender.deadlineStatus === "Closed" ? "CEO report should recommend No-Bid for current cycle." : "Open AI Insights for summary, finance, risks and 72h plan."
    }
  ];
}

function isVerifyField(value: string) {
  return !value || /verify|not clearly found|unknown|not applicable|pending/i.test(value);
}

function readTenderAnalyses(): UploadedTenderAnalysis[] {
  try {
    return JSON.parse(window.localStorage.getItem(tenderStorageKey) || "[]") as UploadedTenderAnalysis[];
  } catch {
    return [];
  }
}
