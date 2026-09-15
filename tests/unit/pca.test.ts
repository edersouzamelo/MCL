import { describe, expect, it } from "vitest";
import { fetchPncpPcaByUasg, normalizePncpPcaRecord } from "@/modules/pca/pncp-client";
import { suggestPcaUnits } from "@/modules/pca/unit-suggestions";

describe("PCA do PNCP", () => {
  it("normaliza campos oficiais sem fabricar valores ausentes", () => {
    const item = normalizePncpPcaRecord({
      numeroControlePNCPPca: "12345678000100-0-000001/2026",
      numeroItem: 7,
      codigoItem: "123456",
      descricaoItem: "Coturno operacional",
      quantidadeEstimada: 100,
      valorTotal: 25000,
      dataEstimadaContratacao: "2026-10-15",
    }, 0);

    expect(item.pncpItemId).toContain("Coturno operacional");
    expect(item.catalogCode).toBe("123456");
    expect(item.estimatedQuantity).toBe(100);
    expect(item.unit).toBeNull();
  });

  it("prioriza a UASG do usuário e depois suas subordinadas", () => {
    const units = suggestPcaUnits([
      { id: "gpt", name: "Cmdo 9º Gpt Log", uasg: "160136", type: "ENQUADRANTE", superiorUasg: null },
      { id: "bsup", name: "9º B Sup", uasg: "160142", type: "SUBORDINADA", superiorUasg: "160136" },
      { id: "outra", name: "Outra OM", uasg: "160999", type: "SUBORDINADA", superiorUasg: "160001" },
    ], "160136");
    expect(units[0]).toMatchObject({ uasg: "160136", reason: "USER_ORGANIZATION", suggested: true });
    expect(units.filter((unit) => unit.reason === "SUBORDINATE").length).toBeGreaterThan(0);
    expect(units.findIndex((unit) => unit.reason === "OTHER")).toBeGreaterThan(
      units.findIndex((unit) => unit.reason === "SUBORDINATE"),
    );
  });

  it("recusa consulta por UASG sem o CNPJ obrigatório do órgão", async () => {
    await expect(fetchPncpPcaByUasg({ year: 2026, uasg: "160136" }))
      .rejects.toThrow("O PNCP exige o CNPJ do órgão");
  });

  it("extrai os itens aninhados do PCA retornado pelo PNCP", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => new Response(JSON.stringify({
      data: [{
        anoPca: 2026,
        idPcaPncp: "09549370000157-0-000001/2026",
        codigoUnidade: "160136",
        itens: [{ numeroItem: 7, codigoItem: "123456", descricaoItem: "Coturno operacional" }],
      }],
      totalPaginas: 1,
    }))) as typeof fetch;
    try {
      const records = await fetchPncpPcaByUasg({ year: 2026, uasg: "160136", cnpj: "09549370000157" });
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        numeroItem: 7,
        descricaoItem: "Coturno operacional",
        numeroControlePNCPPca: "09549370000157-0-000001/2026",
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
