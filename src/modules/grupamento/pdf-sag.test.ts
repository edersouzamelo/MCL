import { describe, expect, it } from "vitest";
import { parseCurrentSagPositionedPages, parseRpnPositionedPages, type PositionedPage } from "@/modules/grupamento/pdf-sag";

function item(str: string, x: number, y: number) {
  return { str, x, y, width: 20, height: 8 };
}

describe("SAG PDF coordinate reconstruction", () => {
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
