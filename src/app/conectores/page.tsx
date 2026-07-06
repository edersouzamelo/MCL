import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Clock3, Database, Globe, HelpCircle, Info, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComprasGovSyncButton } from "@/components/ComprasGovSyncButton";
import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData, type SourceSystemDomain } from "@/modules/connectors/catalog";

export const dynamic = "force-dynamic";

const DOMAIN_ORDER: SourceSystemDomain[] = [
  "Necessidades",
  "Aquisições",
  "Orçamento e finanças",
  "Recebimento",
  "Estoque / armazém",
  "Transporte / distribuição",
  "Documental",
  "Local / derivado / contingência"
];

function getStatusBadgeTone(status: string) {
  switch (status) {
    case "SAUDAVEL": return "good";
    case "FALHA": return "bad";
    case "ATRASADO":
    case "NAO_CONFIGURADO": return "warn";
    case "PENDENTE": return "info";
    default: return "neutral";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "SAUDAVEL": return "SAUDÁVEL";
    case "ATRASADO": return "ATRASADO";
    case "FALHA": return "FALHA";
    case "PENDENTE": return "PENDENTE";
    case "NAO_INTEGRADO": return "NÃO INTEGRADO";
    case "NAO_CONFIGURADO": return "NÃO CONFIGURADO";
    default: return status;
  }
}

function getNatureLabel(nature: string) {
  switch (nature) {
    case "REAL_PUBLICA": return "Fonte Pública Real";
    case "REAL_RESTRITA_NAO_INTEGRADA": return "Sistema Restrito Real";
    case "LOCAL_DERIVADA": return "Visão Local/Derivada";
    case "MANUAL_VALIDADA": return "Entrada Manual Validada";
    case "SINTETICA_DEMONSTRATIVA": return "Sintética Demonstrativa";
    default: return "Desconhecida a Mapear";
  }
}

function getAuthorityLabel(authority: string) {
  switch (authority) {
    case "OFICIAL": return "Autoridade Primária/Oficial";
    case "AUXILIAR": return "Autoridade Auxiliar";
    case "DERIVADA": return "Autoridade Derivada/Secundária";
    case "SINTETICA": return "Sem Autoridade (Simulador)";
    default: return "A Confirmar";
  }
}

function getMaturityLabel(maturity: string) {
  switch (maturity) {
    case "INTEGRADO_REAL": return "Integrado (Real)";
    case "INTEGRADO_PARCIAL": return "Integrado Parcial";
    case "PLANEJADO": return "Mapeado / Planejado";
    case "MAPEADO_NAO_INTEGRADO": return "Mapeado / Não Integrado";
    case "DEMONSTRATIVO": return "Demonstrativo (Piloto)";
    default: return "Desconhecido / Lacuna";
  }
}

function getMethodLabel(method: string) {
  switch (method) {
    case "API": return "Integração via API";
    case "EVENTO": return "Barramento de Eventos";
    case "ETL": return "ETL Periódico";
    case "CSV": return "Carga de CSV";
    case "JSON": return "Carga de JSON";
    case "XML": return "Importação XML";
    case "PLANILHA": return "Planilha Local";
    case "REFERENCIA_DOCUMENTAL": return "Referência Documental";
    case "ENTRADA_HUMANA_VALIDADA": return "Entrada Humana";
    default: return "Sem Integração";
  }
}

export default function ConnectorsPage() {
  const state = getDemoState();
  const diagnosis = getDiagnosticData(state);
  const { environment, systems } = diagnosis;

  const icon = {
    SAUDAVEL: CheckCircle2,
    ATRASADO: Clock3,
    FALHA: AlertCircle,
    SINCRONIZANDO: Activity,
    DESABILITADO: Clock3,
    PENDENTE: Clock3,
    NAO_INTEGRADO: AlertCircle,
    NAO_CONFIGURADO: AlertCircle,
    DESCONHECIDO: HelpCircle,
  };

  return (
    <AppShell>
      <PageHeader
        title="Catálogo de Sistemas de Origem e Diagnóstico"
        description="Monitoramento federado das fontes de dados da cadeia logística do MCL. Mapeamento analítico de integridade, autoridade e maturidade."
        action={
          <div className="flex items-center gap-3">
            <Badge tone={environment.database === "persistent" ? "good" : "warn"}>
              {environment.database === "persistent" ? "Banco PostgreSQL Ativo" : "Modo Memória Fallback"}
            </Badge>
          </div>
        }
      />

      {/* Persistent Demonstration Banner */}
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-4 rounded-xl mb-6 flex items-start gap-3 shadow-md">
        <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-sm font-bold block mb-0.5">AMBIENTE DEMONSTRATIVO DO PILOTO</strong>
          <span className="text-xs text-rose-300">
            Esta interface destina-se a fins de simulação e homologação de escopo. Não constitui sistema oficial de governo. 
            <strong> Não insira dados reais, informações classificadas ou credenciais de produção sob hipótese alguma.</strong>
          </span>
        </div>
      </div>

      {environment.database === "memory" && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3 shadow-md">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-sm font-bold block mb-0.5">Aviso de Persistência</strong>
            <span className="text-xs text-amber-300">
              A aplicação está operando em modo de fallback em memória. Quaisquer alterações em atas, confirmações ou status dos simuladores serão redefinidos se a aplicação for reiniciada.
            </span>
          </div>
        </div>
      )}

      {/* Systems Catalogs grouped by Domain */}
      <div className="space-y-10">
        {DOMAIN_ORDER.map((domain) => {
          const domainSystems = systems.filter((sys) => sys.domain === domain);

          return (
            <section key={domain} className="border-b border-zinc-200 dark:border-zinc-800 pb-8 last:border-b-0 last:pb-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-zinc-400" />
                Dimensão: {domain}
              </h2>

              {domainSystems.length === 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 border-dashed p-6 rounded-xl text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum sistema de origem ou conector mapeado para esta dimensão da cadeia logística.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {domainSystems.map((system) => {
                    const Icon = icon[system.status as keyof typeof icon] || HelpCircle;
                    const borderTone = 
                      system.status === "SAUDAVEL" 
                        ? "border-l-4 border-l-emerald-600 bg-zinc-50/50 dark:bg-zinc-900/20" 
                        : system.status === "FALHA" 
                          ? "border-l-4 border-l-rose-600 bg-zinc-50/50 dark:bg-zinc-900/20" 
                          : system.status === "NAO_INTEGRADO"
                            ? "border-l-4 border-l-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/10 opacity-75"
                            : "border-l-4 border-l-amber-500 bg-zinc-50/50 dark:bg-zinc-900/20";

                    return (
                      <Card key={system.id} className={`${borderTone} flex flex-col justify-between hover:shadow-md transition-shadow duration-300`}>
                        <div>
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{system.name}</h3>
                                <Badge tone={getStatusBadgeTone(system.status)}>
                                  {getStatusLabel(system.status)}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1">
                                Natureza: <strong className="text-zinc-700 dark:text-zinc-400">{getNatureLabel(system.nature)}</strong>
                              </p>
                            </div>

                            {system.id === "compras-gov" ? (
                              <div className="shrink-0">
                                <ComprasGovSyncButton />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold py-1.5 px-3 bg-zinc-100/50 dark:bg-zinc-800/40 rounded-md border border-zinc-200 dark:border-zinc-800 shrink-0">
                                <Icon className={`h-4 w-4 ${
                                  system.status === "SAUDAVEL" ? "text-emerald-600" : 
                                  system.status === "FALHA" ? "text-rose-600" : 
                                  system.status === "NAO_INTEGRADO" ? "text-zinc-500" : 
                                  "text-amber-500"
                                }`} />
                                <span className="text-[11px]">{getMaturityLabel(system.maturity)}</span>
                              </div>
                            )}
                          </div>

                          {/* Observations / Messages */}
                          {system.observation && (
                            <div className="mt-3 bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg p-2.5 flex items-start gap-2">
                              <Info className="h-4 w-5 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="text-xs text-zinc-700 dark:text-zinc-300 italic">
                                <strong>Observação:</strong> {system.observation}
                              </span>
                            </div>
                          )}

                          {system.lastMessage && (
                            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850">
                              <strong>Diagnóstico:</strong> {system.lastMessage}
                            </p>
                          )}

                          {/* Limitations List */}
                          {system.limitations.length > 0 && (
                            <div className="mt-4">
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Limitações / Restrições do Sistema:</span>
                              <ul className="list-disc list-inside text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-1">
                                {system.limitations.map((limit, idx) => (
                                  <li key={idx} className="leading-relaxed">{limit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Telemetry/Metadata Grid */}
                        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                          <dl className="grid gap-2 grid-cols-2 text-[11px]">
                            <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                              <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Autoridade de dados</dt>
                              <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{getAuthorityLabel(system.authority)}</dd>
                            </div>
                            <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                              <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Método de Integração</dt>
                              <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{getMethodLabel(system.integrationMethod)}</dd>
                            </div>

                            {/* Telemetry Details for Compras.gov */}
                            {system.telemetry ? (
                              <>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2 col-span-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Último Endpoint Sincronizado</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[10px] truncate" title={system.telemetry.endpoint ?? ""}>{system.telemetry.endpoint ?? "Nao configurado"}</dd>
                                </div>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Registros Lidos</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{system.telemetry.recordsRead ?? 0}</dd>
                                </div>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Registros Importados</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{system.telemetry.acceptedRecords ?? 0}</dd>
                                </div>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Atualizados / Duplicados</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{system.telemetry.updatedRecords ?? 0} / {system.telemetry.duplicateRecords ?? 0}</dd>
                                </div>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Rejeitados / Duração</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{system.telemetry.rejectedRecords ?? 0} / {system.telemetry.durationMs ?? 0}ms</dd>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Maturidade do Fluxo</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">{getMaturityLabel(system.maturity)}</dd>
                                </div>
                                <div className="rounded bg-zinc-100/50 dark:bg-zinc-800/20 p-2">
                                  <dt className="text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">Última sincronização</dt>
                                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {system.lastRunAt ? formatDateTime(system.lastRunAt) : "Nunca executado"}
                                  </dd>
                                </div>
                              </>
                            )}
                          </dl>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Card className="mt-10">
        <div className="flex items-center gap-2">
          <Globe aria-hidden className="h-5 w-5 text-emerald-700 shrink-0" />
          <p className="text-xs text-zinc-650 dark:text-zinc-400">
            <strong>Arquitetura Federada do MCL:</strong> Os dados exibidos nesta plataforma são integrados dinamicamente sob demanda ou via carga local de contigência de acordo com as autorizações e restrições de rede das fontes oficiais.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
