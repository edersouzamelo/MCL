import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ArmazenagemPage() {
  return (
    <AppShell>
      <PageHeader title="Armazenagem" description="Modulo de armazenagem em modo seguro." />
      <div className="rounded border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        Pagina de armazenagem carregada sem dependencia direta do PostgreSQL.
      </div>
    </AppShell>
  );
}
