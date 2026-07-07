import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coverage/atas/search/route";
import { getServerSession } from "next-auth";
import { getDemoState, resetDemoState } from "@/server/demo-store";
import { clearComprasGovCache } from "@/modules/connectors/compras-gov/http";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

function session() {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "user-demo-admin", organizationId: "org-provedor-alfa" },
  });
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    needId: "need-calca-120",
    analysisId: "analysis-need-calca-120",
    catalogMappingId: "mapping-calca-120-default",
    catmatCode: "452757",
    dateStart: "2026-01-01",
    dateEnd: "2026-12-31",
    requestId: "req-arp-test",
    ...overrides,
  };
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/coverage/atas/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function arpItem(overrides: Record<string, unknown> = {}) {
  return {
    numeroAtaRegistroPreco: "00015/2026",
    codigoUnidadeGerenciadora: "201057",
    numeroCompra: "90015",
    anoCompra: "2026",
    codigoModalidadeCompra: "05",
    dataAssinatura: "2026-03-25T00:00:00",
    dataVigenciaInicial: "2026-03-26",
    dataVigenciaFinal: "2027-03-26",
    numeroItem: "00020",
    codigoItem: 452757,
    descricaoItem: "BOTA SEGURANCA, MATERIAL COURO, MATERIAL SOLA BORRACHA",
    tipoItem: "Material",
    quantidadeHomologadaItem: 120,
    classificacaoFornecedor: "1",
    niFornecedor: "12345678000190",
    nomeRazaoSocialFornecedor: "FORNECEDOR TESTE LTDA",
    quantidadeHomologadaVencedor: 120,
    valorUnitario: 438,
    valorTotal: 52560,
    maximoAdesao: 240,
    nomeUnidadeGerenciadora: "UNIDADE TESTE",
    nomeModalidadeCompra: "Pregao Eletronico",
    idCompra: "compra-arp-test",
    numeroControlePncpCompra: "12345678000190-1-90015-2026",
    numeroControlePncpAta: "12345678000190-3-00015-2026",
    dataHoraInclusao: "2026-03-25T00:00:00",
    dataHoraAtualizacao: "2026-03-26T00:00:00",
    quantidadeEmpenhada: 0,
    percentualMaiorDesconto: 0,
    situacaoSicaf: "Regular",
    itemExcluido: false,
    codigoPdm: 1415,
    nomePdm: "BOTA",
    ...overrides,
  };
}

describe("API Route - /api/coverage/atas/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDemoState();
    clearComprasGovCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("retorna 401 caso o usuario nao esteja autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await POST(request(payload()));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.requestId).toBe("req-arp-test");
  });

  it("valida que o needId e obrigatorio", async () => {
    session();

    const response = await POST(request(payload({ needId: undefined })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("MISSING_NEED_ID");
  });

  it("rejeita CATMAT ausente", async () => {
    session();

    const response = await POST(request(payload({ catmatCode: undefined })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("MISSING_CATMAT_CODE");
  });

  it("retorna erro se nao houver mapeamento CATMAT confirmado", async () => {
    session();
    const state = getDemoState();
    state.itemCatalogMappings = [];

    const response = await POST(request(payload()));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("NO_CATMAT_MAPPING");
  });

  it("valida que o CATMAT enviado e o CATMAT ativo confirmado", async () => {
    session();

    const response = await POST(request(payload({ catmatCode: "111111" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_CATMAT_CODE");
  });

  it("trata resultado vazio como ARP_SEARCH_EMPTY e persiste o rastro", async () => {
    session();
    vi.mocked(fetch).mockResolvedValue(
      responseJson({ resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 }),
    );

    const response = await POST(request(payload()));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stage).toBe("ARP_SEARCH_EMPTY");
    expect(body.catmatCode).toBe("452757");
    expect(body.count).toBe(0);
    expect(body.trace.params.codigoItem).toBe(452757);
    expect(body.trace.totalRegistros).toBe(0);

    const state = getDemoState();
    expect(state.coverageQueries[0].status).toBe("NO_RESULTS");
    expect(state.coverageQueries[0].externalItemCode).toBe("452757");
  });

  it("trata resultado com atas como ARP_SEARCH_COMPLETED", async () => {
    session();
    vi.mocked(fetch).mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    );

    const response = await POST(request(payload()));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stage).toBe("ARP_SEARCH_COMPLETED");
    expect(body.count).toBe(1);
    expect(body.items[0].instrument.itemCode).toBe("452757");
    expect(getDemoState().coverageQueries[0].status).toBe("SUCCESS");
  });

  it("trata timeout de forma explicita", async () => {
    session();
    const timeout = new Error("Tempo limite atingido ao consultar Compras.gov.br.");
    timeout.name = "AbortError";
    vi.mocked(fetch).mockRejectedValue(timeout);

    const response = await POST(request(payload()));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.stage).toBe("ARP_SEARCH_FAILED");
    expect(body.code).toBe("TIMEOUT");
    expect(body.retryable).toBe(true);
    expect(getDemoState().coverageQueries[0].status).toBe("FAILED");
  });

  it("normaliza mappingSnapshot com Date em confirmedAt e realiza a busca com sucesso", async () => {
    session();
    vi.mocked(fetch).mockResolvedValue(
      responseJson({ resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 }),
    );

    const snapshotWithDate = {
      id: "mapping-calca-120-default",
      mclItemId: "item-calca-120",
      needId: "need-calca-120",
      externalCatalog: "CATMAT",
      externalItemCode: "452757",
      externalDescription: "Calca",
      confirmedBy: "user-demo-admin",
      confirmedAt: new Date("2026-03-25T00:00:00.000Z"),
      status: "ACTIVE",
      confidence: 1,
      mappingVersion: 1,
    };

    const response = await POST(request(payload({ mappingSnapshot: snapshotWithDate })));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stage).toBe("ARP_SEARCH_EMPTY");
  });

  it("retorna INTERNAL_PAYLOAD_VALIDATION quando ocorre erro de validacao interna (ex: dataStart invalida)", async () => {
    session();

    const response = await POST(request(payload({ dateStart: "data-invalida" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INTERNAL_PAYLOAD_VALIDATION");
    expect(body.message).toContain("Erro de validacao dos dados");
  });
});
