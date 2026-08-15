import { AppShell } from "@/components/AppShell";
import { AssistenteIaClient } from "@/components/AssistenteIaClient";

export const dynamic = "force-dynamic";

export default function AssistenteIaPage() {
  return (
    <AppShell>
      <AssistenteIaClient />
    </AppShell>
  );
}
