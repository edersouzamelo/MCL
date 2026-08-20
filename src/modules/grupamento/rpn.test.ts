import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { computeRpnSnapshot, parseRpnWorkbook } from "@/modules/grupamento/rpn";

describe("RPNP deterministic calculations", () => {
  it("computes inscribed, liquidated and cancelled percentages from financial states", () => {
    const snapshot = computeRpnSnapshot({ toLiquidate: 20, liquidated: 75, cancelled: 5 });
    expect(snapshot.inscribed).toBe(100);
    expect(snapshot.liquidatedPercent).toBe(75);
    expect(snapshot.cancelledPercent).toBe(5);
  });

  it("reads the SAG RPNP workbook contract and consolidates by PI and UG", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["UG", "NOME_UG", "PI", "NOME_PI", "TOTAL_INSCRITO", "TOTAL_A_LIQUIDAR", "TOTAL_LIQUIDADO", "CANC", "%LIQ", "%CANC"],
      ["160001", "OM A", "E6TESTE001", "MATERIAL A", "100,00", "20,00", "75,00", "5,00", "75,00%", "5,00%"],
      ["160002", "OM B", "E6TESTE001", "MATERIAL A", "50,00", "0,00", "50,00", "0,00", "100,00%", "0,00%"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RPNP");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = parseRpnWorkbook(buffer, "rpn-test.xlsx");
    expect(result.rows).toHaveLength(2);
    expect(result.byPi).toHaveLength(1);
    expect(result.byUg).toHaveLength(2);
    expect(result.totals.inscribed).toBe(150);
    expect(result.totals.toLiquidate).toBe(20);
    expect(result.totals.liquidated).toBe(125);
    expect(result.totals.cancelled).toBe(5);
    expect(result.source.origin).toBe("MANUAL_RPNP");
  });
});
