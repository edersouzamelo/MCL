import { describe, expect, it } from "vitest";
import { parseCurrentSagPositionedPages, parseRpnPositionedPages, type PositionedPage } from "@/modules/grupamento/pdf-sag";

function item(str: string, x: number, y: number) {
  return { str, x, y, width: 20, height: 8 };
}

describe("SAG PDF coordinate reconstruction", () => {
  it("uses the PI column position instead of mistaking NOME UG codes such as CMD018 for PI", () => {
    const page: PositionedPage = [
      item("UASG", 10, 800), item("NOME_UG", 70, 800), item("PI", 150, 800),
      item("DISPONIVEL", 400, 800), item("A_LIQUIDAR", 480, 800), item("EM_LIQUIDACAO", 560, 800),
      item("LIQUIDADO", 640, 800), item("PAGO", 720, 800),
      item("160136", 10, 760), item("CMD018", 70, 760), item("E5MBPDRCOLU", 150, 760),
      item("10,00", 400, 760), item("20,00", 480, 760), item("0,00", 560, 760),
      item("30,00", 640, 760), item("40,00", 720, 760),
      item("160136", 10, 720), item("CMD013", 70, 720), item("E5ARPDRCOLU", 150, 720),
      item("5,00", 400, 720), item("10,00", 480, 720), item("0,00", 560, 720),
      item("15,00", 640, 720), item("20,00", 720, 720),
    ];

    const result = parseCurrentSagPositionedPages([page], "e5.pdf");

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.acronym)).toEqual(["CMD018", "CMD013"]);
    expect(result.rows.map((row) => row.pi)).toEqual(["E5MBPDRCOLU", "E5ARPDRCOLU"]);
  });

  it("accepts the SAG direct-export landscape layout as well as browser-print layout", () => {
    const page: PositionedPage = [
      item("UG", 12, 560), item("SIGLA", 90, 560), item("PI", 210, 560),
      item("DISPONIVEL", 330, 560), item("A_LIQUIDAR", 420, 560), item("EM_LIQUIDACAO", 510, 560),
      item("LIQUIDADO", 610, 560), item("PAGO", 690, 560), item("%EMP", 760, 560), item("%LIQ", 805, 560),
      item("160136", 12, 535), item("Cmdo 9º Gpt Log", 90, 535), item("E5MBPDRDEGE", 210, 535),
      item("259,19", 330, 535), item("47.004,24", 420, 535), item("0,00", 510, 535),
      item("0,00", 610, 535), item("7.575,00", 690, 535), item("99.53%", 760, 535), item("13.81%", 805, 535),
    ];

    const result = parseCurrentSagPositionedPages([page], "sag-export-direto.pdf");

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      ug: "160136",
      acronym: "Cmdo 9º Gpt Log",
      pi: "E5MBPDRDEGE",
      available: 259.19,
      toLiquidate: 47004.24,
      paid: 7575,
    });
  });

  it("reconstructs current-year financial columns while joining a wrapped PI description", () => {
    const page: PositionedPage = [
      item("UG", 10, 800), item("SIGLA", 70, 800), item("PI", 150, 800), item("NOME_PI", 230, 800),
      item("DISPONIVEL", 400, 800), item("A_LIQUIDAR", 480, 800), item("EM_LIQUIDACAO", 560, 800),
      item("LIQUIDADO", 640, 800), item("PAGO", 720, 800), item("%EMP", 800, 800), item("%LIQ", 860, 800),
      item("160001", 10, 760), item("OM A", 70, 760), item("E6TESTE001", 150, 760),
      item("MATERIAL DE", 230, 760), item("INTENDENCIA", 230, 750),
      item("20,00", 400, 760), item("30,00", 480, 760), item("10,00", 560, 760),
      item("15,00", 640, 760), item("25,00", 720, 760), item("80.00%", 800, 760), item("40.00%", 860, 760),
    ];

    const result = parseCurrentSagPositionedPages([page], "corrente.pdf");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].pi).toBe("E6TESTE001");
    expect(result.rows[0].piName).toContain("MATERIAL DE INTENDENCIA");
    expect(result.totals.total).toBe(100);
    expect(result.totals.committedPercent).toBe(80);
    expect(result.totals.liquidatedPercent).toBe(40);
  });

  it("reconstructs the distinct RPNP contract and recalculates its percentages", () => {
    const page: PositionedPage = [
      item("UG", 10, 800), item("NOME_UG", 70, 800), item("PI", 150, 800), item("NOME_PI", 230, 800),
      item("TOTAL_INSCRITO", 400, 800), item("TOTAL_A_LIQUIDA", 500, 800), item("TOTAL_LIQUIDADO", 600, 800),
      item("CANC", 700, 800), item("%LIQ", 780, 800), item("%CANC", 850, 800),
      item("R", 500, 790),
      item("160001", 10, 760), item("OM A", 70, 760), item("E6TESTE001", 150, 760),
      item("MATERIAL", 230, 760), item("RPNP", 230, 750),
      item("100,00", 400, 760), item("20,00", 500, 760), item("75,00", 600, 760), item("5,00", 700, 760),
      item("75.00%", 780, 760), item("5.00%", 850, 760),
    ];

    const result = parseRpnPositionedPages([page], "rpn.pdf");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].pi).toBe("E6TESTE001");
    expect(result.totals.inscribed).toBe(100);
    expect(result.totals.toLiquidate).toBe(20);
    expect(result.totals.liquidatedPercent).toBe(75);
    expect(result.totals.cancelledPercent).toBe(5);
  });
});
