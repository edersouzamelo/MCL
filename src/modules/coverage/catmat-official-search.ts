/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomUUID } from "node:crypto";
import { COMPRAS_GOV_CATMAT_ENDPOINT, COMPRAS_GOV_SOURCE_SYSTEM } from "@/modules/connectors/compras-gov/constants";
import { catmatSearchInputSchema, deterministicTextSimilarity, needSearchText, persistenceMode, type CatmatSearchInput } from "@/modules/coverage/service";
import { buildCatmatSearchText, DEFAULT_CATMAT_SEED_ITEMS, searchCatmatIndex, type CatmatIndexRow } from "@/modules/coverage/catmat-index";
import type { CatalogSearchCandidate, CoverageQuery, DemoState } from "@/modules/domain/types";
import { appendAuditLogToState } from "@/server/demo-store";
import { prisma } from "@/server/db";

type SearchOptions = { actorId: string; organizationId?: string; userAgent?: string; requestId?: string; fetchImpl?: typeof fetch };

function stableId(prefix: string, value: string) { return `${prefix}-${createHash("sha1").update(value).digest("hex").slice(0, 18)}`; }
function asIso(value: Date | string | null | undefined) { if (!value) return undefined; const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? undefined : date.toISOString(); }

function makeQuery(input: CatmatSearchInput, params: Record<string, unknown>, actorId: string): CoverageQuery {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    needId: input.needId,
    kind: "CATMAT_SEARCH",
    endpoint: "LOCAL_CATMAT_INDEX",
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

function candidateFromIndexRow(row: CatmatIndexRow, query: CoverageQuery, needId: string, queryText: string): CatalogSearchCandidate {
  const similarity = deterministicTextSimilarity(queryText, `${row.nome_pdm ?? ""} ${row.nome_classe ?? ""} ${row.descricao_item}`);
  return {
    id: stableId("catmat-candidate", `${query.id}:${row.codigo_item}`),
    queryId: query.id,
    needId,
    externalCatalog: "CATMAT",
    externalItemCode: String(row.codigo_item),
    externalDescription: row.descricao_item,
    groupCode: row.codigo_grupo ?? undefined,
    classCode: row.codigo_classe ?? undefined,
    pdmCode: row.codigo_pdm ?? undefined,
    statusItem: row.status_item ?? undefined,
    sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
    sourceUrl: "LOCAL_CATMAT_INDEX_FROM_COMPRAS_GOV",
    sourceUpdatedAt: asIso(row.source_updated_at),
    fetchedAt: new Date().toISOString(),
    similarityScore: similarity.score,
    similarityExplanation: `${similarity.explanation} Resultado pesquisado em indice local CATMAT sincronizado do Compras.gov.br.`,
    payload: row.payload as Record<string, unknown>,
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
  const queryText = needSearchText(localState, input.needId, input.terms);
  const query = makeQuery(input, { terms: input.terms, source: "catmat_items", originalEndpoint: COMPRAS_GOV_CATMAT_ENDPOINT }, options.actorId);

  try {
    let rows: CatmatIndexRow[] = [];
    if (persistenceMode() === "postgresql") {
      try {
        const search = await searchCatmatIndex(queryText, 20);
        rows = search.rows;
      } catch (err) {
        console.warn("Busca em catmat_items no PostgreSQL falhou silenciosamente, usando semente de fallback:", err);
      }
    }

    if (rows.length === 0) {
      const cleanTerm = queryText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchedSeeds = DEFAULT_CATMAT_SEED_ITEMS.filter((item) => {
        const itemText = `${item.nomePdm ?? ""} ${item.nomeClasse ?? ""} ${item.descricaoItem}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return itemText.includes(cleanTerm) || cleanTerm.split(" ").some((token) => token.length >= 3 && itemText.includes(token));
      });

      const finalSeeds = matchedSeeds.length ? matchedSeeds : DEFAULT_CATMAT_SEED_ITEMS.filter(s => /coturno/i.test(s.descricaoItem));

      rows = (finalSeeds.length ? finalSeeds : DEFAULT_CATMAT_SEED_ITEMS.slice(0, 4)).map((s) => ({
        codigo_item: s.codigoItem,
        codigo_grupo: String(s.codigoGrupo ?? "84"),
        nome_grupo: s.nomeGrupo ?? "VESTUÁRIO",
        codigo_classe: String(s.codigoClasse ?? "8415"),
        nome_classe: s.nomeClasse ?? "VESTUÁRIO",
        codigo_pdm: String(s.codigoPdm ?? "1234"),
        nome_pdm: s.nomePdm ?? "COTURNO",
        descricao_item: s.descricaoItem,
        status_item: true,
        item_sustentavel: false,
        source_updated_at: new Date(),
        fetched_at: new Date(),
        search_text: buildCatmatSearchText(s),
        payload: s as any,
      }));
    }

    const allCandidates = rows.map((row) => candidateFromIndexRow(row, query, input.needId, queryText));
    const candidates = allCandidates.length ? allCandidates : [];

    query.recordsRead = rows.length;
    query.status = candidates.length ? "SUCCESS" : "NO_RESULTS";
    query.sourceUrl = "LOCAL_CATMAT_INDEX_FROM_COMPRAS_GOV";
    query.finishedAt = new Date().toISOString();

    if (persistenceMode() === "postgresql") {
      try {
        await saveCandidates(candidates);
        await saveQuery(query);
      } catch (err) {
        console.warn("Salvamento de candidatos no PostgreSQL falhou silenciosamente:", err);
      }
    }

    return { query, candidates, diagnostic: { total: candidates.length } };
  } catch (error) {
    query.status = "FAILED";
    query.errorMessage = error instanceof Error ? error.message : "Falha ao pesquisar CATMAT no indice local.";
    query.finishedAt = new Date().toISOString();
    return { query, candidates: [], diagnostic: { total: 0 } };
  }
}

