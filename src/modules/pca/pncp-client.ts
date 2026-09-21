const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta/v1";

export type PncpPcaRecord = Record<string, unknown>;

type PncpPage = {
  data?: PncpPcaRecord[];
  totalPaginas?: number;
  paginasRestantes?: number;
};

async function readPncpJson(url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("O PNCP não respondeu em 25 segundos. Os dados já armazenados foram preservados.");
    }
    throw new Error("Não foi possível conectar ao PNCP neste momento.");
  }
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`PNCP respondeu HTTP ${response.status} ao consultar o PCA.`);
  return response.json();
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

export async function fetchPncpPcaByUasg(input: { year: number; uasg: string; cnpj?: string | null }) {
  const cnpj = input.cnpj?.replace(/\D/g, "");
  if (!cnpj || cnpj.length !== 14) {
    throw new Error("O PNCP exige o CNPJ do órgão para consultar o PCA por UASG.");
  }
  const base = `https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/pca`;
  const sequence = await readPncpJson(new URL(`${base}/${encodeURIComponent(input.uasg)}/${input.year}/sequenciaisplano`)) as { sequencialPlano?: number } | null;
  if (sequence === null) return [];
  if (!Number.isInteger(sequence.sequencialPlano) || Number(sequence.sequencialPlano) < 1) {
    throw new Error("O PNCP retornou uma identificação de plano inválida. Os dados anteriores foram preservados.");
  }
  const plan = await readPncpJson(new URL(`${base}/${input.year}/${sequence.sequencialPlano}/itens/plano`)) as { uasg?: string; itens?: PncpPcaRecord[] } | null;
  if (!plan || plan.uasg !== input.uasg || !Array.isArray(plan.itens)) {
    throw new Error("O PNCP retornou um plano incompleto ou de outra UASG. Os dados anteriores foram preservados.");
  }
  const controlNumber = `${cnpj}-0-${String(sequence.sequencialPlano).padStart(6, "0")}/${input.year}`;
  const seen = new Set<number>();
  return plan.itens.map((item) => {
    if (!item || item.codigoUnidade !== input.uasg || item.cnpj !== cnpj ||
        Number(item.anoPca) !== input.year || Number(item.sequencialPca) !== sequence.sequencialPlano ||
        !Number.isInteger(item.numeroItem) || seen.has(Number(item.numeroItem))) {
      throw new Error("O PNCP retornou itens inconsistentes. Os dados anteriores foram preservados.");
    }
    seen.add(Number(item.numeroItem));
    return { ...item, numeroControlePNCPPca: controlNumber,
      idItemPca: `${controlNumber}:${item.numeroItem}`,
      sourceUrl: `https://pncp.gov.br/app/pca/${cnpj}/${input.year}/${sequence.sequencialPlano}` };
  });
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
    classificationCode: text(record, "classificacaoSuperiorCodigo", "codigoClassificacaoSuperior", "codigoGrupo"),
    sourceUpdatedAt: date(record, "dataAtualizacao", "dataPublicacaoPncp"),
    sourceUrl: text(record, "sourceUrl") ?? (controlNumber ? `https://pncp.gov.br/pca/${encodeURIComponent(controlNumber)}` : null),
    rawPayload: record,
  };
}
