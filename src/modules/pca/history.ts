import { prisma } from "@/server/db";

export function historyQuery(params: URLSearchParams) {
  const source = params.get("source") || undefined;
  if (source && source !== "PNCP" && source !== "PGC") throw new Error("Fonte do histórico inválida.");
  const query = params.get("q")?.trim() || undefined;
  const cursor = params.get("cursor") || undefined;
  if ((query?.length ?? 0) > 200 || (cursor?.length ?? 0) > 100) throw new Error("Filtro do histórico inválido.");
  return { source, query, cursor };
}

export async function pcaHistory(organizationId: string, year: number, params: URLSearchParams) {
  const { source, query, cursor } = historyQuery(params);
  const itemId = params.get("itemId") || undefined;
  const revisionId = params.get("revisionId");
  // Organization/year are always derived from the authorized context, including detail reads.
  const item = { organizationId, year, ...(itemId ? { id: itemId } : {}) };
  if (revisionId) {
    const revision = await prisma.pcaItemRevision.findFirst({ where: { id: revisionId, item } });
    if (!revision) throw new Error("Versão não localizada no escopo autorizado.");
    return { revision };
  }
  const where = { item: { ...item, ...(query ? { OR: [
    { description: { contains: query, mode: "insensitive" as const } },
    { catalogCode: { contains: query } },
    ...( /^\d+$/.test(query) && Number.isSafeInteger(Number(query)) && Number(query) <= 2147483647 ? [{ itemNumber: Number(query) }] : []),
  ] } : {}) }, ...(source ? { source } : {}) };
  if (cursor && !await prisma.pcaItemRevision.findFirst({ where: { ...where, id: cursor }, select: { id: true } })) {
    throw new Error("Página do histórico inválida. Reinicie a consulta.");
  }
  const revisions = await prisma.pcaItemRevision.findMany({ where,
    select: { id: true, pcaItemId: true, source: true, version: true, kind: true, observedAt: true, recordedAt: true,
      item: { select: { itemNumber: true, catalogCode: true, description: true, active: true } } },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }], take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return { revisions: revisions.slice(0, 20), nextCursor: revisions.length > 20 ? revisions[19].id : null };
}
