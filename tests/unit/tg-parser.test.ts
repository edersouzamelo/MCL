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
  it("lê todas as UGs, preserva sinais e só propaga células realmente mescladas", () => {
    const result = parseTgWorkbook(fixture(), "fonte.xlsx");
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0].movementCents).toBe(-1234);
    expect(result.rows[1]).toMatchObject({ pi: "PI-TESTE", piDescription: null, movementCents: 0 });
    expect(new Set(result.rows.map(row => row.ug)).size).toBe(2);
    expect(result.sourceDate).toBeNull();
    expect(result.rows[0]).not.toHaveProperty("availableBalance");
    expect(result.rows[0]).not.toHaveProperty("nc");
  });
  it("rejeita valor ausente ou textual sem convertê-lo em zero", () => {
    expect(() => parseTgWorkbook(fixture("não informado"), "fonte.xlsx")).toThrow("valor monetário inválido");
  });
});
