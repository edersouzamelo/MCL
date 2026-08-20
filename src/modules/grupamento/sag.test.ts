import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { computeSagSnapshot, parseSagNumber, parseSagWorkbook } from "@/modules/grupamento/sag";

describe("SAG deterministic calculations", () => {
  it("parses Brazilian monetary values and exported total labels", () => {
    expect(parseSagNumber("1.234.567,89")).toBeCloseTo(1234567.89, 2);
    expect(parseSagNumber("Σ Tela: 24.880.486,49")).toBeCloseTo(24880486.49, 2);
    expect(parseSagNumber("86.94%")).toBeCloseTo(86.94, 2);
  });

  it("computes commitment and liquidation without trusting spreadsheet percentages", () => {
    const snapshot = computeSagSnapshot({
      available: 20,
      toLiquidate: 30,
      inLiquidation: 10,
      liquidated: 15,
      paid: 25,
    });

    expect(snapshot.total).toBe(100);
    expect(snapshot.committed).toBe(80);
    expect(snapshot.liquidatedTotal).toBe(40);
    expect(snapshot.committedPercent).toBe(80);
    expect(snapshot.liquidatedPercent).toBe(40);
  });

  it("returns zero percentages for an empty financial snapshot", () => {
    const snapshot = computeSagSnapshot({
      available: 0,
      toLiquidate: 0,
      inLiquidation: 0,
      liquidated: 0,
      paid: 0,
    });

    expect(snapshot.total).toBe(0);
    expect(snapshot.committedPercent).toBe(0);
    expect(snapshot.liquidatedPercent).toBe(0);
  });

  it("reads a SAG-shaped workbook, skips the Tela footer and consolidates PI and UG", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["UG", "T_SIGLA", "PI", "NOME_PI", "DISPONIVEL", "A_LIQUIDAR", "EM_LIQUIDACAO", "LIQUIDADO", "PAGO", "%EMPENHADO", "%LIQUIDADO"],
      ["160001", "OM A", "E6TESTE001", "MATERIAL TESTE", "20,00", "30,00", "10,00", "15,00", "25,00", "80,00", "40,00"],
      ["160002", "OM B", "E6TESTE001", "MATERIAL TESTE", "10,00", "20,00", "0,00", "20,00", "50,00", "90,00", "70,00"],
      ["Todos", "", "", "", "Σ Tela: 30,00", "Σ Tela: 50,00", "Σ Tela: 10,00", "Σ Tela: 35,00", "Σ Tela: 75,00", "", ""],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gerencial Ano");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = parseSagWorkbook(buffer, "sag-test.xlsx");

    expect(result.rows).toHaveLength(2);
    expect(result.byPi).toHaveLength(1);
    expect(result.byUg).toHaveLength(2);
    expect(result.totals.total).toBe(200);
    expect(result.totals.available).toBe(30);
    expect(result.totals.committedPercent).toBe(85);
    expect(result.source.origin).toBe("MANUAL_SAG");
    expect(result.source.nature).toBe("DADO_IMPORTADO");
    expect(result.warnings).toEqual([]);
  });
});
