"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Progress } from "@/components/ui";
import { saveOriginalDocument } from "@/lib/original-document-store";
import type { UploadedTenderAnalysis } from "@/lib/tender-analysis";

const storageKey = "tenderlens.uploadedAnalyses";

export function PdfUploadAnalyzer() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boqInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<UploadedTenderAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);
    if (boqFile) formData.append("boqFile", boqFile);

    const response = await fetch("/api/tenders/analyze-pdf", {
      method: "POST",
      body: formData
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error || "PDF analysis failed");
      setLoading(false);
      return;
    }

    const nextAnalysis = body.analysis as UploadedTenderAnalysis;
    await saveOriginalDocument(nextAnalysis.id, file);
    if (boqFile) await saveOriginalDocument(`${nextAnalysis.id}:boq`, boqFile);
    const existing = readStoredAnalyses();
    window.localStorage.setItem(storageKey, JSON.stringify([nextAnalysis, ...existing].slice(0, 10)));
    window.dispatchEvent(new Event("tenderlens:analysis-updated"));
    setAnalysis(nextAnalysis);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div
        className="grid min-h-56 cursor-pointer place-items-center rounded border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-500 dark:border-slate-700"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
            setAnalysis(null);
          }}
        />
        <div>
          <Upload className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-medium">{file ? file.name : "Upload tender PDF"}</p>
          <p className="mt-1 text-sm text-slate-500">Deadline, EMD, PBG, PQ criteria, scope, clauses and CEO decision</p>
        </div>
      </div>

      <div
        className="grid min-h-28 cursor-pointer place-items-center rounded border border-dashed border-slate-300 p-4 text-center hover:border-brand-500 dark:border-slate-700"
        onClick={() => boqInputRef.current?.click()}
      >
        <input
          ref={boqInputRef}
          type="file"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            setBoqFile(event.target.files?.[0] || null);
            setError("");
            setAnalysis(null);
          }}
        />
        <div>
          <FileSpreadsheet className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 font-medium">{boqFile ? boqFile.name : "Attach BOQ Excel (optional)"}</p>
          <p className="mt-1 text-sm text-slate-500">Upload .xls/.xlsx with tender PDF for accurate BOQ, project cost and profit analysis</p>
        </div>
      </div>

      <button
        type="button"
        disabled={!file || loading}
        onClick={analyze}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {boqFile ? "Analyze Tender + BOQ" : "Analyze Tender"}
      </button>

      {error ? (
        <div className="flex items-start gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <p>{error}</p>
        </div>
      ) : null}

      {analysis ? <AnalysisResult analysis={analysis} /> : null}
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: UploadedTenderAnalysis }) {
  const tone = analysis.recommendedDecision === "Take Tender" ? "green" : analysis.recommendedDecision === "Review Carefully" ? "amber" : "red";

  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Analysis saved to AI Insights</p>
          <h3 className="mt-1 font-semibold">{analysis.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{analysis.documentType || "Tender"} document · {analysis.deadlineStatus || "Unknown"} deadline</p>
        </div>
        <Badge tone={tone}>{analysis.recommendedDecision}</Badge>
      </div>
      {analysis.documentWarning ? (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {analysis.documentWarning}
        </div>
      ) : null}
      <div className="mb-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        <span>Bid readiness {analysis.bidReadinessScore}/100</span>
      </div>
      {analysis.boqAnalysis ? (
        <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          BOQ: {analysis.boqAnalysis.sourceConfidence} confidence · {analysis.boqAnalysis.estimatedProjectCost} · {analysis.boqAnalysis.items.length} high-value lines loaded for CEO view
        </div>
      ) : null}
      <Progress value={analysis.bidReadinessScore} tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"} />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{analysis.investorSummary}</p>
      <Link href="/ai-insights" className="mt-4 inline-flex h-10 items-center rounded border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
        View CEO analysis
      </Link>
    </div>
  );
}

function readStoredAnalyses(): UploadedTenderAnalysis[] {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]") as UploadedTenderAnalysis[];
  } catch {
    return [];
  }
}
