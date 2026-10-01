import { describe, expect, it } from "vitest";
import { storedZip } from "../../src/modules/grupamento/monitor-content/extract.test";
import { extractPptxLayout } from "@/modules/grupamento/monitor-content/pptx-layout";
import { fitBarPointLabel } from "@/modules/grupamento/monitor-content/chart-label-layout";
import { prepareMonitorElements } from "@/modules/grupamento/monitor-content/presentation-layout";
import { monitorTitleElements } from "@/modules/grupamento/monitor-content/presentation-title";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";

function extract(labels: string, extension = "", overlay = "") {
  return extractPptxLayout(storedZip([
    { name: "ppt/slides/slide1.xml", data: Buffer.from(`<p:sld>${overlay}<p:graphicFrame><p:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></p:xfrm><c:chart r:id="rId1"/></p:graphicFrame></p:sld>`) },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: Buffer.from('<Relationships><Relationship Id="rId1" Type="chart" Target="../charts/chart1.xml"/></Relationships>') },
    { name: "ppt/charts/chart1.xml", data: Buffer.from(`<c:chart><c:title><a:p><a:r><a:t>Armamento total - CMO</a:t></a:r></a:p></c:title><c:plotArea><c:barChart><c:barDir val="col"/><c:ser><c:tx><c:v>Disp</c:v></c:tx><c:cat><c:strCache><c:pt idx="0"><c:v>Armt L</c:v></c:pt><c:pt idx="1"><c:v>Armt P</c:v></c:pt></c:strCache></c:cat><c:val><c:numCache><c:pt idx="0"><c:v>18959</c:v></c:pt><c:pt idx="1"><c:v>283</c:v></c:pt></c:numCache></c:val><c:dLbls>${labels}</c:dLbls>${extension}</c:ser></c:barChart></c:plotArea></c:chart>`) },
  ]));
}

function series(result: ReturnType<typeof extract>) {
  const chart = result.scenes[0].payload.layout!.elements.find(item => item.kind === "chart");
  if (chart?.kind !== "chart") throw new Error("Expected imported chart");
  return chart.chart.series[0];
}

describe("internal bar annotations", () => {
  it("preserves an internal custom percentage and a per-point outside quantity without recalculating them", () => {
    const result = extract('<c:dLbl><c:idx val="0"/><c:tx><c:rich><a:p><a:r><a:t>86%</a:t></a:r></a:p></c:rich></c:tx></c:dLbl><c:dLbl><c:idx val="1"/><c:dLblPos val="outEnd"/></c:dLbl><c:dLblPos val="ctr"/><c:showVal val="1"/>');
    expect(series(result).dataLabels).toEqual(["86%", "283"]);
    expect(series(result).dataLabelPositions).toEqual(["ctr", "outEnd"]);
    expect(series(result).values).toEqual([18959, 283]);
    expect(result.scenes[0].payload.searchableText).toContain("86%");
  });

  it("keeps cell labels at their source indices and preserves the simultaneously visible value", () => {
    const result = extract('<c:dLblPos val="inEnd"/><c:showVal val="true"/><c:separator>\n</c:separator><c:extLst><c:ext><c15:showDataLabelsRange val="1"/></c:ext></c:extLst>', '<c:extLst><c:ext><c15:datalabelsRange><c15:f>Sheet1!D2:D3</c15:f><c15:dlblRangeCache><c:pt idx="1"><c:v>Disponível</c:v></c:pt><c:pt idx="0"><c:v>86%</c:v></c:pt></c15:dlblRangeCache></c15:datalabelsRange></c:ext></c:extLst>');
    expect(series(result).dataLabels).toEqual(["86%\n18.959", "Disponível\n283"]);
    expect(series(result).dataLabelPositions).toEqual(["inEnd", "inEnd"]);
    expect(result.warnings).toEqual([]);
  });

  it("warns when a requested cell label has no cached text instead of fabricating a percentage", () => {
    const result = extract('<c:extLst><c:ext><c15:showDataLabelsRange val="1"/></c:ext></c:extLst>');
    expect(series(result).dataLabels).toEqual([null, null]);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain("texto de célula sem cache");
  });

  it("does not resurrect explicitly deleted labels", () => {
    const result = extract('<c:dLbl><c:idx val="0"/><c:delete val="true"/><c:tx><a:p><a:r><a:t>86%</a:t></a:r></a:p></c:tx></c:dLbl><c:dLblPos val="ctr"/><c:showVal val="1"/>');
    expect(series(result).dataLabels).toEqual([null, "283"]);
  });

  it("preserves a separate text box above the chart layer and never promotes it to a title", () => {
    const overlay = '<p:sp><p:spPr><a:xfrm><a:off x="2000000" y="1000000"/><a:ext cx="1500000" cy="400000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="2800"/><a:t>86% disponíveis</a:t></a:r></a:p></p:txBody></p:sp>';
    const result = extract('<c:showVal val="1"/><c:dLblPos val="outEnd"/>', "", overlay);
    const items = result.scenes[0].payload.layout!.elements;
    const chart = items.find(item => item.kind === "chart")!;
    const annotation = items.find(item => item.kind === "text")!;
    expect(annotation.z).toBeGreaterThan(chart.z);
    expect(annotation).toMatchObject({ role: "label", chartAnnotation: true, text: "86% disponíveis" });
    expect(series(result).dataLabels).toEqual(["18.959", "283"]);
    const prepared = prepareMonitorElements(items);
    expect(prepared.elements.find(item => item.kind === "chart")).toMatchObject({ x: chart.x, y: chart.y, w: chart.w, h: chart.h });
    const titled = monitorTitleElements(prepared.elements, result.scenes[0].title);
    expect(titled.title).toBe("Armamento total - CMO");
    expect(titled.elements.some(item => item.kind === "text" && item.text === "86% disponíveis")).toBe(true);
    expect(items as MonitorSlideElement[]).toHaveLength(2);
  });

  it.each([false, true])("centers internal labels within vertical/horizontal bars (horizontal=%s)", horizontal => {
    const point = fitBarPointLabel({ text: "86%", position: "ctr", horizontal, start: 100, end: 400, cross: 180, thickness: 60, fontSize: 14, bounds: { left: 0, top: 0, right: 900, bottom: 500 } });
    expect(point.inside).toBe(true);
    expect(point.callout).toBe(false);
    expect(point.lines).toEqual(["86%"]);
    expect(horizontal ? point.x : point.y).toBeCloseTo(horizontal ? 250 : 254.2);
  });

  it("keeps long labels outside a tiny bar with a callout instead of clipping or dropping text", () => {
    const source = "14% indisponíveis";
    const point = fitBarPointLabel({ text: source, position: "inEnd", horizontal: false, start: 420, end: 418, cross: 180, thickness: 80, fontSize: 14, bounds: { left: 0, top: 0, right: 900, bottom: 480 } });
    expect(point.inside).toBe(false);
    expect(point.callout).toBe(true);
    expect(point.lines.join("").replace(/\s/g, "")).toBe(source.replace(/\s/g, ""));
  });

  it.each(["inEnd", "inBase"] as const)("uses the correct end of a negative or reversed horizontal bar (%s)", position => {
    const point = fitBarPointLabel({ text: "14%", position, horizontal: true, start: 400, end: 100, cross: 180, thickness: 60, fontSize: 14, bounds: { left: 0, top: 0, right: 900, bottom: 500 } });
    expect(point.inside).toBe(true);
    expect(point.x).toBeGreaterThan(100);
    expect(point.x).toBeLessThan(400);
    expect(position === "inEnd" ? point.x < 250 : point.x > 250).toBe(true);
  });
});
