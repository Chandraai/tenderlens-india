import { TenderTable } from "@/components/tender-table";
import { SectionHeader } from "@/components/ui";
import { UpPortalSync } from "@/components/up-portal-sync";

export default function TendersPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Tender Feed" kicker="Real estate, construction, PWD, CPWD, NHAI and housing tenders" />
      <UpPortalSync />
      <TenderTable />
    </div>
  );
}
