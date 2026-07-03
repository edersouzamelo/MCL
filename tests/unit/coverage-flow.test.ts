import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/modules/demo/data";
import type { DemoState } from "@/modules/domain/types";
import type { ComprasGovConfig } from "@/modules/connectors/compras-gov/config";
import { clearComprasGovCache } from "@/modules/connectors/compras-gov/http";
import {
  buildCoverageSynthesis,
  confirmCatalogMapping,
  consultArpUnits,
  deterministicTextSimilarity,
  revokeCatalogMapping,
  searchArpsForConfirmedCatmat,
  searchCatmatCandidates,
  inferredCatalogFilters,
  needSearchText,
} from "@/modules/coverage/service";

function state(): DemoState {
  const s = JSON.parse(JSON.stringify(createDemoState())) as DemoState;
  s.itemCatalogMappings = [];
  return s;
}

function config(): ComprasGovConfig {
  return {
    baseUrl: "https://compras.test",
    syncEnabled: true,
    pageSize: 10,
    requestTimeoutMs: 1000,
    cacheTtlSeconds: 0,
    maxPages: 1,
    retryAttempts: 0,
    rateLimitMs: 0,
    filters: {
      dateStart: "2026-01-01",
      dateEnd: "2026-12-31",
      unitCode: undefined,
      catmatCode: "605160",
      modalityCode: undefined,
      situation: undefined,
      keyword: undefined,
    },
  };
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function catalogItem(overrides: Record<string, unknown> = {}) {
  return {
    codigoItem: 605160,
    descricaoItem:
      "BOTA SEGURANCA, MATERIAL COURO HIDROFUGADO, MATERIAL SOLA BORRACHA ANTIDERRAPANTE, TAMANHO SOB MEDIDA, TIPO CANO FORRADO",
    codigoGrupo: 84,
    codigoClasse: 8430,
    codigoPdm: 1415,
    statusItem: true,
    dataHoraAtualizacao: "2026-05-08T16:59:41",
    ...overrides,
  };
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
    codigoItem: 605160,
    descricaoItem:
      "BOTA SEGURANCA, MATERIAL COURO HIDROFUGADO, MATERIAL SOLA BORRACHA ANTIDERRAPANTE, TAMANHO SOB MEDIDA",
    tipoItem: "Material",
    quantidadeHomologadaItem: 4863,
    classificacaoFornecedor: "001",
    niFornecedor: "11384751000175",
    nomeRazaoSocialFornecedor: "MF BOLSAS IND. E COM. LTDA",
    quantidadeHomologadaVencedor: 4863,
    valorUnitario: 438,
    valorTotal: 2130000,
    maximoAdesao: 9726,
    nomeUnidadeGerenciadora: "CENTRAL DE COMPRAS",
    nomeModalidadeCompra: "Pregao",
    idCompra: "20105705900152026",
    numeroControlePncpCompra: "00394544000185-1-001959/2026",
    dataHoraInclusao: "2026-03-25T15:38:55",
    dataHoraAtualizacao: "2026-05-08T16:59:41",
    quantidadeEmpenhada: 0,
    percentualMaiorDesconto: 0,
    situacaoSicaf: "1",
    dataHoraExclusao: null,
    itemExcluido: false,
    numeroControlePncpAta: "00394544000185-1-001959/2026-000015",
    codigoPdm: 1415,
    nomePdm: "BOTA SEGURANCA",
    ...overrides,
  };
}

function unitRecord(overrides: Record<string, unknown> = {}) {
  return {
    numeroAta: "00015/2026",
    unidadeGerenciadora: "201057",
    numeroItem: "00020",
    codigoPdm: "01415",
    descricaoItem: "BOTA SEGURANCA, MATERIAL COURO HIDROFUGADO",
    fornecedor: "11384751000175 - MF BOLSAS IND. E COM. LTDA",
    quantidadeRegistrada: 4863,
    saldoAdesoes: 9726,
    saldoRemanejamentoEmpenho: 4863,
    qtdLimiteAdesao: 9726,
    qtdLimiteInformadoCompra: 9726,
    aceitaAdesao: true,
    dataHoraInclusao: "2026-03-25T15:38:55",
    dataHoraAtualizacao: "2026-05-08T16:59:41",
    dataHoraExclusao: null,
    codigoUnidade: "201057",
    nomeUnidade: "CENTRAL DE COMPRAS",
    tipoUnidade: "GERENCIADORA",
    ...overrides,
  };
}

async function prepareMapping(demo: DemoState) {
  const fetchImpl = vi.fn().mockResolvedValue(
    responseJson({ resultado: [catalogItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
  ) as unknown as typeof fetch;
  const search = await searchCatmatCandidates(
    demo,
    { needId: "need-coturno-200", terms: "bota seguranca couro" },
    { actorId: "user-demo-admin", config: config(), fetchImpl },
  );
  return await confirmCatalogMapping(
    demo,
    {
      needId: "need-coturno-200",
      candidateId: search.candidates[0].id,
      justification: "Confirmacao humana demonstrativa do CATMAT de bota para coturno.",
    },
    ["LOGISTICS_MANAGER"],
    "user-demo-admin",
  );
}

beforeEach(() => {
  clearComprasGovCache();
});

describe("consulta de cobertura orientada pela necessidade", () => {
  it("pesquisa CATMAT por descricao e calcula similaridade textual", async () => {
    const demo = state();
    const fetchMock = vi.fn().mockResolvedValue(
      responseJson({ resultado: [catalogItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    );
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const result = await searchCatmatCandidates(
      demo,
      { needId: "need-coturno-200", terms: "bota seguranca couro", filters: { descricaoItem: "BOTA SEGURANCA", statusItem: true } },
      { actorId: "user-demo-admin", config: config(), fetchImpl },
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].externalItemCode).toBe("605160");
    expect(result.candidates[0].similarityScore).toBeGreaterThan(0);
    expect(String(fetchMock.mock.calls[0][0])).toContain("descricaoItem=BOTA+SEGURANCA");
  });

  it("registra pesquisa sem candidatos", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const result = await searchCatmatCandidates(
      demo,
      { needId: "need-coturno-200", terms: "coturno" },
      { actorId: "user-demo-admin", config: config(), fetchImpl },
    );

    expect(result.candidates).toHaveLength(0);
    expect(demo.coverageQueries[0].status).toBe("NO_RESULTS");
  });

  it("ordena diversos candidatos por similaridade", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({
        resultado: [
          catalogItem({ codigoItem: 111111, descricaoItem: "SAPATO SOCIAL PRETO" }),
          catalogItem(),
        ],
        totalRegistros: 2,
        totalPaginas: 1,
        paginasRestantes: 0,
      }),
    ) as unknown as typeof fetch;

    const result = await searchCatmatCandidates(
      demo,
      { needId: "need-coturno-200", terms: "bota seguranca couro" },
      { actorId: "user-demo-admin", config: config(), fetchImpl },
    );

    expect(result.candidates[0].externalItemCode).toBe("605160");
  });

  it("confirma e revoga CATMAT com auditoria", async () => {
    const demo = state();
    const mapping = await prepareMapping(demo);

    expect(mapping.status).toBe("ACTIVE");
    expect(demo.auditLogs[0].action).toBe("CATMAT_CONFIRMADO");

    const revoked = await revokeCatalogMapping(
      demo,
      { mappingId: mapping.id, reason: "Revogacao demonstrativa para testar substituicao futura." },
      ["LOGISTICS_MANAGER"],
      "user-demo-admin",
    );

    expect(revoked.status).toBe("REVOKED");
    expect(demo.auditLogs[0].action).toBe("CATMAT_REVOGADO");
  });

  it("substitui mapeamento ativo sem apagar historico", async () => {
    const demo = state();
    const first = await prepareMapping(demo);
    const candidate = { ...demo.catalogSearchCandidates[0], id: "candidate-replacement", externalItemCode: "222176" };
    demo.catalogSearchCandidates.unshift(candidate);

    const second = await confirmCatalogMapping(
      demo,
      {
        needId: "need-coturno-200",
        candidateId: candidate.id,
        justification: "Substituicao humana demonstrativa para outro codigo CATMAT.",
      },
      ["LOGISTICS_MANAGER"],
      "user-demo-admin",
    );

    expect(first.status).toBe("SUPERSEDED");
    expect(second.mappingVersion).toBe(2);
    expect(demo.itemCatalogMappings).toHaveLength(2);
  });

  it("nega confirmacao CATMAT sem autorizacao logistica", async () => {
    const demo = state();
    await prepareMapping(demo);

    await expect(
      confirmCatalogMapping(
        demo,
        {
          needId: "need-coturno-200",
          candidateId: demo.catalogSearchCandidates[0].id,
          justification: "Tentativa sem papel logistico suficiente.",
        },
        ["READ_ONLY"],
        "user-demo-viewer",
      ),
    ).rejects.toThrow("LOGISTICS_MANAGER");
  });

  it("consulta atas apenas para CATMAT confirmado", async () => {
    const demo = state();
    await prepareMapping(demo);
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const result = await searchArpsForConfirmedCatmat(
      demo,
      { needId: "need-coturno-200", dataVigenciaInicialMin: "2026-01-01", dataVigenciaInicialMax: "2026-12-31" },
      { actorId: "user-demo-admin", config: config(), fetchImpl },
    );

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].instrument.itemCode).toBe("605160");
    expect(demo.supplyItems.find((item) => item.persistentCode === "CATMAT-605160")?.supplyClass).toBe("EXTERNAL_UNMAPPED");
  });

  it("trata ata inexistente como consulta sem resultado", async () => {
    const demo = state();
    await prepareMapping(demo);
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const result = await searchArpsForConfirmedCatmat(
      demo,
      { needId: "need-coturno-200" },
      { actorId: "user-demo-admin", config: config(), fetchImpl },
    );

    expect(result.entries).toHaveLength(0);
    expect(result.query.status).toBe("NO_RESULTS");
  });

  it("ignora ata vencida na sintese de vigencia", async () => {
    const demo = state();
    await prepareMapping(demo);
    const instrument = {
      ...demo.acquisitionInstruments[0],
      sourceSystem: "COMPRAS_GOV",
      itemCode: "605160",
      validFrom: "2025-01-01T00:00:00.000Z",
      validUntil: "2025-12-31T00:00:00.000Z",
      capacity: 500,
    };

    const synthesis = buildCoverageSynthesis(demo, "need-coturno-200", [instrument], []);

    expect(synthesis.currentAtaCount).toBe(0);
    expect(synthesis.potentialQuantity).toBe(0);
  });

  it("consulta unidades e mantem idempotencia por unidade", async () => {
    const demo = state();
    await prepareMapping(demo);
    const fetchAtas = vi.fn().mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;
    const atas = await searchArpsForConfirmedCatmat(
      demo,
      { needId: "need-coturno-200" },
      { actorId: "user-demo-admin", config: config(), fetchImpl: fetchAtas },
    );
    const fetchUnits = vi.fn().mockImplementation(() =>
      Promise.resolve(responseJson({ resultado: [unitRecord()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 })),
    ) as unknown as typeof fetch;
    const input = {
      needId: "need-coturno-200",
      acquisitionInstrumentId: atas.entries[0].instrument.id,
      ...atas.entries[0].unitQuery,
    };

    const first = await consultArpUnits(demo, input, { actorId: "user-demo-admin", config: config(), fetchImpl: fetchUnits });
    await consultArpUnits(demo, input, { actorId: "user-demo-admin", config: config(), fetchImpl: fetchUnits });

    expect(first.records).toHaveLength(1);
    expect(demo.arpUnitRecords).toHaveLength(1);
    expect(first.synthesis.balanceStatus).toBe("CONSULTABLE");
  });

  it("registra falha quando API externa fica indisponivel", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(responseJson({ erro: "fora" }, 503)) as unknown as typeof fetch;

    await expect(
      searchCatmatCandidates(
        demo,
        { needId: "need-coturno-200", terms: "bota" },
        { actorId: "user-demo-admin", config: config(), fetchImpl },
      ),
    ).rejects.toThrow("HTTP 503");
    expect(demo.coverageQueries[0].status).toBe("FAILED");
  });

  it("produz sintese deterministica sem termos conclusivos indevidos", async () => {
    const demo = state();
    await prepareMapping(demo);
    const synthesis = buildCoverageSynthesis(demo, "need-coturno-200", [
      {
        ...demo.acquisitionInstruments[0],
        sourceSystem: "COMPRAS_GOV",
        itemCode: "605160",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        capacity: 500,
        unitValue: 438,
        totalValue: 219000,
      },
    ]);
    const text = synthesis.phrases.join(" ").toLocaleLowerCase("pt-BR");

    expect(synthesis.deficit).toBe(80);
    expect(synthesis.confidence).toBeGreaterThan(0);
    expect(text).not.toContain("garantido");
    expect(text).not.toContain("contratacao assegurada");
    expect(deterministicTextSimilarity("bota couro", "BOTA DE COURO").score).toBe(1);
  });

  it("calcula o deficit deterministico de acordo com a formula: solicitado - estoque", () => {
    const demo = state();
    const need = demo.needs.find((n) => n.id === "need-coturno-200")!;
    const stockCovered = demo.needCoverages
      .filter((c) => c.needId === need.id && c.coverageType === "ESTOQUE")
      .reduce((sum, c) => sum + c.quantity, 0);

    const synthesis = buildCoverageSynthesis(demo, "need-coturno-200", [], []);
    
    expect(synthesis.quantityRequested).toBe(200);
    expect(synthesis.stockCovered).toBe(120);
    expect(synthesis.deficit).toBe(80);
    expect(synthesis.deficit).toBe(need.quantityRequested - stockCovered);
  });

  it("calcula a confianca da sintese deterministica combinando fatores objetivos", () => {
    const demo = state();
    const mappingCode = "605160";

    const instruments = [
      {
        ...demo.acquisitionInstruments[0],
        sourceSystem: "COMPRAS_GOV",
        itemCode: "605160",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        capacity: 500,
        unitValue: 438,
        totalValue: 219000,
      },
    ];

    // Sem unidades (balance NOT_QUERIED)
    const synthesisNoUnits = buildCoverageSynthesis(demo, "need-coturno-200", instruments, [], mappingCode);
    const confNoUnits = synthesisNoUnits.confidence;

    // Com unidades e saldo consultavel (balance status: CONSULTABLE)
    const records = [
      {
        id: "rec-1",
        needId: "need-coturno-200",
        acquisitionInstrumentId: "instrument-001",
        numeroAta: "00015/2026",
        unidadeGerenciadora: "201057",
        numeroItem: "00020",
        saldoAdesoes: 100,
        sourceUrl: "https://url.test",
        fetchedAt: "2026-07-02T10:00:00.000Z",
        payload: {},
      },
    ];
    const synthesisWithUnits = buildCoverageSynthesis(demo, "need-coturno-200", instruments, records, mappingCode);
    const confWithUnits = synthesisWithUnits.confidence;

    expect(confWithUnits).toBeGreaterThan(confNoUnits);
    expect(confWithUnits).toBeLessThanOrEqual(1.0);
  });

  it("prioriza termos de busca fornecidos pelo usuario na inferredCatalogFilters e needSearchText", () => {
    const demo = state();
    const filters = { needId: "need-calca-120", terms: "copo plastico" };
    // Call functions directly (they are already imported at the top of the test file!)
    const resultFilters = inferredCatalogFilters(demo, filters);
    expect(resultFilters.descricaoItem).toBe("copo");
    
    const resultSearchText = needSearchText(demo, "need-calca-120", "copo plastico");
    expect(resultSearchText).toBe("copo plastico");
  });

  it("retorna candidatos, atas e unidades simulados sob falha de API fora do ambiente de teste", async () => {
    const demo = state();
    await prepareMapping(demo);
    const fetchImpl = vi.fn().mockRejectedValue(new Error("Timeout/SSL Error")) as unknown as typeof fetch;

    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "development";

    try {
      const candidatesResult = await searchCatmatCandidates(
        demo,
        { needId: "need-coturno-200", terms: "copo" },
        { actorId: "user-demo-admin", config: config(), fetchImpl },
      );
      expect(candidatesResult.candidates).toHaveLength(3);
      expect(candidatesResult.candidates[0].externalItemCode).toBe("328003");

      const arpResult = await searchArpsForConfirmedCatmat(
        demo,
        { needId: "need-coturno-200" },
        { actorId: "user-demo-admin", config: config(), fetchImpl },
      );
      expect(arpResult.entries).toHaveLength(2);
      expect(arpResult.entries[0].instrument.sourceSystem).toBe("MCL_SIMULADO");

      const unitsResult = await consultArpUnits(
        demo,
        {
          needId: "need-coturno-200",
          acquisitionInstrumentId: arpResult.entries[0].instrument.id,
          numeroAta: "00010/2026",
          unidadeGerenciadora: "201057",
          numeroItem: "00001",
        },
        { actorId: "user-demo-admin", config: config(), fetchImpl },
      );
      expect(unitsResult.records).toHaveLength(2);
      expect(unitsResult.synthesis.balanceStatus).toBe("CONSULTABLE");
      expect(Number(unitsResult.records[0].saldoAdesoes)).toBe(350);
      expect(Number(unitsResult.records[1].saldoAdesoes)).toBe(150);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

