import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchOfficialCatalog, validateOfficialCode } from "@/modules/coverage/official-catalog";
import { clearComprasGovCache } from "@/modules/connectors/compras-gov/http";

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Official Catalog Facade - Business Logic", () => {
  beforeEach(() => {
    clearComprasGovCache();
  });

  it("returns UNSUPPORTED envelope for CATSER", async () => {
    const results = await searchOfficialCatalog("serviço", "CATSER");
    expect(results).toHaveLength(1);
    expect(results[0].catalogType).toBe("CATSER");
    expect(results[0].status).toBe("UNSUPPORTED");
    expect(results[0].error).toContain("when supported by the current integration");
  });

  it("performs CATMAT query successfully when API returns records", async () => {
    const mockCatalogItem = {
      codigoItem: 123456,
      descricaoItem: "COPO DESCARTAVEL 200ML",
      codigoGrupo: "73",
      codigoClasse: "7350",
      codigoPdm: "1111",
      statusItem: true,
      dataHoraInclusao: "2025-01-01T10:00:00Z",
    };

    const mockFetch = vi.fn().mockResolvedValue(
      responseJson({
        resultado: [mockCatalogItem],
        totalRegistros: 1,
        totalPaginas: 1,
        paginasRestantes: 0,
      })
    );

    const results = await searchOfficialCatalog("copo", "CATMAT", mockFetch as any);

    expect(results).toHaveLength(1);
    expect(results[0].catalogType).toBe("CATMAT");
    expect(results[0].externalCode).toBe("123456");
    expect(results[0].description).toBe("COPO DESCARTAVEL 200ML");
    expect(results[0].status).toBe("LIVE_OK");
  });

  it("handles CATMAT query failures correctly with explicit error wrapper", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Timeout/Connection error"));

    await expect(
      searchOfficialCatalog("copo", "CATMAT", mockFetch as any)
    ).rejects.toThrow("when supported by the current integration");
  });

  it("returns both CATSER unsupported and CATMAT results in AMBOS mode", async () => {
    const mockCatalogItem = {
      codigoItem: 654321,
      descricaoItem: "BOTA DE SEGURANCA COURO",
      codigoGrupo: "84",
      codigoClasse: "8415",
      statusItem: true,
    };

    const mockFetch = vi.fn().mockResolvedValue(
      responseJson({
        resultado: [mockCatalogItem],
        totalRegistros: 1,
        totalPaginas: 1,
        paginasRestantes: 0,
      })
    );

    const results = await searchOfficialCatalog("bota", "AMBOS", mockFetch as any);

    expect(results).toHaveLength(2);
    // First result should be CATSER unsupported
    expect(results[0].catalogType).toBe("CATSER");
    expect(results[0].status).toBe("UNSUPPORTED");
    expect(results[0].error).toContain("when supported by the current integration");

    // Second result should be CATMAT live result
    expect(results[1].catalogType).toBe("CATMAT");
    expect(results[1].externalCode).toBe("654321");
    expect(results[1].status).toBe("LIVE_OK");
  });

  it("returns CATSER unsupported in validateOfficialCode", async () => {
    const result = await validateOfficialCode("CATSER", "123");
    expect(result.catalogType).toBe("CATSER");
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.error).toContain("when supported by the current integration");
  });

  it("validates CATMAT code successfully when found", async () => {
    const mockCatalogItem = {
      codigoItem: 999888,
      descricaoItem: "CANETA ESFEROGRAFICA AZUL",
      statusItem: true,
    };

    const mockFetch = vi.fn().mockResolvedValue(
      responseJson({
        resultado: [mockCatalogItem],
        totalRegistros: 1,
      })
    );

    const result = await validateOfficialCode("CATMAT", "999888", mockFetch as any);

    expect(result.catalogType).toBe("CATMAT");
    expect(result.externalCode).toBe("999888");
    expect(result.status).toBe("LIVE_OK");
  });

  it("throws honest error if code is not found in validateOfficialCode", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      responseJson({
        resultado: [],
        totalRegistros: 0,
      })
    );

    await expect(
      validateOfficialCode("CATMAT", "999888", mockFetch as any)
    ).rejects.toThrow("não encontrado na base oficial");
  });
});
