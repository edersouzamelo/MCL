import { describe, expect, it } from "vitest";
import { buildArpSearchPayload, classifyArpSearchResponse } from "@/modules/coverage/arp-client";
import type { ItemCatalogMapping } from "@/modules/domain/types";

function mapping(): ItemCatalogMapping {
  return {
    id: "mapping-calca-120-default",
    mclItemId: "item-calca",
    mclVariantId: "variant-calca-42",
    needId: "need-calca-120",
    externalCatalog: "CATMAT",
    externalItemCode: "452757",
    externalDescription: "BOTA SEGURANCA",
    groupCode: "84",
    classCode: "8430",
    pdmCode: "1415",
    confirmedBy: "user-demo-admin",
    confirmedAt: "2026-07-02T10:00:00.000Z",
    justification: "Confirmacao humana demonstrativa.",
    status: "ACTIVE",
    confidence: 0.85,
    mappingVersion: 1,
  };
}

describe("ARP client helpers", () => {
  it("monta payload com needId, analysisId, catalogMappingId, catmatCode e requestId", () => {
    const result = buildArpSearchPayload({
      needId: "need-calca-120",
      analysisId: "analysis-need-calca-120",
      mapping: mapping(),
      dateStart: "2026-01-01",
      dateEnd: "2026-12-31",
      requestId: "req-ui-1",
    });

    expect(result).toMatchObject({
      needId: "need-calca-120",
      analysisId: "analysis-need-calca-120",
      catalogMappingId: "mapping-calca-120-default",
      catmatCode: "452757",
      dateStart: "2026-01-01",
      dateEnd: "2026-12-31",
      requestId: "req-ui-1",
    });
    expect(result.dataVigenciaInicialMin).toBe("2026-01-01");
    expect(result.dataVigenciaInicialMax).toBe("2026-12-31");
  });

  it("classifica timeout como estado TIMEOUT e encerra loading", () => {
    const outcome = classifyArpSearchResponse(
      false,
      {
        ok: false,
        stage: "ARP_SEARCH_FAILED",
        requestId: "req-timeout",
        code: "TIMEOUT",
        message: "Tempo limite atingido.",
        retryable: true,
      },
      "452757",
    );

    expect(outcome.status).toBe("TIMEOUT");
    expect(outcome.entries).toEqual([]);
    expect(outcome.error).toContain("Tempo limite");
  });

  it("classifica resposta vazia como EMPTY", () => {
    const outcome = classifyArpSearchResponse(
      true,
      {
        ok: true,
        stage: "ARP_SEARCH_EMPTY",
        requestId: "req-empty",
        catmatCode: "452757",
        count: 0,
        items: [],
      },
      "452757",
    );

    expect(outcome.status).toBe("EMPTY");
    expect(outcome.message).toContain("CATMAT 452757");
    expect(outcome.entries).toHaveLength(0);
  });

  it("classifica atas retornadas como COMPLETED", () => {
    const entry = {
      instrument: {
        id: "instrument-1",
        persistentCode: "ARP-00015-2026",
        sourceSystem: "COMPRAS_GOV",
        sourceRecordId: "arp-item-1",
        sourceId: "ata-1",
        type: "ARP",
        reference: "00015/2026",
        supplierNameSynthetic: "FORNECEDOR TESTE",
        organizationId: "org-1",
        organizationCode: "201057",
        organizationName: "Unidade Teste",
        supplierName: "Fornecedor Teste",
        itemCode: "452757",
        itemDescription: "BOTA SEGURANCA",
        quantity: 120,
        capacity: 240,
        unitValue: 438,
        totalValue: 52560,
        validFrom: "2026-03-26T00:00:00.000Z",
        validUntil: "2027-03-26T00:00:00.000Z",
        status: "VIGENTE",
        externalReference: "pncp-ata-1",
        lastSourceUpdateAt: "2026-03-26T00:00:00.000Z",
      },
      unitQuery: {
        numeroAta: "00015/2026",
        unidadeGerenciadora: "201057",
        numeroItem: "00020",
      },
      raw: {} as never,
      sourceUrl: "https://dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem",
    };

    const outcome = classifyArpSearchResponse(
      true,
      {
        ok: true,
        stage: "ARP_SEARCH_COMPLETED",
        requestId: "req-done",
        catmatCode: "452757",
        count: 1,
        items: [entry],
      },
      "452757",
    );

    expect(outcome.status).toBe("COMPLETED");
    expect(outcome.entries).toHaveLength(1);
    expect(outcome.message).toContain("encontradas: 1");
  });
});
