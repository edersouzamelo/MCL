import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseCurrentSagPositionedPages, parseRpnPositionedPages, type PositionedPage } from "@/modules/grupamento/pdf-sag";
import { mergeRpnImportResults, parseRpnWorkbook } from "@/modules/grupamento/rpn";
import { mergeSagImportResults, parseSagWorkbook } from "@/modules/grupamento/sag";
import { SAG_PI_FAMILIES, familyFieldName, validatePiFamilyRows } from "@/modules/grupamento/sag-family-batch";

function item(str: string, x: number, y: number) {
  return { str, x, y, width: 20, height: 8 };
}

function workbook(headers: string[], row: unknown[], sheetName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, row]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, worksheet, sheetName);
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("SAG family batch", () => {
  it("uses stable field names for the eight upload slots", () => {
    expect(SAG_PI_FAMILIES).toEqual(["E5", "E6", "E7", "D8"]);
    expect(familyFieldName("current", "E5")).toBe("current_E5");
    expect(familyFieldName("rpn", "D8")).toBe("rpn_D8");
  });

  it("rejects missing PI and PI from another family", () => {
    expect(validatePiFamilyRows([{ pi: "E5ABC001" }, { pi: "E5ABC002" }], "E5").valid).toBe(true);
    expect(validatePiFamilyRows([{ pi: undefined }], "E5")).toMatchObject({ valid: false, missingPi: 1 });
    expect(validatePiFamilyRows([{ pi: "E6ABC001" }], "E5")).toMatchObject({ valid: false, mismatched: ["E6ABC001"] });
  });

  it("accepts the PDF identity contract UASG + NOME UG + PI without requiring NOME PI", () => {
    const currentPage: PositionedPage = [
      item("UASG", 10, 800), item("NOME_UG", 70, 800), item("PI", 150, 800),
      item("DISPONIVEL", 400, 800), item("A_LIQUIDAR", 480, 800), item("EM_LIQUIDACAO", 560, 800),
      item("LIQUIDADO", 640, 800), item("PAGO", 720, 800),
      item("160001", 10, 760), item("OM A", 70, 760), item("E5TESTE001", 150, 760),
      item("20,00", 400, 760), item("30,00", 480, 760), item("10,00", 560, 760),
      item("15,00", 640, 760), item("25,00", 720, 760),
    ];
    const rpnPage: PositionedPage = [
      item("UASG", 10, 800), item("NOME_UG", 70, 800), item("PI", 150, 800),
      item("TOTAL_INSCRITO", 400, 800), item("TOTAL_A_LIQUIDAR", 500, 800), item("TOTAL_LIQUIDADO", 600, 800), item("CANC", 700, 800),
      item("160001", 10, 760), item("OM A", 70, 760), item("E5TESTE001", 150, 760),
      item("100,00", 400, 760), item("20,00", 500, 760), item("75,00", 600, 760), item("5,00", 700, 760),
    ];

    const current = parseCurrentSagPositionedPages([currentPage], "e5-corrente.pdf");
    const rpn = parseRpnPositionedPages([rpnPage], "e5-rpnp.pdf");

    expect(current.rows).toHaveLength(1);
    expect(current.rows[0]).toMatchObject({ ug: "160001", acronym: "OM A", pi: "E5TESTE001" });
    expect(rpn.rows).toHaveLength(1);
    expect(rpn.rows[0]).toMatchObject({ ug: "160001", acronym: "OM A", pi: "E5TESTE001" });
  });

  it("merges four family files and recalculates totals after concatenating rows", () => {
    const currentParts = SAG_PI_FAMILIES.map((family, index) =>
      parseSagWorkbook(
        workbook(
          ["UASG", "NOME_UG", "PI", "DISPONIVEL", "A_LIQUIDAR", "EM_LIQUIDACAO", "LIQUIDADO", "PAGO"],
          ["160001", "OM A", `${family}TESTE001`, "10,00", "20,00", "0,00", "30,00", `${40 + index},00`],
          family,
        ),
        `${family}-corrente.xlsx`,
      ),
    );
    const rpnParts = SAG_PI_FAMILIES.map((family) =>
      parseRpnWorkbook(
        workbook(
          ["UASG", "NOME_UG", "PI", "TOTAL_INSCRITO", "TOTAL_A_LIQUIDAR", "TOTAL_LIQUIDADO", "CANC"],
          ["160001", "OM A", `${family}TESTE001`, "100,00", "20,00", "75,00", "5,00"],
          family,
        ),
        `${family}-rpnp.xlsx`,
      ),
    );

    const current = mergeSagImportResults(
      currentParts,
      "Exercício Corrente · 4 PDFs",
      SAG_PI_FAMILIES.map((family, index) => ({ family, fileName: currentParts[index].source.fileName, rowCount: currentParts[index].rows.length })),
    );
    const rpn = mergeRpnImportResults(
      rpnParts,
      "RPNP · 4 PDFs",
      SAG_PI_FAMILIES.map((family, index) => ({ family, fileName: rpnParts[index].source.fileName, rowCount: rpnParts[index].rows.length })),
    );

    expect(current.rows).toHaveLength(4);
    expect(current.source.files).toHaveLength(4);
    expect(current.byPi).toHaveLength(4);
    expect(current.totals.available).toBe(40);
    expect(current.totals.total).toBe(406);

    expect(rpn.rows).toHaveLength(4);
    expect(rpn.source.files).toHaveLength(4);
    expect(rpn.byPi).toHaveLength(4);
    expect(rpn.totals.inscribed).toBe(400);
    expect(rpn.totals.toLiquidate).toBe(80);
  });
});
