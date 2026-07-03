import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoState } from "@/modules/demo/data";
import type { DemoState } from "@/modules/domain/types";
import { linkNeedToAcquisitionInstrument } from "@/modules/acquisitions/links";
import { clearComprasGovCache } from "@/modules/connectors/compras-gov/http";
import { runComprasGovSync, resetComprasGovSyncLockForTests } from "@/modules/connectors/compras-gov/sync";
import type { ComprasGovConfig } from "@/modules/connectors/compras-gov/config";

function state(): DemoState {
  return JSON.parse(JSON.stringify(createDemoState())) as DemoState;
}

function config(overrides: Partial<ComprasGovConfig> = {}): ComprasGovConfig {
  return {
    baseUrl: "https://compras.test",
    syncEnabled: true,
    pageSize: 2,
    requestTimeoutMs: 1000,
    cacheTtlSeconds: 0,
    maxPages: 2,
    retryAttempts: 0,
    rateLimitMs: 0,
    filters: {
      dateStart: "2026-01-01",
      dateEnd: "2026-12-31",
      unitCode: undefined,
      catmatCode: "485523",
      modalityCode: undefined,
      situation: undefined,
      keyword: undefined,
    },
    ...overrides,
  };
}

function arpItem(overrides: Record<string, unknown> = {}) {
  return {
    numeroAtaRegistroPreco: "00067/2025",
    codigoUnidadeGerenciadora: "257023",
    numeroCompra: "90006",
    anoCompra: "2025",
    codigoModalidadeCompra: "05",
    dataAssinatura: "2025-11-25T00:00:00",
    dataVigenciaInicial: "2026-01-01",
    dataVigenciaFinal: "2026-12-01",
    numeroItem: "00010",
    codigoItem: 485523,
    descricaoItem: "DISPOSITIVO P/ MEDIDAS ANTROPOMETRICAS",
    tipoItem: "Material",
    quantidadeHomologadaItem: 105,
    classificacaoFornecedor: "001",
    niFornecedor: "09376051000197",
    nomeRazaoSocialFornecedor: "ONIX COMERCIO DE PRODUTOS ODONTOLOGICOS LTDA",
    quantidadeHomologadaVencedor: 105,
    valorUnitario: 11.8,
    valorTotal: 1239,
    maximoAdesao: 210,
    nomeUnidadeGerenciadora: "DISTRITO SANIT.ESP.INDIGENA AL/SE",
    nomeModalidadeCompra: "Pregao",
    idCompra: "25702305900062025",
    numeroControlePncpCompra: "00394544000185-1-001959/2025",
    dataHoraInclusao: "2025-11-28T09:58:14",
    dataHoraAtualizacao: "2025-11-28T09:58:14",
    quantidadeEmpenhada: 0,
    percentualMaiorDesconto: 0,
    situacaoSicaf: "1",
    dataHoraExclusao: null,
    itemExcluido: false,
    numeroControlePncpAta: "00394544000185-1-001959/2025-000007",
    codigoPdm: 2626,
    nomePdm: "DISPOSITIVO P/ MEDIDAS ANTROPOMETRICAS",
    ...overrides,
  };
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sync(demo: DemoState, fetchImpl: typeof fetch, cfg = config()) {
  return runComprasGovSync(demo, {
    actorId: "user-demo-admin",
    organizationId: "org-provedor-alfa",
    config: cfg,
    fetchImpl,
  });
}

beforeEach(() => {
  resetComprasGovSyncLockForTests();
  clearComprasGovCache();
});

describe("conector Compras.gov.br", () => {
  it("pagina e transforma ARP Item em staging e instrumento canonico", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));

    expect(run.status).toBe("SUCCESS");
    expect(run.recordsRead).toBe(1);
    expect(demo.externalRecords).toHaveLength(1);
    expect(demo.externalRecords[0].payloadHash).toHaveLength(64);
    expect(demo.acquisitionInstruments.some((instrument) => instrument.sourceSystem === "COMPRAS_GOV")).toBe(true);
    expect(demo.supplyItems.some((item) => item.persistentCode === "CATMAT-485523")).toBe(true);
    expect(demo.supplyItems.find((item) => item.persistentCode === "CATMAT-485523")?.supplyClass).toBe("EXTERNAL_UNMAPPED");
  });

  it("avanca paginas ate o limite local", async () => {
    const demo = state();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(responseJson({ resultado: [arpItem({ numeroItem: "00010" })], totalRegistros: 2, totalPaginas: 2, paginasRestantes: 1 }))
      .mockResolvedValueOnce(responseJson({ resultado: [arpItem({ numeroItem: "00011", codigoItem: 442512 })], totalRegistros: 2, totalPaginas: 2, paginasRestantes: 0 })) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl, config({ pageSize: 2, maxPages: 2 }));

    expect(run.recordsRead).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(demo.externalRecords).toHaveLength(2);
  });

  it("mantem idempotencia e marca duplicados por hash", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 })),
    ) as unknown as typeof fetch;

    await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));
    const second = await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));

    expect(second.duplicateRecords).toBe(1);
    expect(demo.externalRecords).toHaveLength(1);
  });

  it("atualiza registro quando o hash muda", async () => {
    const demo = state();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }))
      .mockResolvedValueOnce(responseJson({ resultado: [arpItem({ valorTotal: 1300 })], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 })) as unknown as typeof fetch;

    await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));
    const second = await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));

    expect(second.updatedRecords).toBe(1);
    expect(demo.externalRecords[0].processingStatus).toBe("UPDATED");
  });

  it("quarentena item invalido sem derrubar a aplicacao", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [{ numeroAtaRegistroPreco: "sem-campos" }], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));

    expect(run.status).toBe("SUCCESS");
    expect(run.rejectedRecords).toBe(1);
    expect(run.quarantinedRecords).toBe(1);
    expect(demo.quarantine[0].sourceSystem).toBe("COMPRAS_GOV");
  });

  it("falha controladamente quando a resposta externa e invalida", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(responseJson({ resultado: "invalido" })) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl);

    expect(run.status).toBe("FAILED");
    expect(demo.connectors.find((connector) => connector.id === "compras-gov")?.status).toBe("FALHA");
  });

  it("continua disponivel quando a API externa esta fora do ar", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(responseJson({ erro: "fora" }, 503)) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl);

    expect(run.status).toBe("FAILED");
    expect(demo.needs.length).toBeGreaterThan(0);
  });

  it("registra timeout como falha de execucao", async () => {
    const demo = state();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    ) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl, config({ requestTimeoutMs: 1 }));

    expect(run.status).toBe("FAILED");
    expect(run.message).toContain("Tempo limite");
  });

  it("bloqueia sincronizacoes simultaneas", async () => {
    const demo = state();
    let resolveFetch: (response: Response) => void = () => undefined;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;

    const first = sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));
    await expect(sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }))).rejects.toThrow("em andamento");
    resolveFetch(responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }));
    await first;
  });

  it("processa resposta vazia sem erro", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(responseJson({ resultado: [], totalRegistros: 0, totalPaginas: 0, paginasRestantes: 0 })) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl);

    expect(run.status).toBe("SUCCESS");
    expect(run.recordsRead).toBe(0);
  });

  it("bloqueia sincronizacao generica sem CATMAT ou UASG", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;

    const run = await sync(demo, fetchImpl, config({ filters: { ...config().filters, catmatCode: undefined, unitCode: undefined } }));

    expect(run.status).toBe("SKIPPED");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(run.message).toContain("bloqueada");
  });

  it("vincula necessidade a instrumento publico com autorizacao e auditoria de duplicidade", async () => {
    const demo = state();
    const fetchImpl = vi.fn().mockResolvedValue(
      responseJson({ resultado: [arpItem()], totalRegistros: 1, totalPaginas: 1, paginasRestantes: 0 }),
    ) as unknown as typeof fetch;
    await sync(demo, fetchImpl, config({ pageSize: 1, maxPages: 1 }));
    const instrument = demo.acquisitionInstruments.find((candidate) => candidate.sourceSystem === "COMPRAS_GOV")!;

    const first = linkNeedToAcquisitionInstrument(
      demo,
      {
        needId: "need-coturno-200",
        acquisitionInstrumentId: instrument.id,
        justification: "Avaliacao humana demonstrativa para possivel atendimento por ARP publica.",
        confidence: 0.65,
      },
      ["LOGISTICS_MANAGER"],
      "user-demo-admin",
    );
    const second = linkNeedToAcquisitionInstrument(
      demo,
      {
        needId: "need-coturno-200",
        acquisitionInstrumentId: instrument.id,
        justification: "Avaliacao humana demonstrativa para possivel atendimento por ARP publica.",
        confidence: 0.65,
      },
      ["LOGISTICS_MANAGER"],
      "user-demo-admin",
    );

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(first.link.relationType).toBe("PODE_SER_ATENDIDA_POR");
  });

  it("nega vinculo manual sem papel logistico", () => {
    const demo = state();

    expect(() =>
      linkNeedToAcquisitionInstrument(
        demo,
        {
          needId: "need-coturno-200",
          acquisitionInstrumentId: "instrument-001",
          justification: "Tentativa sem permissao logistica suficiente.",
          confidence: 0.4,
        },
        ["READ_ONLY"],
        "user-demo-viewer",
      ),
    ).toThrow("LOGISTICS_MANAGER");
  });
});
