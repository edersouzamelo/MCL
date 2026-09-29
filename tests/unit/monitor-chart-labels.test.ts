import { describe, expect, it } from "vitest";
import {
  estimatedChartLabelWidth,
  fitHorizontalCategoryLabel,
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

  it("estimates a wider gutter for longer category descriptions", () => {
    expect(estimatedChartLabelWidth("Cmdo 18ª Bda Inf Pantanal", 14))
      .toBeGreaterThan(estimatedChartLabelWidth("9º B Sau", 14));
  });
});
