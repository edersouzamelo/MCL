import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("preserva números JSON com três casas decimais", () => {
    const item = normalizePncpPcaRecord({ valorUnitario: 0.535, valorTotal: 4530.816 }, 0);
    expect(item.estimatedUnitValue).toBe(0.535);
    expect(item.estimatedTotalValue).toBe(4530.816);
  });

  afterEach(() => vi.unstubAllGlobals());

  const officialItem = { numeroItem: 7, descricao: "Coturno operacional", codigoItem: "123456",
    codigoUnidade: "160136", cnpj: "00394452000103", anoPca: 2026, sequencialPca: 392 };

  it("consulta diretamente o plano da UASG e conserva a identidade do item", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ sequencialPlano: 392 }))
      .mockResolvedValueOnce(Response.json({ uasg: "160136", itens: [officialItem] }));
    vi.stubGlobal("fetch", fetchMock);
    const records = await fetchPncpPcaByUasg({ year: 2026, uasg: "160136", cnpj: "00394452000103" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/160136/2026/sequenciaisplano");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/2026/392/itens/plano");
    expect(records).toHaveLength(1);
    const normalized = normalizePncpPcaRecord(records[0], 0);
    expect(normalized.pncpItemId).toBe("00394452000103-0-000392/2026:7");
    expect(normalized.description).toBe("Coturno operacional");
  });

  it("recusa resposta incompleta em vez de apagar o banco local", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ sequencialPlano: 392 }))
      .mockResolvedValueOnce(Response.json({ uasg: "160136" })));
    await expect(fetchPncpPcaByUasg({ year: 2026, uasg: "160136", cnpj: "00394452000103" }))
      .rejects.toThrow("plano incompleto");
  });

  it("recusa itens de outra unidade", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ sequencialPlano: 392 }))
      .mockResolvedValueOnce(Response.json({ uasg: "160136", itens: [{ ...officialItem, codigoUnidade: "160999" }] })));
    await expect(fetchPncpPcaByUasg({ year: 2026, uasg: "160136", cnpj: "00394452000103" }))
      .rejects.toThrow("itens inconsistentes");
  });
});
