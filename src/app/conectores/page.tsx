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

  const officialIds = ["compras-gov", "siafi", "siscofis", "pncp", "sigelog"];
  // Sort official connectors to always have a clean order
  const officialConnectors = state.connectors
    .filter((c) => officialIds.includes(c.id))
    .sort((a, b) => officialIds.indexOf(a.id) - officialIds.indexOf(b.id));
    
  const demoConnectors = state.connectors.filter((c) => !officialIds.includes(c.id));

  return (
    <AppShell>
      <PageHeader
        title="Saude dos conectores"
        description="Monitor em tempo real dos conectores oficiais da cadeia logística e simuladores demonstrativos."
        action={<InlineLink href="/analises/materiais">Abrir CATMAT e atas</InlineLink>}
      />

      {/* Section 1: Conectores Oficiais da Cadeia Logística */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Activity className="h-5 w-5 text-emerald-700" />
          Conectores de Sistemas da Cadeia Logística
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {officialConnectors.map((connector) => {
            const Icon = icon[connector.status as keyof typeof icon] || CheckCircle2;
            const borderTone = 
              connector.status === "SAUDAVEL" 
                ? "border-l-4 border-l-emerald-600" 
                : connector.status === "FALHA" 
                  ? "border-l-4 border-l-rose-600" 
                  : "border-l-4 border-l-amber-500";

            return (
              <Card key={connector.id} className={`${borderTone} flex flex-col justify-between hover:shadow-md transition-shadow duration-300`}>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{connector.name}</h3>
                        <Badge tone={connector.status === "SAUDAVEL" ? "good" : connector.status === "FALHA" ? "bad" : "warn"}>
                          {connector.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">Fonte do sistema: <strong className="text-zinc-700 dark:text-zinc-300">{connector.sourceSystem}</strong></p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{connector.message}</p>
                    </div>
                    
                    {connector.id === "compras-gov" ? (
                      <div className="shrink-0">
                        <ComprasGovSyncButton />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800/20 rounded-md border border-zinc-100 dark:border-zinc-800 shrink-0">
                        <Icon className={`h-4 w-4 ${connector.status === "SAUDAVEL" ? "text-emerald-600" : connector.status === "FALHA" ? "text-rose-600" : "text-amber-500"}`} />
                        <span>{connector.status === "SAUDAVEL" ? "Ativo" : connector.status === "FALHA" ? "Inativo" : "Aviso"}</span>
                      </div>
                    )}
                  </div>

                  {connector.id === "compras-gov" && (
                    <div className="mt-3 text-xs text-indigo-700 font-medium">
                      <InlineLink href="/analises/materiais">Ir para busca por CATMAT e atas</InlineLink>
                    </div>
                  )}
                </div>

                <dl className="mt-6 grid gap-2.5 grid-cols-2 text-xs border-t border-zinc-100 dark:border-zinc-850 pt-4">
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Última sincronização</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200">{formatDateTime(connector.lastRunAt)}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Endpoint integrado</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200 truncate" title={connector.endpoint ?? "Não informado"}>{connector.endpoint ?? "Não informado"}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Registros lidos</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.recordsRead ?? 0}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Aceitos / Importados</dt>
                    <dd className="font-semibold text-zinc-855 dark:text-zinc-200">{connector.acceptedRecords ?? connector.recordsImported ?? 0}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Atualizados</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.updatedRecords ?? 0}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Duplicados detectados</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.duplicateRecords ?? 0}</dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Rejeitados / Quarentena</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200">
                      {connector.rejectedRecords ?? 0} / {connector.quarantinedRecords ?? 0}
                    </dd>
                  </div>
                  <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
                    <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Duração e versão</dt>
                    <dd className="font-semibold text-zinc-850 dark:text-zinc-200 truncate" title={`${connector.durationMs ?? 0} ms - ${connector.mappingVersion ?? "v1"}`}>
                      {connector.durationMs ?? 0} ms - {connector.mappingVersion ?? "v1"}
                    </dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 2: Simuladores do Piloto */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Activity className="h-5 w-5 text-sky-700" />
          Simuladores Internos do Piloto (Ambiente de Demonstração)
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {demoConnectors.map((connector) => {
            const Icon = icon[connector.status as keyof typeof icon] || CheckCircle2;
            const borderTone = 
              connector.status === "SAUDAVEL" 
                ? "border-l-4 border-l-emerald-600" 
                : connector.status === "FALHA" 
                  ? "border-l-4 border-l-rose-600" 
                  : "border-l-4 border-l-amber-500";

            return (
              <Card key={connector.id} className={`${borderTone} flex flex-col justify-between hover:shadow-md transition-shadow duration-300`}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon aria-hidden className={`h-5 w-5 ${connector.status === "SAUDAVEL" ? "text-emerald-700" : connector.status === "FALHA" ? "text-rose-700" : "text-amber-500"}`} />
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{connector.name}</h3>
                    </div>
                    <Badge tone={connector.status === "SAUDAVEL" ? "good" : connector.status === "ATRASADO" ? "warn" : "bad"}>
                      {connector.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{connector.message}</p>
                </div>
                
                <dl className="mt-6 space-y-2 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <div className="flex justify-between gap-3"><dt className="text-zinc-500">Fonte</dt><dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.sourceSystem}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-zinc-500">Última execução</dt><dd className="font-semibold text-zinc-850 dark:text-zinc-200">{formatDateTime(connector.lastRunAt)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-zinc-500">Registros Importados</dt><dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.recordsImported}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-zinc-500">Em Quarentena</dt><dd className="font-semibold text-zinc-850 dark:text-zinc-200">{connector.quarantinedRecords}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <Activity aria-hidden className="h-5 w-5 text-emerald-700" />
          <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Os conectores da cadeia logística operam em tempo real ou sob agendamento, garantindo que os dados fiquem sincronizados com o MCL para um diagnóstico íntegro e unificado.</p>
        </div>
      </Card>
    </AppShell>
  );
}
