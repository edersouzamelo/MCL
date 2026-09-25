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
  it("does not filter small images in a figure-only slide", () => {
    const items: MonitorSlideElement[] = [{ kind: "image", x: .01, y: .01, w: .05, h: .05, z: 1, assetId: "figure" }];
    expect(prepareMonitorElements(items).elements).toEqual(items);
  });
});
