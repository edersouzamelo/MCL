import Link from "next/link";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Clock3, Database, Globe, HelpCircle, Info, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ComprasGovSyncButton } from "@/components/ComprasGovSyncButton";
import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData, type SourceSystemDomain, type SourceSystemCatalogEntry } from "@/modules/connectors/catalog";

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

interface DomainContext {
  title: string;
  description: string;
  domainName: SourceSystemDomain;
}

const DOMAIN_CONTEXTS: { [key: string]: DomainContext } = {
  necessidades: {
    title: "Necessidades logísticas",
    description: "Mapeamento de demandas, e-PRDU, PGC/PCA, SIGELOG/PDRLog e simulação de deficits operacionais.",
    domainName: "Necessidades",
  },
  orcamento: {
    title: "Crédito e Execução Financeira",
    description: "SIAFI, SAG, controles orçamentários, saldos de créditos e relatórios locais consolidando limites de empenho.",
    domainName: "Orçamento e finanças",
  },
  aquisicoes: {
    title: "Aquisições e Instrumentos",
    description: "Pesquisa de atas de registro de preços, homologações CATMAT/ARP, Compras.gov e publicações no PNCP.",
    domainName: "Aquisições",
  },
  recebimento: {
    title: "Recebimento Físico e Documental",
    description: "Piloto de passaporte logístico, validação física com Scanner QR nativo e importação de notas fiscais XML.",
    domainName: "Recebimento",
  },
  armazenagem: {
    title: "Armazenagem e Endereçamento",
    description: "Controle de estoques físicos, depósitos, auditoria material no piloto e integrações mapeadas com o SISCOFIS-WEB.",
    domainName: "Estoque / armazém",
  },
  transporte: {
    title: "Transporte e Distribuição",
    description: "Roteirização, expedição de remessas e rastreamento de entregas, conciliando simuladores locais e lacunas a mapear.",
    domainName: "Transporte / distribuição",
  },
};

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

function getSourceKindLabel(kind: string) {
  switch (kind) {
    case "EXTERNAL_SYSTEM": return "Sistema Externo Oficial";
    case "PUBLIC_SOURCE": return "Fonte Pública Real";
    case "DOCUMENT_SOURCE": return "Fonte Documental";
    case "LOCAL_DERIVED_SOURCE": return "Visão Local / Derivada";
    case "MCL_NATIVE_CAPABILITY": return "Capacidade Nativa MCL";
    case "DEMO_SIMULATOR": return "Simulador Demonstrativo";
    case "GAP_TO_MAP": return "Lacuna a Mapear";
    default: return "Desconhecido";
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

function getDomainSummary(domainSystems: SourceSystemCatalogEntry[]) {
  if (domainSystems.length === 0) {
    return { label: "Lacuna", color: "text-zinc-500 border-zinc-700/50 bg-zinc-900/50" };
  }

  const relevantSystems = domainSystems.filter(sys => sys.sourceKind !== "DEMO_SIMULATOR");
  const hasFailure = relevantSystems.some(sys => sys.status === "FALHA");
  if (hasFailure) {
    return { label: "Falha", color: "text-rose-450 border-rose-500/40 bg-rose-500/10" };
  }

  const hasConnectedReal = relevantSystems.some(sys => 
    sys.status === "SAUDAVEL" && 
    sys.maturity === "INTEGRADO_REAL" && 
    (sys.sourceKind === "EXTERNAL_SYSTEM" || sys.sourceKind === "PUBLIC_SOURCE")
  );
  if (hasConnectedReal) {
    return { label: "Conectado", color: "text-emerald-450 border-emerald-500/40 bg-emerald-500/10" };
  }

  const hasPartialOrNative = domainSystems.some(sys => 
    sys.status === "SAUDAVEL" && 
    (sys.maturity === "INTEGRADO_PARCIAL" || sys.sourceKind === "MCL_NATIVE_CAPABILITY") &&
    sys.id !== "mcl-qr-recebimento" &&
    sys.id !== "mcl-storage-pilot" &&
    sys.id !== "mcl-delivery-pilot"
  );
  if (hasPartialOrNative) {
    return { label: "Parcial", color: "text-amber-405 border-amber-500/30 bg-amber-500/10" };
  }

  const hasNativeFunctional = domainSystems.some(sys => 
    sys.status === "SAUDAVEL" && 
    (sys.sourceKind === "MCL_NATIVE_CAPABILITY" || sys.sourceKind === "DEMO_SIMULATOR")
  );

  const hasMappedNotIntegrated = domainSystems.some(sys => 
    sys.status === "NAO_INTEGRADO" || 
    sys.status === "PENDENTE" || 
    sys.status === "NAO_CONFIGURADO" || 
    sys.status === "ATRASADO" ||
    sys.maturity === "PLANEJADO" ||
    sys.maturity === "MAPEADO_NAO_INTEGRADO"
  );

  const hasGapToMap = domainSystems.some(sys => sys.sourceKind === "GAP_TO_MAP");

  if (hasNativeFunctional && hasMappedNotIntegrated) {
    if (domainSystems.some(sys => sys.domain === "Aquisições" && sys.id === "compras-gov" && sys.status === "SAUDAVEL")) {
      return { label: "Parcial", color: "text-amber-405 border-amber-500/30 bg-amber-500/10" };
    }
    return { label: "Demo/Pendente", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" };
  }

  if (hasNativeFunctional) {
    return { label: "Demo", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" };
  }

  if (hasMappedNotIntegrated && hasGapToMap) {
    return { label: "Lacuna/Pendente", color: "text-zinc-450 border-zinc-700/50 bg-zinc-900/50" };
  }

  if (hasMappedNotIntegrated) {
    return { label: "Pendente", color: "text-zinc-400 border-zinc-800 bg-zinc-900/30" };
  }

  const allGaps = domainSystems.every(sys => sys.sourceKind === "GAP_TO_MAP" || sys.maturity === "DESCONHECIDO");
  if (allGaps) {
    return { label: "Lacuna", color: "text-zinc-450 border-zinc-700/50 bg-zinc-900/50" };
  }

  return { label: "Pendente", color: "text-zinc-400 border-zinc-800 bg-zinc-900/30" };
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConnectorsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const rawDominio = typeof resolvedParams?.dominio === "string" ? resolvedParams.dominio : undefined;
  const domainCtx = rawDominio ? DOMAIN_CONTEXTS[rawDominio] : undefined;
  const filterDomain = domainCtx?.domainName;

  const state = getDemoState();
  const diagnosis = getDiagnosticData(state);
  const { environment, systems } = diagnosis;

  const domainsToRender = filterDomain ? [filterDomain] : DOMAIN_ORDER;

  // Active domain stats calculation
  const domainSystems = filterDomain ? systems.filter(sys => sys.domain === filterDomain) : [];
  const totalSources = domainSystems.length;
  const statusSummary = getDomainSummary(domainSystems);

  const countKind = (kind: string) => domainSystems.filter(sys => sys.sourceKind === kind).length;

  const countNative = countKind("MCL_NATIVE_CAPABILITY");
  const countSimulator = countKind("DEMO_SIMULATOR");
  const countGap = countKind("GAP_TO_MAP");
  const countFailed = domainSystems.filter(sys => sys.status === "FALHA" && sys.sourceKind !== "DEMO_SIMULATOR").length;

  const runTimes = domainSystems.map(s => s.lastRunAt).filter(Boolean) as string[];
  const lastRunStr = runTimes.length > 0 ? formatDateTime(runTimes.sort().reverse()[0]) : undefined;

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

      {/* Domain Context Header */}
      {domainCtx && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8 shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-250 dark:border-zinc-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Database className="h-6 w-6 text-indigo-500 shrink-0" />
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{domainCtx.title}</h1>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">{domainCtx.description}</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wide ${statusSummary.color}`}>
                STATUS DO DOMÍNIO: {statusSummary.label.toUpperCase()}
              </span>
              <Link 
                href="/conectores" 
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 bg-zinc-200/50 dark:bg-zinc-850 py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-750 transition-colors"
              >
                Limpar Filtro
              </Link>
            </div>
          </div>

          {/* Grid of details/contadores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-4">
            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Fontes Mapeadas</span>
              <span className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{totalSources}</span>
            </div>
            
            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Capacidades Nativas</span>
              <span className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{countNative}</span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Simuladores</span>
              <span className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{countSimulator}</span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Lacunas</span>
              <span className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{countGap}</span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Fontes com Falha</span>
              <span className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                <span className={countFailed > 0 ? "text-rose-600 dark:text-rose-500" : "text-zinc-800 dark:text-zinc-200"}>{countFailed}</span>
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 col-span-2 sm:col-span-1">
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block uppercase tracking-wider">Última Execução Disponível</span>
              <span className="text-[10px] font-semibold text-zinc-850 dark:text-zinc-300 mt-1 block truncate" title={lastRunStr ?? "N/A"}>
                {lastRunStr ?? "Não disponível"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Systems Catalogs grouped by Domain */}
      <div className="space-y-10">
        {domainsToRender.map((domain) => {
          const domainSystems = systems.filter((sys) => sys.domain === domain);

          return (
            <section key={domain} className="border-b border-zinc-200 dark:border-zinc-800 pb-8 last:border-b-0 last:pb-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-zinc-400" />
                Dimensão: {domain}
              </h2>

              {domainSystems.length === 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 border-dashed p-8 rounded-xl text-center max-w-lg mx-auto">
                  <Database className="h-8 w-8 text-zinc-450 mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma fonte de dados mapeada</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    O MCL conhece esta lacuna, mas ainda não recebeu fonte autorizada para esta dimensão da cadeia logística.
                  </p>
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
                                Tipo: <strong className="text-zinc-700 dark:text-zinc-400">{getSourceKindLabel(system.sourceKind)}</strong>
                                <span className="mx-1.5">•</span>
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
