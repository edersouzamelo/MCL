import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, Badge, formatDateTime } from "@/components/ui";
import { getRouteActor } from "@/modules/auth/route-actor";
import { searchOfficialCatalog } from "@/modules/coverage/official-catalog";
import { getDemoState } from "@/server/demo-store";
import { persistenceMode } from "@/modules/coverage/service";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { prisma } from "@/server/db";
import { randomUUID } from "node:crypto";
import {
  Search,
  ExternalLink,
  Info,
  AlertTriangle,
  ArrowLeft,
  Layers,
  HelpCircle,
  Check
} from "lucide-react";
import type { OfficialCatalogItem } from "@/modules/coverage/official-catalog";

type NeedDetails = {
  need: {
    id: string;
    persistentCode: string;
    quantityRequested: number;
    quantityApproved: number;
    status: string;
    priority: string;
  };
  item: {
    name: string;
    description: string;
  } | null;
  variant: {
    label: string;
    size: string;
    unit: string;
  } | null;
  orgName: string;
};

export const dynamic = "force-dynamic";

// Next.js Server Action to save candidate and redirect back to the need
async function selectItemAction(formData: FormData) {
  "use server";

  const needId = formData.get("needId") as string;
  const externalCode = formData.get("externalCode") as string;
  const description = formData.get("description") as string;
  const catalogType = formData.get("catalogType") as string;
  const sourceUrl = formData.get("sourceUrl") as string;
  const fetchedAt = formData.get("fetchedAt") as string;
  const sourceUpdatedAt = formData.get("sourceUpdatedAt") as string;
  const payloadHash = formData.get("payloadHash") as string;
  const sourceSystem = formData.get("sourceSystem") as string;
  const payloadJson = formData.get("payloadJson") as string;

  const actor = await getRouteActor();
  if (!actor) {
    throw new Error("Autenticação obrigatória.");
  }

  const payload = payloadJson ? JSON.parse(payloadJson) : {};
  const isPostgres = persistenceMode() === "postgresql";
  const candidateId = `candidate-cat-${externalCode}-${needId}`;
  const queryId = `query-cat-${randomUUID().slice(0, 8)}`;

  const queryRecord = {
    id: queryId,
    needId: needId,
    kind: "CATMAT_SEARCH" as const,
    endpoint: sourceUrl || "official_catalog_facade",
    params: { code: externalCode, source: "official_catalog_facade" },
    status: "SUCCESS" as const,
    recordsRead: 1,
    sourceUrl: sourceUrl,
    actorId: actor.id,
    externalCatalog: catalogType,
    externalItemCode: externalCode,
    startedAt: new Date(),
    finishedAt: new Date(),
    staleAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const candidateRecord = {
    id: candidateId,
    queryId: queryId,
    needId: needId,
    externalCatalog: catalogType,
    externalItemCode: externalCode,
    externalDescription: description,
    groupCode: payload?.codigoGrupo ? String(payload.codigoGrupo) : undefined,
    classCode: payload?.codigoClasse ? String(payload.codigoClasse) : undefined,
    pdmCode: payload?.codigoPdm ? String(payload.codigoPdm) : undefined,
    statusItem: payload?.statusItem ?? true,
    sourceSystem: sourceSystem || "COMPRAS_GOV",
    sourceUrl: sourceUrl || "",
    sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : null,
    fetchedAt: new Date(fetchedAt),
    similarityScore: 1.0,
    similarityExplanation: "Selecionado manualmente via Catálogo Oficial.",
    payload: payload,
  };

  if (isPostgres) {
    await prisma.coverageQuery.create({
      data: queryRecord,
    });

    await prisma.catalogSearchCandidate.upsert({
      where: { id: candidateId },
      create: candidateRecord,
      update: {
        queryId: candidateRecord.queryId,
        externalDescription: candidateRecord.externalDescription,
        groupCode: candidateRecord.groupCode,
        classCode: candidateRecord.classCode,
        pdmCode: candidateRecord.pdmCode,
        statusItem: candidateRecord.statusItem,
        sourceUrl: candidateRecord.sourceUrl,
        sourceUpdatedAt: candidateRecord.sourceUpdatedAt,
        fetchedAt: candidateRecord.fetchedAt,
        payload: candidateRecord.payload,
      },
    });
  } else {
    const state = getDemoState();
    state.coverageQueries.unshift({
      ...queryRecord,
      startedAt: queryRecord.startedAt.toISOString(),
      finishedAt: queryRecord.finishedAt.toISOString(),
      staleAt: queryRecord.staleAt.toISOString(),
    } as any);

    const existingIndex = state.catalogSearchCandidates.findIndex((c) => c.id === candidateId);
    const mappedCandidate = {
      ...candidateRecord,
      sourceUpdatedAt: candidateRecord.sourceUpdatedAt?.toISOString() ?? undefined,
      fetchedAt: candidateRecord.fetchedAt.toISOString(),
    } as any;

    if (existingIndex !== -1) {
      state.catalogSearchCandidates[existingIndex] = mappedCandidate;
    } else {
      state.catalogSearchCandidates.unshift(mappedCandidate);
    }
  }

  redirect(`/necessidades/${needId}/buscar-cobertura?candidateId=${candidateId}`);
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ needId?: string; q?: string; type?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const needId = params.needId;
  const q = params.q || "";
  const catalogType = (params.type || "CATMAT") as "CATMAT" | "CATSER" | "AMBOS";
  const auditMode = params.mode === "audit";

  let needDetails: NeedDetails | null = null;

  // Fetch Need details on the server if needId is provided
  if (needId) {
    const isPostgres = persistenceMode() === "postgresql";
    if (isPostgres) {
      try {
        const dbNeed = await prisma.need.findUnique({ where: { id: needId } });
        if (dbNeed) {
          const variant = await prisma.itemVariant.findUnique({
            where: { id: dbNeed.itemVariantId },
            include: { item: true }
          });
          const org = await prisma.organization.findUnique({ where: { id: dbNeed.organizationId } });
          needDetails = {
            need: {
              id: dbNeed.id,
              persistentCode: dbNeed.persistentCode,
              quantityRequested: dbNeed.quantityRequested,
              quantityApproved: dbNeed.quantityApproved,
              status: dbNeed.status,
              priority: dbNeed.priority,
            },
            item: variant?.item ? { name: variant.item.name, description: variant.item.description } : null,
            variant: variant ? { label: variant.label, size: variant.size, unit: variant.unit } : null,
            orgName: org?.name ?? dbNeed.organizationId,
          };
        }
      } catch (err) {
        console.error("Erro ao consultar banco no catálogo:", err);
      }
    } else {
      const state = getDemoState();
      const demoNeed = state.needs.find((c) => c.id === needId);
      if (demoNeed) {
        const { item, variant } = itemForVariant(state, demoNeed.itemVariantId);
        const orgName = organizationName(state, demoNeed.organizationId);
        needDetails = {
          need: {
            id: demoNeed.id,
            persistentCode: demoNeed.persistentCode,
            quantityRequested: demoNeed.quantityRequested,
            quantityApproved: demoNeed.quantityApproved,
            status: demoNeed.status,
            priority: demoNeed.priority,
          },
          item: item ? { name: item.name, description: item.description } : null,
          variant: variant ? { label: variant.label, size: variant.size, unit: variant.unit } : null,
          orgName,
        };
      }
    }
  }

  // Prepopulate query if not set and needDetails is available
  let finalQuery = q;
  if (needDetails && !q && !params.hasOwnProperty("q")) {
    finalQuery = needDetails.item?.name || "";
  }

  // Perform search on the server
  let results: OfficialCatalogItem[] = [];
  let searchError: string | null = null;
  if (finalQuery.trim()) {
    try {
      results = await searchOfficialCatalog(finalQuery.trim(), catalogType);
    } catch (err: any) {
      searchError = err.message || "Erro desconhecido ao pesquisar catálogo.";
    }
  }

  const simpleModeUrl = `/catalogo?needId=${needId || ""}&q=${encodeURIComponent(finalQuery)}&type=${catalogType}&mode=simple`;
  const auditModeUrl = `/catalogo?needId=${needId || ""}&q=${encodeURIComponent(finalQuery)}&type=${catalogType}&mode=audit`;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation back link */}
        <div className="flex items-center justify-between">
          {needId ? (
            <Link
              href={`/necessidades/${needId}/buscar-cobertura`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-500 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Cobertura da Necessidade
            </Link>
          ) : (
            <Link
              href="/necessidades"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-500 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para Lista de Necessidades
            </Link>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Link
              href={simpleModeUrl}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                !auditMode
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/30"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
              }`}
            >
              Modo Simples
            </Link>
            <Link
              href={auditModeUrl}
              className={`px-3 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 ${
                auditMode
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/30"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
              }`}
            >
              <Layers className="h-3 w-3" />
              Auditoria / Detalhes
            </Link>
          </div>
        </div>

        {/* Need Context Header Card */}
        {needId && needDetails && (
          <Card className="border-l-4 border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-500">
                    Vincular Necessidade Logística
                  </span>
                  <Badge tone="info">{needDetails.need.status}</Badge>
                </div>
                <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {needDetails.need.persistentCode} — {needDetails.item?.name}
                </h3>
                <p className="text-sm text-zinc-650 dark:text-zinc-400 mt-0.5">
                  {needDetails.variant?.label} ({needDetails.variant?.size}) • Organização: {needDetails.orgName}
                </p>
              </div>
              <div className="text-right sm:text-left shrink-0">
                <span className="text-xs text-zinc-550 dark:text-zinc-400 block">Qtd. Solicitada</span>
                <span className="text-2xl font-black text-zinc-950 dark:text-zinc-100">
                  {needDetails.need.quantityRequested} {needDetails.variant?.unit}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Search Panel */}
        <Card>
          <div className="space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Catálogo Oficial
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Busque materiais e serviços para vincular a uma necessidade logística.
              </p>
            </div>

            <form method="GET" action="/catalogo" className="space-y-4">
              {needId && <input type="hidden" name="needId" value={needId} />}
              {auditMode && <input type="hidden" name="mode" value="audit" />}

              <div className="flex flex-col gap-3">
                <label htmlFor="catalog-query" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Digite o material ou serviço a ser pesquisado
                </label>
                <div className="relative">
                  <input
                    id="catalog-query"
                    name="q"
                    type="text"
                    defaultValue={finalQuery}
                    placeholder="Ex: bota de segurança, copo descartável ou digite o código de 6 dígitos"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                {/* Type Selectors */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Catálogo:</span>
                  <div className="flex items-center gap-2">
                    {(["CATMAT", "CATSER", "AMBOS"] as const).map((type) => (
                      <label
                        key={type}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                          catalogType === type
                            ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                            : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          defaultChecked={catalogType === type}
                          className="sr-only"
                          onChange={undefined} // Controlled on form submit natively
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                {/* External Link and Search Button */}
                <div className="flex items-center gap-4 justify-end">
                  <a
                    href="https://catalogo.compras.gov.br"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350 underline"
                  >
                    Abrir catálogo oficial em nova aba
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-800"
                  >
                    Buscar no Catálogo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Card>

        {/* Results List */}
        <div className="space-y-4">
          {searchError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm text-rose-900 dark:text-rose-450 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Erro na Consulta Oficial</span>
              </div>
              <p className="pl-6 text-xs">{searchError}</p>
            </div>
          )}

          {finalQuery.trim() && results.length === 0 && !searchError && (
            <Card className="text-center p-8">
              <HelpCircle className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-700">Nenhum resultado retornado.</p>
              <p className="text-xs text-zinc-550 mt-1 max-w-md mx-auto">
                Tente redefinir seus termos de pesquisa ou confira o código diretamente no portal Compras.gov.br.
              </p>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Resultados Localizados ({results.length})
                </span>
                {auditMode && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-500 font-medium italic">
                    * Exibindo dados brutos da API oficial
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {results.map((item) => {
                  const isUnsupported = item.status === "UNSUPPORTED";
                  const isFailed = item.status === "LIVE_FAILED";

                  return (
                    <Card
                      key={`${item.catalogType}-${item.externalCode}`}
                      className={isUnsupported ? "opacity-75 border-zinc-200" : ""}
                    >
                      {!auditMode ? (
                        /* SIMPLE MODE */
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-900 dark:text-zinc-100">
                                Código: {item.externalCode}
                              </span>
                              <Badge tone={item.catalogType === "CATSER" ? "info" : "good"}>
                                {item.catalogType}
                              </Badge>
                              {isUnsupported && (
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
                                  Previsão Arquitetural
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                              {item.description}
                            </p>
                            <div className="text-xs text-zinc-550 dark:text-zinc-400">
                              Origem: <span className="font-semibold">{item.sourceSystem}</span>
                            </div>
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            {isUnsupported ? (
                              <span className="text-xs font-semibold text-zinc-550 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg block">
                                Não Ativado
                              </span>
                            ) : isFailed ? (
                              <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-lg block">
                                Erro de Conexão
                              </span>
                            ) : needId ? (
                              <form action={selectItemAction}>
                                <input type="hidden" name="needId" value={needId} />
                                <input type="hidden" name="externalCode" value={item.externalCode} />
                                <input type="hidden" name="description" value={item.description} />
                                <input type="hidden" name="catalogType" value={item.catalogType} />
                                <input type="hidden" name="sourceUrl" value={item.sourceUrl} />
                                <input type="hidden" name="fetchedAt" value={item.fetchedAt} />
                                <input type="hidden" name="sourceUpdatedAt" value={item.sourceUpdatedAt || ""} />
                                <input type="hidden" name="payloadHash" value={item.payloadHash} />
                                <input type="hidden" name="sourceSystem" value={item.sourceSystem} />
                                <input type="hidden" name="payloadJson" value={JSON.stringify(item.payload)} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-800"
                                >
                                  Selecionar Item
                                </button>
                              </form>
                            ) : (
                              <span className="text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded block">
                                Sem necessidade
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* AUDIT / DETAILS MODE */
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-900 dark:text-zinc-100">
                                  {item.externalCode}
                                </span>
                                <Badge tone={item.catalogType === "CATSER" ? "info" : "good"}>
                                  {item.catalogType}
                                </Badge>
                                <Badge tone={isUnsupported ? "warn" : isFailed ? "bad" : "good"}>
                                  STATUS: {item.status}
                                </Badge>
                              </div>
                              <h4 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-relaxed">
                                {item.description}
                              </h4>
                            </div>

                            <div className="shrink-0">
                              {needId && !isUnsupported && !isFailed && (
                                <form action={selectItemAction}>
                                  <input type="hidden" name="needId" value={needId} />
                                  <input type="hidden" name="externalCode" value={item.externalCode} />
                                  <input type="hidden" name="description" value={item.description} />
                                  <input type="hidden" name="catalogType" value={item.catalogType} />
                                  <input type="hidden" name="sourceUrl" value={item.sourceUrl} />
                                  <input type="hidden" name="fetchedAt" value={item.fetchedAt} />
                                  <input type="hidden" name="sourceUpdatedAt" value={item.sourceUpdatedAt || ""} />
                                  <input type="hidden" name="payloadHash" value={item.payloadHash} />
                                  <input type="hidden" name="sourceSystem" value={item.sourceSystem} />
                                  <input type="hidden" name="payloadJson" value={JSON.stringify(item.payload)} />
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                  >
                                    Vincular Candidato
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>

                          {/* Audit Details */}
                          <div className="grid gap-4 sm:grid-cols-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/35 p-3.5 rounded border border-zinc-200/50 dark:border-zinc-800">
                            <div className="space-y-1.5">
                              <p>
                                <span className="font-bold text-zinc-850 dark:text-zinc-300">Endpoint:</span>{" "}
                                {item.catalogType === "CATMAT" ? "/modulo-material/4_consultarItemMaterial" : "Não confirmado"}
                              </p>
                              <p>
                                <span className="font-bold text-zinc-850 dark:text-zinc-300">Parâmetros:</span>{" "}
                                {JSON.stringify(
                                  /^\d+$/.test(finalQuery.trim())
                                    ? { codigoItem: Number(item.externalCode) }
                                    : { descricaoItem: finalQuery.trim() }
                                )}
                              </p>
                              <p className="break-all">
                                <span className="font-bold text-zinc-850 dark:text-zinc-300">URL Origem:</span>{" "}
                                <a
                                  href={item.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-800 dark:text-emerald-500 underline"
                                >
                                  {item.sourceUrl}
                                </a>
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <p>
                                <span className="font-bold text-zinc-850 dark:text-zinc-300">Consultado em:</span>{" "}
                                {formatDateTime(item.fetchedAt)}
                              </p>
                              <p className="break-all">
                                <span className="font-bold text-zinc-850 dark:text-zinc-300">Payload Hash:</span>{" "}
                                {item.payloadHash}
                              </p>
                              {item.error && (
                                <p className="text-rose-600 font-bold">
                                  Erro: {item.error}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Expandable JSON payload using native HTML details summary */}
                          <details className="group">
                            <summary className="cursor-pointer text-[11px] font-bold text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-300 select-none list-none inline-flex items-center gap-1">
                              <span className="transition-transform group-open:rotate-90">▶</span>
                              Exibir JSON bruto do payload (Auditável)
                            </summary>
                            <pre className="mt-2 bg-zinc-900 text-zinc-300 text-[10px] p-3 rounded overflow-x-auto border border-zinc-800 max-h-60 font-mono">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Guide banner */}
        {!finalQuery.trim() && (
          <Card className="bg-zinc-50/50 dark:bg-zinc-800/10 border-dashed border-2">
            <div className="flex items-start gap-3 p-2">
              <Info className="h-5 w-5 text-emerald-800 dark:text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-150">Como funciona o vínculo</h4>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                  Este catálogo consulta a API oficial de dados abertos governamentais. Ao buscar e selecionar um item, ele
                  será registrado temporariamente no MCL como um <strong>Candidato de Pesquisa</strong> associado à sua
                  necessidade. A homologação/correlação definitiva (objeto do mapeamento auditável) só é ativada quando um operador
                  humano confirmar a seleção e fornecer a justificativa na tela de cobertura.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
