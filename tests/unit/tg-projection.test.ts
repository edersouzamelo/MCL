import { describe, expect, it } from "vitest";
import { projectTgOperational } from "@/modules/credits-tg/projection";
import type { TgRow } from "@/modules/credits-tg/parser";

const row = (partial: Partial<TgRow>): TgRow => ({
  id: "r", sheet: "160136", sourceRow: 1, ug: "160136", om: "OM", pi: "PI-A",
  piDescription: "Descrição", ne: null, year: null, supplier: null, nd: "33903023",
  ndDescription: "Uniformes", movementCents: 100, level: "PI_SUMMARY", piExplicit: true,
  neExplicit: false, ...partial,
} as TgRow);

describe("projeção operacional do mestre TG", () => {
  it("calcula indicadores pelo Item Informação sem usar o valor documental", () => {
    const rows = [
      row({ id: "provision", itemCode: "91", movementCents: 100_00, documentValueCents: 999_00 }),
      row({ id: "committed", itemCode: "29", movementCents: 60_00 }),
      row({ id: "available", itemCode: "19", movementCents: 40_00 }),
      row({ id: "liquidated", itemCode: "31", movementCents: 20_00 }),
      row({ id: "to-liquidate", itemCode: "30", movementCents: 40_00 }),
    ];
    const result = projectTgOperational({ rows });
    expect(result.kpis).toMatchObject({ provisionUpdatedCents: 100_00, committedCents: 60_00, availableCreditCents: 40_00, liquidatedCents: 20_00, committedToLiquidateCents: 40_00, availableReconciliationCents: 0 });
  });

  it("separa PI/ND de NE e não soma linhas agregadoras", () => {
    const result = projectTgOperational({ rows: [
      row({ id: "pi", movementCents: 100 }),
      row({ id: "aggregate", nd: "339030-9", movementCents: 500 }),
      row({ id: "ne-2026", ne: "2026NE000001", year: "2026", movementCents: 40, level: "NE_DETAIL" }),
      row({ id: "ne-2025", ne: "2025NE000001", year: "2025", movementCents: 20, level: "NE_DETAIL" }),
    ] });
    expect(result.currentYear).toBe(2026);
    expect(result.piNdMovements.map(item => item.id)).toEqual(["pi"]);
    expect(result.neMovements.map(item => item.id)).toEqual(["ne-2026"]);
    expect(result.piNdMovementCents).toBe(100);
    expect(result.neMovementCents).toBe(40);
  });

  it("preserva os campos descritivos dos empenhos de RPNP na projeção compacta", () => {
    const result = projectTgOperational({ rows: [
      row({
        id: "rpnp", itemCode: "40", ne: "2025NE000001", year: "2025",
        supplier: "Fornecedor", neDescription: "Aquisição de coturno operacional",
        processNumber: "12345.000001/2025-00", biddingModality: "Pregão",
        movementCents: 500_00, level: "RPNP_DETAIL",
      }),
    ] });

    expect(result.rpnpMovements[0]).toMatchObject({
      ne: "2025NE000001",
      year: "2025",
      ndDescription: "Uniformes",
      description: "Aquisição de coturno operacional",
      processNumber: "12345.000001/2025-00",
      biddingModality: "Pregão",
    });
  });
});
