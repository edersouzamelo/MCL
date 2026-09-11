import { describe, expect, it } from "vitest";
import { projectTgOperational } from "@/modules/credits-tg/projection";
import type { TgRow } from "@/modules/credits-tg/parser";

const row = (partial: Partial<TgRow>): TgRow => ({
  id: "r", sheet: "160136", sourceRow: 1, ug: "160136", om: "OM", pi: "PI-A",
  piDescription: "Descrição", ne: null, year: null, supplier: null, nd: "33903023",
  ndDescription: "Uniformes", movementCents: 100, level: "PI_SUMMARY", piExplicit: true,
  neExplicit: false, ...partial,
});

describe("projeção operacional do mestre TG", () => {
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
});
