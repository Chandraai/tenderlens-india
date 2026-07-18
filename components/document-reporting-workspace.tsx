"use client";

import { Download, FileBarChart, FileJson, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Progress } from "@/components/ui";
import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";

const storageKey = "tenderlens.uploadedAnalyses";

export function DocumentReportingWorkspace() {
  const [analyses, setAnalyses] = useState<UploadedTenderAnalysis[]>([]);

  useEffect(() => {
    function refresh() {
      setAnalyses(readStoredAnalyses());
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("tenderlens:analysis-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tenderlens:analysis-updated", refresh);
    };
  }, []);

  if (!analyses.length) {
    return (
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-50">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Reporting Workspace</h2>
            <p className="mt-1 text-sm text-slate-500">Upload a tender PDF to generate CEO memo, risk register, compliance report and bid action plan.</p>
          </div>
        </div>
      </section>
    );
  }

  function clearReports() {
    window.localStorage.removeItem(storageKey);
    setAnalyses([]);
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-50">AI reporting</p>
          <h2 className="text-lg font-semibold">CEO Tender Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Board memo, risk register, bid strategy and compliance actions generated from uploaded PDFs.</p>
        </div>
        <button
          type="button"
          onClick={clearReports}
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-200 px-3 text-sm dark:border-slate-700"
        >
          <Trash2 className="h-4 w-4" />
          Clear reports
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        {analyses.map((analysis) => (
          <ReportCard key={analysis.id} analysis={withReportFallback(analysis)} />
        ))}
      </div>
    </section>
  );
}

function ReportCard({ analysis }: { analysis: UploadedTenderAnalysis }) {
  const report = analysis.aiReport;
  const tone = analysis.recommendedDecision === "Take Tender" ? "green" : analysis.recommendedDecision === "Review Carefully" ? "amber" : "red";
  const riskTone = analysis.riskLevel === "Low" ? "green" : analysis.riskLevel === "Medium" ? "amber" : "red";

  return (
    <article className="rounded border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone={tone}>{analysis.recommendedDecision}</Badge>
            <Badge tone={riskTone}>{analysis.riskLevel} risk</Badge>
            <Badge tone="blue">{analysis.winProbability}% win probability</Badge>
          </div>
          <h3 className="text-base font-semibold">{analysis.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{analysis.fileName} · {new Date(analysis.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadTextReport(analysis)}
            className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm dark:border-slate-700"
          >
            <Download className="h-4 w-4" />
            Memo
          </button>
          <button
            type="button"
            onClick={() => downloadJsonReport(analysis)}
            className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 px-3 text-sm dark:border-slate-700"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric label="Readiness" value={`${analysis.bidReadinessScore}/100`} />
        <Metric label="Value" value={analysis.estimatedValue} />
        <Metric label="EMD" value={analysis.emd} />
        <Metric label="PBG" value={analysis.pbg} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>{report.complianceReadiness.status}</span>
          <span>{report.complianceReadiness.score}/100</span>
        </div>
        <Progress value={report.complianceReadiness.score} tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ReportBlock title="Executive brief" items={[report.executiveBrief, report.boardRecommendation]} />
        <ReportBlock title="Financial exposure" items={[report.financialExposure.cashflowView, `Estimated value: ${report.financialExposure.estimatedValue}`, `EMD: ${report.financialExposure.emd}`, `PBG: ${report.financialExposure.pbg}`]} />
        <ReportBlock title="Compliance actions" items={report.complianceReadiness.requiredActions} />
        <ReportBlock title="72-hour bid plan" items={report.actionPlan72Hours} />
        <ReportBlock title="Risk register" items={report.riskRegister.map((item) => `${item.severity}: ${item.risk} Mitigation: ${item.mitigation}`)} />
        <ReportBlock title="Bid strategy" items={[report.bidStrategy.pricingPosture, report.bidStrategy.l1Approach, report.bidStrategy.marginGuardrail, ...report.bidStrategy.negotiationLevers]} />
      </div>
    </article>
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

function ReportBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {items.slice(0, 6).map((item, index) => (
          <p key={`${index}-${item}`} className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function downloadTextReport(analysis: UploadedTenderAnalysis) {
  const report = analysis.aiReport;
  const text = [
    `TenderLens AI Report`,
    `Tender: ${analysis.title}`,
    `Decision: ${analysis.recommendedDecision}`,
    `Risk: ${analysis.riskLevel}`,
    `Readiness: ${analysis.bidReadinessScore}/100`,
    "",
    "Executive Brief",
    report.executiveBrief,
    "",
    "Board Recommendation",
    report.boardRecommendation,
    "",
    "Financial Exposure",
    report.financialExposure.cashflowView,
    `Estimated value: ${report.financialExposure.estimatedValue}`,
    `EMD: ${report.financialExposure.emd}`,
    `PBG: ${report.financialExposure.pbg}`,
    "",
    "Compliance Actions",
    ...report.complianceReadiness.requiredActions.map((item) => `- ${item}`),
    "",
    "72-hour Bid Plan",
    ...report.actionPlan72Hours.map((item) => `- ${item}`),
    "",
    "Risk Register",
    ...report.riskRegister.map((item) => `- [${item.severity}] ${item.risk} | ${item.mitigation}`)
  ].join("\n");
  downloadBlob(text, `${safeName(analysis.title)}-ai-report.txt`, "text/plain");
}

function downloadJsonReport(analysis: UploadedTenderAnalysis) {
  downloadBlob(JSON.stringify(analysis, null, 2), `${safeName(analysis.title)}-ai-report.json`, "application/json");
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "tender";
}

function readStoredAnalyses(): UploadedTenderAnalysis[] {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]") as UploadedTenderAnalysis[];
  } catch {
    return [];
  }
}

function withReportFallback(analysis: UploadedTenderAnalysis): UploadedTenderAnalysis {
  if (analysis.aiReport) return analysis;
  return {
    ...analysis,
    aiReport: {
      executiveBrief: analysis.investorSummary,
      boardRecommendation: analysis.decisionReasons?.[0] || "Review tender manually before approval.",
      financialExposure: {
        estimatedValue: analysis.estimatedValue,
        emd: analysis.emd,
        pbg: analysis.pbg,
        cashflowView: "Confirm EMD, PBG, retention and payment terms before bid approval."
      },
      complianceReadiness: {
        score: analysis.bidReadinessScore,
        status: "Legacy report. Re-upload PDF for full AI reporting.",
        requiredActions: analysis.documentGaps
      },
      riskRegister: analysis.riskReasons.map((risk) => ({ risk, severity: analysis.riskLevel, mitigation: "Review manually." })),
      bidStrategy: {
        pricingPosture: "Re-upload PDF for full AI bid strategy.",
        l1Approach: "Run L1 simulation before commercial submission.",
        marginGuardrail: "Protect minimum margin.",
        negotiationLevers: []
      },
      actionPlan72Hours: ["Re-upload PDF to generate a complete 72-hour bid plan."],
      reportSections: []
    }
  };
}
