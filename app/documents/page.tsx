import { SectionHeader } from "@/components/ui";
import { PdfUploadAnalyzer } from "@/components/pdf-upload-analyzer";
import { DocumentReportingWorkspace } from "@/components/document-reporting-workspace";
import { CompanyDocumentVault } from "@/components/company-document-vault";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Document Vault" kicker="Tender PDF, BOQ and CEO bid-readiness" />
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="panel p-6">
          <PdfUploadAnalyzer />
        </div>
        <CompanyDocumentVault />
      </div>
      <DocumentReportingWorkspace />
    </div>
  );
}
