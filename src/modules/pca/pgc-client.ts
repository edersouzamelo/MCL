export type PgcRecord = Record<string, unknown>;
export type PgcScope = { cnpj: string; uasg: string; year: number };
export const PGC_URL = 'https://dadosabertos.compras.gov.br/modulo-pgc/1_consultarPgcDetalhe';

export function pgcSourceUrl(scope: PgcScope, page = 1) {
  const url = new URL(PGC_URL);
  url.search = new URLSearchParams({ orgao: scope.cnpj, codigoUasg: scope.uasg,
    anoPcaProjetoCompra: String(scope.year), pagina: String(page), tamanhoPagina: '500' }).toString();
  return url.toString();
}

export async function fetchPgcDetails(scope: PgcScope): Promise<PgcRecord[]> {
  const records: PgcRecord[] = [];
  const deadline = AbortSignal.timeout(120_000);
  let totalPages = 1;
  let totalRecords: number | undefined;
  for (let page = 1; page <= totalPages; page++) {
    let response: Response;
    try {
      response = await fetch(pgcSourceUrl(scope, page), { cache: 'no-store',
        signal: AbortSignal.any([deadline, AbortSignal.timeout(45_000)]) });
    } catch {
      throw new Error('O Compras.gov.br não respondeu no prazo. Os detalhes já armazenados foram preservados.');
    }
    if (!response.ok) throw new Error(`Compras.gov.br respondeu HTTP ${response.status}. Os detalhes anteriores foram preservados.`);
    const payload = await response.json();
    if (!Array.isArray(payload.resultado) || !Number.isInteger(payload.totalPaginas) ||
        payload.totalPaginas < 0 || payload.totalPaginas > 100 || !Number.isInteger(payload.totalRegistros) || payload.totalRegistros < 0) {
      throw new Error('Resposta incompleta do PGC. Os detalhes anteriores foram preservados.');
    }
    if (totalRecords !== undefined && totalRecords !== payload.totalRegistros) {
      throw new Error('O PGC mudou durante a consulta. Repita a atualização para obter uma cópia consistente.');
    }
    totalRecords = payload.totalRegistros;
    totalPages = payload.totalPaginas;
    for (const record of payload.resultado) {
      if (!record || record.orgao !== scope.cnpj || record.codigoUasg !== scope.uasg ||
          record.anoPcaProjetoCompra !== scope.year) throw new Error('O PGC retornou dados fora da organização ou exercício selecionado.');
      records.push(record);
    }
  }
  if (records.length !== totalRecords) throw new Error('A paginação do PGC ficou incompleta. Nenhum detalhe anterior foi substituído.');
  return records;
}

// PNCP item numbers are meaningful only within the same organization, UASG and year.
// Never infer the link from a shared CATMAT/CATSER or similar description.
export function matchPgcDetails(items: Array<{ id: string; itemNumber: number | null; catalogCode: string | null; pncpControlNumber: string | null }>, records: PgcRecord[], scope: PgcScope) {
  const byNumber = new Map<number, PgcRecord[]>();
  for (const record of records) {
    if (record.orgao !== scope.cnpj || record.codigoUasg !== scope.uasg || record.anoPcaProjetoCompra !== scope.year ||
        !Number.isInteger(record.numeroItemPncp)) continue;
    const number = Number(record.numeroItemPncp);
    byNumber.set(number, [...(byNumber.get(number) ?? []), record]);
  }
  const frequency = new Map<number, number>();
  for (const item of items) if (item.itemNumber !== null) frequency.set(item.itemNumber, (frequency.get(item.itemNumber) ?? 0) + 1);
  return items.map((item) => {
    const scoped = item.pncpControlNumber?.startsWith(`${scope.cnpj}-0-`) && item.pncpControlNumber.endsWith(`/${scope.year}`);
    const candidates = scoped && item.itemNumber !== null && frequency.get(item.itemNumber) === 1 ? byNumber.get(item.itemNumber) ?? [] : [];
    // A catalog conflict makes the link ambiguous; don't silently discard one candidate.
    const conflict = candidates.some((r) => r.codigoItemCatalogo && item.catalogCode && String(r.codigoItemCatalogo) !== item.catalogCode);
    const unique = [...new Map(candidates.map((r) => [JSON.stringify(r), r])).values()];
    return { id: item.id, records: conflict ? [] : unique, conflict };
  });
}
