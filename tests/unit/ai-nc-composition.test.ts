import { describe, expect, it } from "vitest";
import { projectTgNcComposition } from "@/modules/ai/silos";
import type { TgDashboardProjection } from "@/modules/credits-tg/repository";

function nc(ug: string, nc: string, pi: string, nd: string, received: number, updated: number, reported: number) {
  return {
    id: ug + "|" + nc + "|" + pi + "|" + nd, ug, om: ug === "160136" ? "Cmdo 9 Gpt Log" : "9 B Sup",
    nc, date: "2026-09-11", action: "Ação", ro: "—", purpose: "Suprimento",
    pi, nd, provisionReceivedCents: received, provisionGrantedCents: 0,
    provisionUpdatedCents: updated, availableCreditCents: reported,
  };
}
function ne(ug: string, amount: number) {
  return {
    id: ug + "|2026NE000001", ug, om: "Cmdo 9 Gpt Log", ne: "2026NE000001",
    year: "2026", date: "2026-09-11", supplier: "Fornecedor",
    pi: "BIDS", nd: "339030", ndDescription: "Material",
    description: "Despesa", processNumber: "1", biddingModality: "Pregão",
    committedCents: amount, committedToLiquidateCents: amount,
    liquidatedCents: 0, liquidatedToPayCents: 0, paidCents: 0,
  };
}

function projection() {
  return {
    projectionVersion: 2,
    snapshot: {
      fileName: "TG_REAL_IMPORTADO.xlsx", importedAt: "2026-09-11T22:21:09.000Z",
      rowCount: 250, checksum: "digest", schema: "TG_MASTER_V2",
    },
    operational: {
      ugOptions: [
        { ug: "160136", om: "Cmdo 9 Gpt Log" },
        { ug: "160142", om: "9 B Sup" },
      ],
      ncMovements: [
        nc("160136", "2026NC000001", "BIDS", "339030", 50000, 50000, 30000),
        nc("160136", "2026NC000001", "BIDS", "339039", 20000, 20000, 12000),
        nc("160136", "2026NC000002", "BIDES", "339030", 30000, 30000, 13000),
        nc("160142", "2026NC000003", "BIDES", "339030", 100000, 100000, 80000),
      ],
      neExecution: [ne("160136", 45000), ne("160142", 20000)],
      rpnpMovements: [],
    },
  } as unknown as TgDashboardProjection;
}

describe("Detalhamento TG de Notas de Crédito", () => {
  it("identifica NC reais e reconcilia provisão menos empenho sem rateio falso", () => {
    const answer = projectTgNcComposition(projection(), { ug: "160136" });
    expect(answer.filters.matchedUgs.map((item) => item.ug)).toEqual(["160136"]);
    expect(answer.totalDocuments).toBe(2);
    expect(answer.documents[0].nc).toBe("2026NC000001");
    expect(answer.documents[0].provisionUpdatedCents).toBe(70000);
    expect(answer.documents[0].nds).toEqual(["339030", "339039"]);
    expect(answer.totals.provisionUpdatedCents).toBe(100000);
    expect(answer.totals.committedCents).toBe(45000);
    expect(answer.totals.availableCreditCents).toBe(55000);
    expect(answer.documents.reduce((s, row) => s + row.provisionUpdatedCents, 0)).toBe(100000);
    expect(answer.notes.join(" ")).toContain("não é calculado");
  });

  it("filtro ND é aplicado tanto à provisão como aos empenhos", () => {
    const answer = projectTgNcComposition(projection(), { ug: "160136", nd: "339039" });
    expect(answer.documents.map((row) => row.nc)).toEqual(["2026NC000001"]);
    expect(answer.totals.provisionUpdatedCents).toBe(20000);
    expect(answer.totals.committedCents).toBe(0);
    expect(answer.totals.availableCreditCents).toBe(20000);
  });

  it("não devolve notas de outra UG quando há filtro da OM", () => {
    const answer = projectTgNcComposition(projection(), { ug: "160136" });
    expect(answer.documents.some((row) => row.ug === "160142")).toBe(false);
    const missing = projectTgNcComposition(projection(), { ug: "167777" });
    expect(missing.documents).toEqual([]);
    expect(missing.filters.matchedUgs).toEqual([]);
  });

  it("paginador informa que parte da lista não foi mostrada sem omitir o total", () => {
    const answer = projectTgNcComposition(projection(), { ug: "160136" }, 1);
    expect(answer.totalDocuments).toBe(2);
    expect(answer.shownDocuments).toBe(1);
    expect(answer.documents).toHaveLength(1);
  });
});
