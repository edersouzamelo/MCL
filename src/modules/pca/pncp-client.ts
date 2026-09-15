const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta/v1";

export type PncpPcaRecord = Record<string, unknown>;

type PncpPage = {
  data?: PncpPcaRecord[];
  totalPaginas?: number;
  paginasRestantes?: number;
};

function flattenPcaRecords(records: PncpPcaRecord[], year: number) {
  return records.flatMap((pca) => {
    if (Number(pca.anoPca ?? pca.ano) !== year) return [];
    const items = Array.isArray(pca.itens) ? pca.itens : [];
    return items
      .filter((item): item is PncpPcaRecord => Boolean(item) && typeof item === "object")
      .map((item) => ({
        ...item,
        anoPca: pca.anoPca ?? pca.ano,
        numeroControlePNCPPca: pca.idPcaPncp ?? pca.numeroControlePNCPPca,
        dataPublicacaoPncp: pca.dataPublicacaoPNCP,
        codigoUnidade: pca.codigoUnidade,
        nomeUnidade: pca.nomeUnidade,
        orgaoEntidadeCnpj: pca.orgaoEntidadeCnpj,
      }));
  });
}

async function readPncpPage(url: URL) {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "MCL/1.0 (conector PCA)" },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("O PNCP não respondeu em 25 segundos. Tente sincronizar novamente mais tarde.");
    }
    throw new Error("Não foi possível conectar ao PNCP neste momento.");
  }
  if (response.status === 204) return { data: [], totalPages: 1 };
  if (!response.ok) throw new Error(`PNCP respondeu HTTP ${response.status} ao consultar o PCA.`);
  const payload = await response.json() as PncpPage | PncpPcaRecord[];
  return {
    data: Array.isArray(payload) ? payload : payload.data ?? [],
    totalPages: Array.isArray(payload)
      ? 1
      : payload.totalPaginas ?? (payload.paginasRestantes ? Number(url.searchParams.get("pagina")) + payload.paginasRestantes : Number(url.searchParams.get("pagina"))),
  };
}

export async function fetchPncpPcaByUser(input: {
  year: number;
  pncpUserId: number;
  cnpj?: string | null;
}) {
  const records: PncpPcaRecord[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(`${PNCP_BASE_URL}/pca/usuario`);
    url.searchParams.set("anoPca", String(input.year));
    url.searchParams.set("idUsuario", String(input.pncpUserId));
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("tamanhoPagina", "500");
    if (input.cnpj) url.searchParams.set("cnpj", input.cnpj.replace(/\D/g, ""));

    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "MCL/1.0 (conector PCA)" },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`PNCP respondeu HTTP ${response.status} ao consultar o PCA.`);
    }

    const payload = await response.json() as PncpPage | PncpPcaRecord[];
    const data = Array.isArray(payload) ? payload : payload.data ?? [];
    records.push(...data);
    totalPages = Array.isArray(payload)
      ? 1
      : payload.totalPaginas ?? (payload.paginasRestantes ? page + payload.paginasRestantes : page);
    page += 1;
  } while (page <= totalPages && page <= 200);

  return records;
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function dateWindows(start: Date, end: Date) {
  const windows: Array<[Date, Date]> = [];
  let cursor = start;
  while (cursor <= end) {
    const finish = new Date(Math.min(end.getTime(), cursor.getTime() + 364 * 86_400_000));
    windows.push([cursor, finish]);
    cursor = new Date(finish.getTime() + 86_400_000);
  }
  return windows;
}

export async function fetchPncpPcaByUasg(input: { year: number; uasg: string; cnpj?: string | null }) {
  const cnpj = input.cnpj?.replace(/\D/g, "");
  if (!cnpj || cnpj.length !== 14) {
    throw new Error("O PNCP exige o CNPJ do órgão para consultar o PCA por UASG.");
  }
  const today = new Date();
  const end = today < new Date(`${input.year}-12-31T23:59:59Z`) ? today : new Date(`${input.year}-12-31T23:59:59Z`);
  const start = new Date(`${input.year - 1}-01-01T00:00:00Z`);
  const records: PncpPcaRecord[] = [];

  for (const [dataInicio, dataFim] of dateWindows(start, end)) {
    let page = 1;
    let totalPages = 1;
    do {
      const url = new URL(`${PNCP_BASE_URL}/pca/atualizacao`);
      url.searchParams.set("dataInicio", yyyymmdd(dataInicio));
      url.searchParams.set("dataFim", yyyymmdd(dataFim));
      url.searchParams.set("codigoUnidade", input.uasg);
      url.searchParams.set("pagina", String(page));
      url.searchParams.set("tamanhoPagina", "500");
      url.searchParams.set("cnpj", cnpj);

      const result = await readPncpPage(url);
      records.push(...flattenPcaRecords(result.data, input.year));
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 200);
  }

  return [...new Map(records.map((record, index) => [normalizePncpPcaRecord(record, index).pncpItemId, record])).values()];
}

function text(record: PncpPcaRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function number(record: PncpPcaRecord, ...keys: string[]) {
  const value = text(record, ...keys);
  if (!value) return null;
  const normalized = value.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function date(record: PncpPcaRecord, ...keys: string[]) {
  const value = text(record, ...keys);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizePncpPcaRecord(record: PncpPcaRecord, index: number) {
  const controlNumber = text(record, "numeroControlePNCPPca", "numeroControlePca", "numeroControlePNCP");
  const itemNumber = number(record, "numeroItem", "numeroItemPca", "sequencialItem");
  const catalogCode = text(record, "codigoItem", "codigoCatalogo", "codigoMaterialServico");
  const description = text(record, "descricaoItem", "descricao", "objeto") ?? "Item sem descrição no PNCP";
  const compositeId = [controlNumber, itemNumber, catalogCode, description].filter(Boolean).join(":");
  const id = text(record, "id", "idItemPca", "numeroControleItem") || compositeId || `item-${index + 1}`;

  return {
    pncpItemId: id.slice(0, 500),
    pncpControlNumber: controlNumber,
    itemNumber: itemNumber === null ? null : Math.trunc(itemNumber),
    catalogCode,
    catalogType: text(record, "tipoCatalogo", "categoriaItemPcaNome"),
    description,
    unit: text(record, "unidadeFornecimento", "unidadeMedida", "unidade"),
    estimatedQuantity: number(record, "quantidadeEstimada", "quantidade"),
    estimatedUnitValue: number(record, "valorUnitarioEstimado", "valorUnitario"),
    estimatedTotalValue: number(record, "valorTotal", "valorTotalEstimado"),
    expectedContractingDate: date(record, "dataDesejada", "dataEstimadaContratacao", "dataPrevistaContratacao"),
    category: text(record, "categoriaItemPcaNome", "categoriaItemPca"),
    classificationCode: text(record, "codigoClassificacaoSuperior", "codigoGrupo"),
    sourceUpdatedAt: date(record, "dataAtualizacao", "dataPublicacaoPncp"),
    sourceUrl: controlNumber ? `https://pncp.gov.br/pca/${encodeURIComponent(controlNumber)}` : null,
    rawPayload: record,
  };
}
