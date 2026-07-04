import { Activity, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComprasGovSyncButton } from "@/components/ComprasGovSyncButton";
import { Badge, Card, InlineLink, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function ConnectorsPage() {
  const state = getDemoState();
  const icon = {
    SAUDAVEL: CheckCircle2,
    ATRASADO: Clock3,
    FALHA: AlertCircle,
    SINCRONIZANDO: Activity,
    DESABILITADO: Clock3,
  };
  const comprasGov = state.connectors.find((connector) => connector.id === "compras-gov");
  const demoConnectors = state.connectors.filter((connector) => connector.id !== "compras-gov");

  return (
    <AppShell>
      <PageHeader
        title="Saude dos conectores"
        description="Conector oficial somente leitura do Compras.gov.br e conectores demonstrativos do piloto."
        action={<InlineLink href="/analises/materiais">Abrir CATMAT e atas</InlineLink>}
      />
      {comprasGov ? (
        <Card className="mb-4 border-l-4 border-l-emerald-600">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{comprasGov.name}</h2>
                <Badge tone={comprasGov.status === "SAUDAVEL" ? "good" : comprasGov.status === "FALHA" ? "bad" : "warn"}>
                  {comprasGov.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{comprasGov.message}</p>
              <p className="mt-1 text-sm text-zinc-600">
                Para localizar atas disponiveis, abra o fluxo CATMAT e atas. A sincronizacao tecnica abaixo exige sessao de gestor/admin e
                nao substitui a busca orientada pela necessidade.
              </p>
              <div className="mt-3">
                <InlineLink href="/analises/materiais">Ir para busca por CATMAT e atas</InlineLink>
              </div>
            </div>
            <ComprasGovSyncButton />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Ultima sincronizacao</dt><dd className="font-semibold">{formatDateTime(comprasGov.lastRunAt)}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Endpoint</dt><dd className="font-semibold">{comprasGov.endpoint ?? "nao informado"}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Registros lidos</dt><dd className="font-semibold">{comprasGov.recordsRead ?? 0}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Aceitos</dt><dd className="font-semibold">{comprasGov.acceptedRecords ?? 0}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Atualizados</dt><dd className="font-semibold">{comprasGov.updatedRecords ?? 0}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Duplicados</dt><dd className="font-semibold">{comprasGov.duplicateRecords ?? 0}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Rejeitados/quarentena</dt><dd className="font-semibold">{comprasGov.rejectedRecords ?? 0}/{comprasGov.quarantinedRecords}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Duracao e mapa</dt><dd className="font-semibold">{comprasGov.durationMs ?? 0} ms - {comprasGov.mappingVersion}</dd></div>
          </dl>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {demoConnectors.map((connector) => {
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
          <p className="text-sm text-zinc-700">O Compras.gov.br e somente leitura e preserva staging, hash, horario de coleta e versao do mapeamento antes de projetar dados para o MCL.</p>
        </div>
      </Card>
    </AppShell>
  );
}
