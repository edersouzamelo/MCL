import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function CreditoPage() {
  return (
    <AppShell>
      <PageHeader title="Credito" description="Modulo de credito em modo seguro." />
      <div className="rounded border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        Pagina de credito carregada sem dependencia direta do PostgreSQL.
      </div>
    </AppShell>
  );
}
