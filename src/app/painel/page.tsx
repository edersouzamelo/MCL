import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Situacao geral da cadeia"
        description="Painel temporario em modo seguro enquanto o banco PostgreSQL e revisado."
      />
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Painel carregado em modo seguro. Use CATMAT e Atas pelo menu para continuar a analise de cobertura.
      </div>
    </AppShell>
  );
}
