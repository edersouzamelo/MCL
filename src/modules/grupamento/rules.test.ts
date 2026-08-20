import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { classifySagRows } from "@/modules/grupamento/classification";
import { parseSagRuleWorkbook } from "@/modules/grupamento/rules";
import { computeSagSnapshot, type SagRow } from "@/modules/grupamento/sag";

function workbookBuffer() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Classes", "", "PI"],
    ["I", "QS", "E6TESTEQS1,E6TESTEQS2"],
    ["", "Reserva", "E6TESTERR1"],
    ["II", "Intendência", "E6TESTEIN1,E6TESTERR1"],
    ["III", "Pendente", "???"],
    [],
    ["EXECUÇÃO ORÇAMENTÁRIA LOGÍSTICA"],
    ["Slide 21 - QUANTITATIVO DE SUBSISTÊNCIA ( E6TESTEQS1 E6TESTEQS2 )"],
    ["Slide 22 - ORÇAMENTO GERAL PI (Todos os Es + OCS70003000)"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Algoritmo");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function row(pi: string, total: number): SagRow {
  const financial = { available: total * 0.2, toLiquidate: total * 0.3, inLiquidation: 0, liquidated: total * 0.1, paid: total * 0.4 };
  return {
    sheet: "Gerencial",
    pi,
    ...financial,
    computed: computeSagSnapshot(financial),
    percentDivergence: false,
  };
}

describe("SAG imported rule matrix", () => {
  it("reads Classes/PI rules, pending rows, briefing definitions and duplicate PI conflicts", () => {
    const rules = parseSagRuleWorkbook(workbookBuffer(), "algoritmo-test.xlsx");

    expect(rules.groups).toHaveLength(4);
    expect(rules.groups.find((group) => group.subgroup === "Pendente")?.status).toBe("PENDENTE");
    expect(rules.briefingRules).toHaveLength(2);
    expect(rules.briefingRules[1].includeAllEPrefix).toBe(true);
    expect(rules.conflicts).toEqual([
      expect.objectContaining({ pi: "E6TESTERR1" }),
    ]);
    expect(rules.warnings.some((warning) => warning.includes("PI não definido"))).toBe(true);
  });

  it("classifies exact PI only and deduplicates a conflicted row inside each class total", () => {
    const rules = parseSagRuleWorkbook(workbookBuffer(), "algoritmo-test.xlsx");
    const result = classifySagRows(
      [row("E6TESTEQS1", 100), row("E6TESTERR1", 200), row("E6SEMREGRA", 300), { ...row("E6NOID", 50), pi: undefined }],
      rules,
    );

    expect(result.classes.find((item) => item.className === "I")?.snapshot.total).toBe(300);
    expect(result.classes.find((item) => item.className === "II")?.snapshot.total).toBe(200);
    expect(result.conflictedRows).toBe(1);
    expect(result.unclassifiedRows).toBe(1);
    expect(result.rowsWithoutPiCode).toBe(1);
  });
});
