import { describe, expect, it } from "vitest";
import { prepareMonitorElements } from "@/modules/grupamento/monitor-content/presentation-layout";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";

describe("institutional slide preparation", () => {
  const metric: MonitorSlideElement = { kind: "text", x: .1, y: .7, w: .6, h: .12, z: 1, text: "R$ 34.876.682,00" };
  it("omits off-canvas side decorations and isolated header icons without altering data", () => {
    const bar: MonitorSlideElement = { kind: "shape", x: .06, y: .33, w: .86, h: .033, z: 2, fill: "#2563EB" };
    const items: MonitorSlideElement[] = [metric, bar,
      { kind: "shape", x: -.0566, y: -.0415, w: .205, h: .2025, z: 3, fill: "#BDBFA0" },
      { kind: "text", x: -.2677, y: .467, w: .5648, h: .0662, z: 4, text: "PRONTIDÃO LOGÍSTICA NA DEFESA E PRESERVAÇÃO DA FRONTEIRA OESTE!" },
      { kind: "image", x: .001, y: .02, w: .025, h: .06, z: 5, assetId: "crest" },
      { kind: "image", x: .91, y: .02, w: .078, h: .113, z: 6, assetId: "money-icon" },
    ];
    const result = prepareMonitorElements(items);
    expect(result.elements).toEqual([metric, bar]);
    expect(result.omitted).toHaveLength(4);
    expect(items).toHaveLength(6);
    expect(prepareMonitorElements(result.elements).elements).toEqual(result.elements);
  });
  it("keeps content images, diagrams, numerical annotations and small in-frame shapes", () => {
    const items: MonitorSlideElement[] = [metric,
      { kind: "image", x: .2, y: .3, w: .04, h: .05, z: 2, assetId: "diagram-symbol" },
      { kind: "image", x: .1, y: .01, w: .7, h: .15, z: 3, assetId: "header-content" },
      { kind: "text", x: -.01, y: .3, w: .03, h: .04, z: 4, text: "10%" },
      { kind: "shape", x: .4, y: .5, w: .01, h: .01, z: 5, fill: "#00FF00" },
    ];
    expect(prepareMonitorElements(items).elements).toEqual(items);
  });
  it("removes peripheral decorations and title banners around a structured chart in briefing mode", () => {
    const title: MonitorSlideElement = { kind: "text", text: "Classe II – Duração dos Estoques PRDU", x: .28, y: .08, w: .58, h: .08, z: 5, role: "title" };
    const chart: MonitorSlideElement = { kind: "chart", x: .14, y: .22, w: .72, h: .58, z: 10, chart: { type: "bar", series: [{ name: "Estoque OP", categories: ["Item A"], values: [3] }] } };
    const banner: MonitorSlideElement = { kind: "shape", x: .26, y: .06, w: .62, h: .12, z: 2, fill: "#00C7A5" };
    const sideBadge: MonitorSlideElement = { kind: "image", x: .025, y: .48, w: .07, h: .14, z: 4, assetId: "decorative-badge" };
    const source: MonitorSlideElement = { kind: "text", text: "Dados extraídos do sistema em 28 SET 26", x: .72, y: .87, w: .24, h: .05, z: 6, role: "label" };
    const result = prepareMonitorElements([banner, sideBadge, title, chart, source]);
    expect(result.elements).toContain(title);
    expect(result.elements).toContain(source);
    expect(result.elements.some((item) => item.kind === "image" && item.assetId === "decorative-badge")).toBe(false);
    expect(result.elements.some((item) => item.kind === "shape" && item.fill === "#00C7A5")).toBe(false);
    expect(result.omitted.map((item) => item.reason).join(" ")).toContain("briefing");
  });

  it("expands a simple dominant chart into unused slide space without covering title or footer", () => {
    const items: MonitorSlideElement[] = [
      { kind: "text", text: "Índice de disponibilidade", x: .1, y: .04, w: .8, h: .08, z: 1, role: "title" },
      { kind: "chart", x: .22, y: .26, w: .56, h: .42, z: 2, chart: { type: "bar", orientation: "horizontal", series: [{ name: "Atual", categories: ["OM A"], values: [80] }] } },
      { kind: "text", text: "Fonte: relatório validado", x: .1, y: .9, w: .8, h: .04, z: 3, role: "label" },
    ];
    const result = prepareMonitorElements(items);
    const chart = result.elements.find((item) => item.kind === "chart");
    expect(chart?.kind).toBe("chart");
    if (chart?.kind === "chart") {
      expect(chart.x).toBe(.04);
      expect(chart.w).toBe(.92);
      expect(chart.y).toBeGreaterThanOrEqual(.135);
      expect(chart.y + chart.h).toBeLessThanOrEqual(.885);
    }
    expect(result.adjustments).toHaveLength(1);
    expect(prepareMonitorElements(result.elements).elements).toEqual(result.elements);
  });
  it("does not filter small images in a figure-only slide", () => {
    const items: MonitorSlideElement[] = [{ kind: "image", x: .01, y: .01, w: .05, h: .05, z: 1, assetId: "figure" }];
    expect(prepareMonitorElements(items).elements).toEqual(items);
  });
});
