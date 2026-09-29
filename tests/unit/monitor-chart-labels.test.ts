import { describe, expect, it } from "vitest";
import {
  estimatedChartLabelWidth,
  fitHorizontalCategoryLabel,
  fitVerticalCategoryAxis,
  wrapChartLabel,
} from "@/modules/grupamento/monitor-content/chart-label-layout";

describe("monitor chart category labels", () => {
  it("preserves the full axis description while fitting a dense horizontal row", () => {
    const source = "Cmdo 18ª Bda Inf Pantanal";
    const layout = fitHorizontalCategoryLabel(source, 190, 36, 14);
    expect(layout.lines.join(" ").replace(/\s+/g, " ").trim()).toBe(source);
    expect(layout.lines.length * layout.lineHeight).toBeLessThanOrEqual(36 * 0.86 + 0.01);
    expect(layout.fontSize).toBeGreaterThanOrEqual(6.5);
  });

  it("wraps labels deterministically without dropping long tokens", () => {
    const source = "Organização Logística ExtraordinariamenteLonga";
    const lines = wrapChartLabel(source, 120, 12);
    expect(lines.join(" ").replace(/\s+/g, " ").replace(/Extraordinariamente Longa/, "ExtraordinariamenteLonga")).toContain("Organização Logística");
    expect(lines.join("").replace(/\s+/g, "")).toBe(source.replace(/\s+/g, ""));
  });

  it("rotates dense vertical categories instead of stacking words into letter columns", () => {
    const labels = [
      "Insígnia de borracha Cb",
      "Insígnia de borracha Sd",
      "Gorro de selva",
      "Japona de campanha",
      "Macacão Cmb Camuflado",
      "Meia branca",
      "Meia preta",
      "Meia verde oliva",
      "Sandália de borracha",
      "Tênis preto",
      "Sapato preto",
      "Véstia branca",
      "Véstia branca saúde",
      "Cobertor azul",
      "Cobertor verde oliva",
      "Colcha branca",
      "Colcha azul",
      "Fronha branca",
      "Fronha azul",
      "Lençol branco",
      "Lençol azul",
      "Toalha de banho",
      "Toalha de rosto",
      "Bermuda preta",
      "Bust iê (Seg Fem)",
    ];
    const layout = fitVerticalCategoryAxis(labels, 34, 520, 14);
    expect(layout.angle).toBeLessThan(0);
    expect(layout.fontSize).toBeGreaterThanOrEqual(9);
    expect(layout.bottomExtent).toBeLessThanOrEqual(520 * .4 + 14);
  });

  it("estimates a wider gutter for longer category descriptions", () => {
    expect(estimatedChartLabelWidth("Cmdo 18ª Bda Inf Pantanal", 14))
      .toBeGreaterThan(estimatedChartLabelWidth("9º B Sau", 14));
  });
});
