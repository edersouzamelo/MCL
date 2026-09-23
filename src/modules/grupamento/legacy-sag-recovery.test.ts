import { describe, expect, it } from "vitest";
import { recoverLegacySagPair } from "@/modules/grupamento/legacy-sag-recovery";

describe("legacy SAG browser recovery", () => {
  it("rebuilds deterministic SAG and RPNP aggregates instead of trusting stored totals", () => {
    const recovered = recoverLegacySagPair({
      current: {
        source: { fileName: "corrente.pdf", importedAt: "2026-08-20T12:00:00.000Z", origin: "MANUAL_SAG", nature: "DADO_IMPORTADO" },
        sheets: ["PDF página 1"],
        rows: [{
          sheet: "PDF página 1", ug: "160136", acronym: "CMDO", pi: "A1", piName: "Classe teste",
          available: 100, toLiquidate: 20, inLiquidation: 10, liquidated: 30, paid: 40,
          reportedCommittedPercent: 50, reportedLiquidatedPercent: 35,
          computed: { total: 999999 }, percentDivergence: true,
        }],
        totals: { total: 999999 },
        byPi: [],
        byUg: [],
        warnings: [],
      },
      rpn: {
        source: { fileName: "rpn.pdf", importedAt: "2026-08-20T12:01:00.000Z", origin: "MANUAL_RPNP", nature: "DADO_IMPORTADO" },
        sheets: ["PDF página 1"],
        rows: [{
          sheet: "PDF página 1", ug: "160136", acronym: "CMDO", pi: "A1", piName: "Classe teste",
          toLiquidate: 60, liquidated: 30, cancelled: 10,
          reportedInscribed: 100, reportedLiquidatedPercent: 30, reportedCancelledPercent: 10,
          computed: { inscribed: 999999 }, valueDivergence: true,
        }],
        totals: { inscribed: 999999 },
        byPi: [],
        byUg: [],
        warnings: [],
      },
    });

    expect(recovered.current.totals.total).toBe(200);
    expect(recovered.current.totals.committedPercent).toBe(50);
    expect(recovered.current.totals.liquidatedPercent).toBe(35);
    expect(recovered.current.byUg[0].ug).toBe("160136");
    expect(recovered.current.byPi[0].pi).toBe("A1");

    expect(recovered.rpn.totals.inscribed).toBe(100);
    expect(recovered.rpn.totals.liquidatedPercent).toBe(30);
    expect(recovered.rpn.totals.cancelledPercent).toBe(10);
    expect(recovered.rpn.byUg[0].ug).toBe("160136");
    expect(recovered.rpn.byPi[0].pi).toBe("A1");

    expect(recovered.current.source.importedAt).toBe("2026-08-20T12:00:00.000Z");
    expect(recovered.current.warnings.at(-1)).toContain("armazenamento local legado");
    expect(recovered.rpn.warnings.at(-1)).toContain("arquivo-fonte não foi relido");
  });

  it("rejects an incomplete legacy pair", () => {
    expect(() => recoverLegacySagPair({ current: {}, rpn: {} })).toThrow();
  });
});
