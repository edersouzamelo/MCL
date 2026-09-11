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
  it("reconhece o contrato V2 com Item Informação, NC e metadados orçamentários", () => {
    const headers = Array<unknown>(50).fill(null);
    Object.assign(headers, { 0: "UG Executora", 2: "PI", 4: "Ação Governo", 6: "Fonte Recursos", 8: "UGR - Gestão", 10: "PTRES", 11: "Item Informação", 13: "Natureza Despesa Detalhada", 15: "NE CCor", 28: "NC", 49: "Movim. Líquido - R$ (Item Informação)" });
    const data = Array<unknown>(50).fill(null);
    Object.assign(data, { 0: "160136", 1: "COMANDO", 2: "PI-A", 4: "4269", 6: "000", 8: "00001", 10: "123456", 11: "91", 12: "MOVIMENTACAO LIQ. CREDITOS", 13: "33903001", 28: "160136000012026NC000001", 29: "FINALIDADE", 35: "01/09/2026", 45: 999, 49: 123.45 });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["relatório"], [], headers, data]), "Mestre");
    const report = parseTgWorkbook(XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer, "v2.xlsx");
    expect(report.schema).toBe("TG_MASTER_V2");
    expect(report.rows[0]).toMatchObject({ ug: "160136", itemCode: "91", nc: "160136000012026NC000001", action: "4269", fundingSource: "000", responsibleUg: "00001", ptres: "123456", movementCents: 12345, documentValueCents: 99900 });
  });

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
    expect(result.parserVersion).toBe(3);
    expect(result.sourceDate).toBeNull();
    expect(result.rows[0]).not.toHaveProperty("availableBalance");
    expect(result.rows[0].nc).toBeNull();
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
