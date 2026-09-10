import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseTgWorkbook } from "@/modules/credits-tg/parser";
function fixture(value: unknown = -12.34) {
  const workbook = XLSX.utils.book_new();
  for (const ug of ["100001", "100002"]) {
    const sheet = XLSX.utils.aoa_to_sheet([
      [`UG Executora: ${ug}:UNIDADE DE TESTE`],
      ["PI", null, "NE CCor", "NE CCor - Ano Emissão", "NE CCor - Favorecido", null, "Natureza Despesa Detalhada", null, "Movim. Líquido - R$ (Item Informação)"],
      ["PI-TESTE", "Descrição", "2026NE000001", "2026", "teste", "Favorecido teste", "33903001", "Descrição ND", value],
      [null, null, "2026NE000002", "2026", "teste", "Favorecido teste", "33903002", "Outra ND", 0],
    ]);
    sheet["!merges"] = [{ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }];
    XLSX.utils.book_append_sheet(workbook, sheet, ug);
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
describe("contrato mestre TG", () => {
  it("lê todas as UGs, preserva sinais e recompõe a hierarquia suprimida pelo TG", () => {
    const result = parseTgWorkbook(fixture(), "fonte.xlsx");
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0].movementCents).toBe(-1234);
    expect(result.rows[1]).toMatchObject({
      pi: "PI-TESTE", piDescription: "Descrição", ne: "2026NE000002",
      year: "2026", supplier: "Favorecido teste", level: "NE_DETAIL",
      piExplicit: false, neExplicit: true, movementCents: 0,
    });
    expect(new Set(result.rows.map(row => row.ug)).size).toBe(2);
    expect(result.parserVersion).toBe(2);
    expect(result.sourceDate).toBeNull();
    expect(result.rows[0]).not.toHaveProperty("availableBalance");
    expect(result.rows[0]).not.toHaveProperty("nc");
  });
  it("herda PI e NE em linhas detalhadas e limpa a NE quando começa outro PI", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["UG Executora: 100001:UNIDADE DE TESTE"],
      ["PI", null, "NE CCor", "NE CCor - Ano Emissão", "NE CCor - Favorecido", null, "Natureza Despesa Detalhada", null, "Movim. Líquido - R$ (Item Informação)"],
      ["PI-A", "Descrição A", "2026NE000001", "2026", "teste", "Favorecido A", "33903001", "ND 1", 10],
      [null, null, null, null, null, null, "33903002", "ND 2", 20],
      ["PI-B", "Descrição B", "'-9", "'-9", "'-9", "NAO SE APLICA", "339039-9", "NAO SE APLICA", 30],
      [null, null, null, null, null, null, "33903916", "ND 3", 40],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "100001");
    const report = parseTgWorkbook(XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer, "fonte.xlsx");
    expect(report.rows[1]).toMatchObject({ pi: "PI-A", ne: "2026NE000001", year: "2026", supplier: "Favorecido A", level: "NE_DETAIL", neExplicit: false });
    expect(report.rows[2]).toMatchObject({ pi: "PI-B", ne: null, year: null, supplier: null, level: "PI_SUMMARY" });
    expect(report.rows[3]).toMatchObject({ pi: "PI-B", ne: null, level: "PI_SUMMARY", piExplicit: false });
  });
  it("rejeita valor ausente ou textual sem convertê-lo em zero", () => {
    expect(() => parseTgWorkbook(fixture("não informado"), "fonte.xlsx")).toThrow("valor monetário inválido");
  });
});
