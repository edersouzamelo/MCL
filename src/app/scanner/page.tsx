import { AppShell } from "@/components/AppShell";
import { ScannerClient } from "@/components/ScannerClient";
import { PageHeader } from "@/components/ui";

export default function ScannerPage() {
  return (
    <AppShell>
      <PageHeader
        title="Scanner QR"
        description="Leitura por camera com fallback manual. O QR contem apenas identificador opaco MCL:UL:<token>."
      />
      <ScannerClient />
    </AppShell>
  );
}
