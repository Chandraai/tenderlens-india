import { SectionHeader } from "@/components/ui";
import { CeoAiInsights } from "@/components/ceo-ai-insights";
import { UploadedTenderInsights } from "@/components/uploaded-tender-insights";
import Link from "next/link";

export default function AiInsightsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Insights"
        kicker="CEO bid/no-bid cockpit for Indian construction tenders"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/documents" className="inline-flex h-10 items-center rounded bg-slate-950 px-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
              Upload tender PDF
            </Link>
            <Link href="/tenders" className="inline-flex h-10 items-center rounded border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
              View live tenders
            </Link>
          </div>
        }
      />
      <UploadedTenderInsights />
      <CeoAiInsights />
    </div>
  );
}
