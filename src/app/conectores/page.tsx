import { Activity, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function ConnectorsPage() {
  const state = getDemoState();
  const icon = {
    SAUDAVEL: CheckCircle2,
    ATRASADO: Clock3,
    FALHA: AlertCircle,
  };

  return (
    <AppShell>
      <PageHeader
        title="Saude dos conectores"
        description="Conectores simulados, sem raspagem e sem integracao real com sistemas oficiais."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {state.connectors.map((connector) => {
          const Icon = icon[connector.status];
          return (
            <Card key={connector.id}>
              <div className="flex items-start justify-between gap-3">
                <Icon aria-hidden className="h-5 w-5 text-emerald-700" />
                <Badge tone={connector.status === "SAUDAVEL" ? "good" : connector.status === "ATRASADO" ? "warn" : "bad"}>
                  {connector.status}
                </Badge>
              </div>
              <h2 className="mt-3 font-semibold">{connector.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">{connector.message}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt>Fonte</dt><dd>{connector.sourceSystem}</dd></div>
                <div className="flex justify-between gap-3"><dt>Ultima execucao</dt><dd>{formatDateTime(connector.lastRunAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Importados</dt><dd>{connector.recordsImported}</dd></div>
                <div className="flex justify-between gap-3"><dt>Quarentena</dt><dd>{connector.quarantinedRecords}</dd></div>
              </dl>
            </Card>
          );
        })}
      </div>
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Activity aria-hidden className="h-5 w-5 text-sky-700" />
          <p className="text-sm text-zinc-700">Nenhum conector demonstrativo consulta sistema externo. A troca real depende de autorizacao, mapeamento e credenciais institucionais.</p>
        </div>
      </Card>
    </AppShell>
  );
}
