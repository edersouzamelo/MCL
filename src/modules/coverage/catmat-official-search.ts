/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomUUID } from "node:crypto";
import { getComprasGovConfig } from "@/modules/connectors/compras-gov/config";
import { COMPRAS_GOV_CATMAT_ENDPOINT, COMPRAS_GOV_SOURCE_SYSTEM } from "@/modules/connectors/compras-gov/constants";
import { createComprasGovClient } from "@/modules/connectors/compras-gov/http";
import { comprasGovApiResponseSchema, comprasGovCatalogItemSchema, type ComprasGovCatalogItem } from "@/modules/connectors/compras-gov/schemas";
import { catmatSearchInputSchema, deterministicTextSimilarity, inferredCatalogFilters, needSearchText, persistenceMode, type CatmatSearchInput } from "@/modules/coverage/service";
import type { CatalogSearchCandidate, CoverageQuery, DemoState } from "@/modules/domain/types";
import { appendAuditLogToState } from "@/server/demo-store";
import { prisma } from "@/server/db";

type SearchOptions = {
  actorId: string;
  organizationId?: string;
  userAgent?: string;
  requestId?: string;
  fetchImpl?: typeof fetch;
};

function stableId(prefix: string, value: string) {
  return `${prefix}-${createHash("sha1").update(value).digest("hex").slice(0, 18)}`;
}

function maybeIsoDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function makeQuery(input: CatmatSearchInput, params: Record<string, unknown>, actorId: string): CoverageQuery {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    needId: input.needId,
    kind: "CATMAT_SEARCH",
    endpoint: COMPRAS_GOV_CATMAT_ENDPOINT,
    params,
    status: "NO_RESULTS",
    recordsRead: 0,
    actorId,
    externalCatalog: "CATMAT",
    startedAt: now,
    finishedAt: now,
    staleAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function stateForNeed(state: DemoState, input: CatmatSearchInput): Promise<DemoState> {
  if (persistenceMode() !== "postgresql") return state;
  const need = await prisma.need.findUnique({ where: { id: input.needId } });
  if (!need) throw new Error("Necessidade nao localizada.");
  const variant = await prisma.itemVariant.findUnique({ where: { id: need.itemVariantId } });
  const item = variant ? await prisma.supplyItem.findUnique({ where: { id: variant.itemId } }) : null;
  return { ...state, needs: [need as any], itemVariants: variant ? [variant as any] : [], supplyItems: item ? [item as any] : [] };
}

function candidateFromItem(item: ComprasGovCatalogItem, query: CoverageQuery, needId: string, sourceUrl: string, fetchedAt: string, queryText: string): CatalogSearchCandidate {
  const similarity = deterministicTextSimilarity(queryText, item.descricaoItem);
  return {
    id: stableId("catmat-candidate", `${query.id}:${item.codigoItem}`),
    queryId: query.id,
    needId,
    externalCatalog: "CATMAT",
    externalItemCode: String(item.codigoItem),
    externalDescription: item.descricaoItem,
    groupCode: item.codigoGrupo != null ? String(item.codigoGrupo) : undefined,
    classCode: item.codigoClasse != null ? String(item.codigoClasse) : undefined,
    pdmCode: item.codigoPdm != null ? String(item.codigoPdm) : undefined,
    statusItem: item.statusItem,
    sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
    sourceUrl,
    sourceUpdatedAt: maybeIsoDate(item.dataHoraAtualizacao ?? item.dataHoraInclusao),
    fetchedAt,
    similarityScore: similarity.score,
    similarityExplanation: similarity.explanation,
    payload: item as unknown as Record<string, unknown>,
  };
}

async function saveQuery(query: CoverageQuery) {
  await prisma.coverageQuery.upsert({
    where: { id: query.id },
    create: {
      id: query.id,
      needId: query.needId,
      kind: query.kind,
      endpoint: query.endpoint,
      params: query.params as any,
      status: query.status,
      recordsRead: query.recordsRead,
      sourceUrl: query.sourceUrl,
      errorMessage: query.errorMessage,
      actorId: query.actorId,
      externalCatalog: query.externalCatalog,
      externalItemCode: query.externalItemCode,
      startedAt: new Date(query.startedAt),
      finishedAt: new Date(query.finishedAt),
      staleAt: query.staleAt ? new Date(query.staleAt) : null,
    },
    update: {
      status: query.status,
      recordsRead: query.recordsRead,
      sourceUrl: query.sourceUrl,
      errorMessage: query.errorMessage,
      finishedAt: new Date(query.finishedAt),
    },
  });
}

async function saveCandidates(candidates: CatalogSearchCandidate[]) {
  for (const c of candidates) {
    await prisma.catalogSearchCandidate.upsert({
      where: { id: c.id },
      create: { ...c, sourceUpdatedAt: c.sourceUpdatedAt ? new Date(c.sourceUpdatedAt) as any : null, fetchedAt: new Date(c.fetchedAt) as any, payload: c.payload as any },
      update: { ...c, sourceUpdatedAt: c.sourceUpdatedAt ? new Date(c.sourceUpdatedAt) as any : null, fetchedAt: new Date(c.fetchedAt) as any, payload: c.payload as any },
    });
  }
}

export async function searchOfficialCatmatCandidates(state: DemoState, rawInput: CatmatSearchInput, options: SearchOptions) {
  const input = catmatSearchInputSchema.parse(rawInput);
  const localState = await stateForNeed(state, input);
  const params = { pagina: 1, ...inferredCatalogFilters(localState, input) };
  const queryText = needSearchText(localState, input.needId, input.terms);
  const query = makeQuery(input, params, options.actorId);

  try {
    const client = createComprasGovClient(getComprasGovConfig(), options.fetchImpl);
    const { data, url } = await client.getJson(COMPRAS_GOV_CATMAT_ENDPOINT, params, comprasGovApiResponseSchema);
    const fetchedAt = new Date().toISOString();
    const candidates = data.resultado
      .map((raw) => comprasGovCatalogItemSchema.safeParse(raw))
      .filter((parsed): parsed is { success: true; data: ComprasGovCatalogItem } => parsed.success)
      .map((parsed) => candidateFromItem(parsed.data, query, input.needId, url, fetchedAt, queryText))
      .filter((c) => c.similarityScore > 0 || Boolean(params.codigoItem || params.codigoClasse || params.codigoGrupo || params.codigoPdm))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 12);

    query.recordsRead = data.resultado.length;
    query.status = candidates.length ? "SUCCESS" : "NO_RESULTS";
    query.sourceUrl = url;
    query.finishedAt = fetchedAt;

    if (persistenceMode() === "postgresql") {
      await saveCandidates(candidates);
      await saveQuery(query);
      await prisma.auditLog.create({
        data: {
          id: randomUUID(),
          occurredAt: new Date(),
          actorId: options.actorId,
          action: "CATMAT_PESQUISA_EXECUTADA",
          resourceType: "NEED",
          resourceId: input.needId,
          organizationId: options.organizationId,
          requestId: options.requestId ?? randomUUID(),
          userAgent: options.userAgent ?? "mcl-web",
          outcome: "SUCESSO",
          reason: candidates.length ? "Candidatos CATMAT oficiais retornados para revisao humana." : "Nenhum candidato CATMAT oficial localizado.",
          metadata: { queryId: query.id, params: query.params, candidates: candidates.length, totalRegistros: data.totalRegistros, endpoint: COMPRAS_GOV_CATMAT_ENDPOINT } as any,
        },
      });
    } else {
      candidates.forEach((candidate) => state.catalogSearchCandidates.unshift(candidate));
      state.coverageQueries.unshift(query);
      appendAuditLogToState(state, {
        actorId: options.actorId,
        action: "CATMAT_PESQUISA_EXECUTADA",
        resourceType: "NEED",
        resourceId: input.needId,
        organizationId: options.organizationId,
        requestId: options.requestId,
        userAgent: options.userAgent,
        outcome: "SUCESSO",
        reason: candidates.length ? "Candidatos CATMAT oficiais retornados para revisao humana." : "Nenhum candidato CATMAT oficial localizado.",
        metadata: { queryId: query.id, params: query.params, candidates: candidates.length },
      });
    }

    return { query, candidates };
  } catch (error) {
    query.status = "FAILED";
    query.errorMessage = error instanceof Error ? error.message : "Falha ao pesquisar CATMAT oficial.";
    query.finishedAt = new Date().toISOString();
    if (persistenceMode() === "postgresql") await saveQuery(query);
    else state.coverageQueries.unshift(query);
    throw error;
  }
}
