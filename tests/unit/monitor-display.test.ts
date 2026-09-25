import { describe, expect, it } from "vitest";
// Ensure the existing PPTX/DOCX regression suite is covered by `pnpm test`.
import { storedZip } from "../../src/modules/grupamento/monitor-content/extract.test";
import { extractPptxLayout } from "@/modules/grupamento/monitor-content/pptx-layout";
import { paginateMonitor } from "@/modules/grupamento/monitor-pagination";
import { barSegments, chartDomain, chartTicks, chartValueLabel } from "@/modules/grupamento/monitor-content/chart-geometry";
import type { MonitorDocumentChart } from "@/modules/grupamento/monitor-content/types";

const chart: MonitorDocumentChart = { type: "bar", grouping: "stacked", series: [
  { name: "Estoque OP", categories: ["Jan", "Fev"], values: [10, 20], color: "#008000" },
  { name: "Estoque OM", categories: ["Jan", "Fev"], values: [20, 40], color: "#0000ff" },
  { name: "A receber", categories: ["Jan", "Fev"], values: [30, 60], color: "#ffff00" },
] };

describe("monitor chart semantics", () => {
  it("keeps absolute stacks proportional instead of normalizing every column", () => {
    expect(chartDomain(chart)).toEqual({ min: 0, max: 120 });
    expect(barSegments(chart, 0).map(({ start, end }) => [start, end])).toEqual([[0, 10], [10, 30], [30, 60]]);
    expect(barSegments(chart, 1).at(-1)?.end).toBe(120);
    expect(barSegments({ ...chart, grouping: "percentStacked" }, 0).at(-1)?.end).toBe(1);
  });
  it("uses separate positive and negative baselines and skips missing points", () => {
    const mixed = { ...chart, series: [{ ...chart.series[0], values: [-10] }, { ...chart.series[1], values: [20] }, { ...chart.series[2], values: [-5] }] };
    expect(chartDomain(mixed)).toEqual({ min: -15, max: 20 });
    expect(barSegments(mixed, 0).at(-1)).toMatchObject({ start: -10, end: -15 });
    expect(barSegments({ ...mixed, series: [{ ...mixed.series[0], missingValueIndices: [0] }] }, 0)).toEqual([]);
  });
  it("preserves value ticks, format and colors by point", () => {
    expect(chartTicks({ ...chart, majorUnit: 20 }, 0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(chartValueLabel(.5, "0%", false)).toBe("50%");
    expect(barSegments({ ...chart, series: [{ ...chart.series[0], pointColors: ["#123456"] }] }, 0)[0].color).toBe("#123456");
    expect(chartTicks({ ...chart, valueFormat: "dd/mm/yy" }, 46200, 46700).length).toBeGreaterThan(10);
  });
});

describe("monitor pagination", () => {
  it("keeps a fitting frame intact", () => expect(paginateMonitor(500, 600, [])).toEqual([{ top: 0, height: 500 }]));
  it("does not bisect cards or rows in adjacent columns", () => {
    const blocks = [{ top: 0, height: 100 }, { top: 120, height: 220 }, { top: 120, height: 260 }, { top: 400, height: 200 }, { top: 630, height: 200 }];
    const pages = paginateMonitor(830, 450, blocks);
    expect(pages).toEqual([{ top: 0, height: 400 }, { top: 400, height: 430 }]);
    for (const page of pages) for (const b of blocks) {
      const end = page.top + page.height;
      expect(b.top < end && b.top + b.height > end).toBe(false);
    }
  });
});


describe("PPTX semantic payload v3", () => {
  it("preserves sparse point indices, explicit point colors, grid, legend and axis scale", () => {
    const xml = `<c:chart><c:plotArea><c:barChart><c:barDir val="bar"/><c:grouping val="stacked"/>
      <c:ser><c:tx><c:v>Estoque OP</c:v></c:tx>
      <c:spPr><a:solidFill><a:srgbClr val="008000"/></a:solidFill></c:spPr>
      <c:dPt><c:idx val="2"/><c:spPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></c:spPr></c:dPt>
      <c:cat><c:strCache><c:pt idx="0"><c:v>Jan</c:v></c:pt><c:pt idx="1"><c:v>Fev</c:v></c:pt><c:pt idx="2"><c:v>Mar</c:v></c:pt></c:strCache></c:cat>
      <c:val><c:numCache><c:pt idx="2"><c:v>30</c:v></c:pt><c:pt idx="0"><c:v>10</c:v></c:pt></c:numCache></c:val></c:ser></c:barChart>
      <c:catAx><c:scaling><c:orientation val="maxMin"/></c:scaling></c:catAx>
      <c:valAx><c:title><a:p><a:r><a:t>Período</a:t></a:r></a:p></c:title><c:scaling><c:min val="0"/><c:max val="100"/></c:scaling><c:majorUnit val="20"/><c:majorGridlines><a:ln><a:solidFill><a:srgbClr val="888888"/></a:solidFill></a:ln></c:majorGridlines></c:valAx>
      </c:plotArea><c:legend><c:legendPos val="b"/></c:legend></c:chart>`;
    const result = extractPptxLayout(storedZip([
      { name: "ppt/slides/slide1.xml", data: Buffer.from(`<p:sld><p:graphicFrame><p:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></p:xfrm><c:chart r:id="rId1"/></p:graphicFrame></p:sld>`) },
      { name: "ppt/slides/_rels/slide1.xml.rels", data: Buffer.from(`<Relationships><Relationship Id="rId1" Type="chart" Target="../charts/chart1.xml"/></Relationships>`) },
      { name: "ppt/charts/chart1.xml", data: Buffer.from(xml) },
    ]));
    const graph = result.scenes[0].payload.layout!.elements.find((e) => e.kind === "chart");
    expect(graph?.kind).toBe("chart");
    if (graph?.kind !== "chart") return;
    expect(graph.chart).toMatchObject({ semanticVersion: 3, orientation: "horizontal", grouping: "stacked", xAxisTitle: "Período", majorUnit: 20, showGridlines: true, gridlineColor: "#888888", legendPosition: "bottom", categoryReverse: true });
    expect(graph.chart.series[0]).toMatchObject({ values: [10, 0, 30], categories: ["Jan", "Fev", "Mar"], missingValueIndices: [1], pointColors: [null, null, "#FF0000"], color: "#008000" });
  });
});
