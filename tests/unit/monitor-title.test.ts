import { describe, expect, it } from "vitest";
import { normalizeMonitorTitle, monitorTitleColor, monitorTitleElements, monitorIntegralImage } from "@/modules/grupamento/monitor-content/presentation-title";
import { prepareMonitorElements } from "@/modules/grupamento/monitor-content/presentation-layout";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";

describe("standard monitor presentation", () => {
  it.each(["Sup Cl VIII - Movimentos de 01JAN26 a 28SET26 (Quantidade de Itens)", "Módulo Orçamentário - Saúde Operacional"])("recognizes a native chart title when the persisted title is Slide N: %s", title => {
    const elements: MonitorSlideElement[] = [
      { kind:"chart", x:.1,y:.2,w:.8,h:.7,z:1,chart:{title,type:"bar",series:[{name:"Recebido",categories:["PI A"],values:[88]}]} },
      { kind:"text",text:"Dados extraídos do SISCOFIS/OP",x:.7,y:.9,w:.25,h:.05,z:2,role:"label" },
    ];
    const result = monitorTitleElements(elements, "Slide 3");
    expect(result.title).toBe(title);
    expect(result.promotedChartTitle).toBe(true);
    expect(result.elements[0].kind === "chart" && result.elements[0].chart.series).toEqual(elements[0].kind === "chart" && elements[0].chart.series);
  });
  it("uses a real header even when the parser marked it as body, preserving distinct chart titles", () => {
    const elements: MonitorSlideElement[] = [
      {kind:"text",text:"Situação logística",x:.1,y:.05,w:.8,h:.1,z:1,role:"body",fontSizePt:18},
      {kind:"chart",x:.1,y:.2,w:.8,h:.7,z:2,chart:{title:"Recebimento",type:"bar",series:[]}},
    ];
    const result = monitorTitleElements(elements,"Slide 4");
    expect(result.title).toBe("Situação logística");
    expect(result.promotedChartTitle).toBe(false);
    expect(result.elements).toHaveLength(1);
  });
  it("exempts full slide images, including legacy assets, without exempting small pictures or structured data", () => {
    const image: MonitorSlideElement = {kind:"image",assetId:"pasa-cover",x:0,y:0,w:1,h:1,z:1};
    expect(monitorIntegralImage({layout:{version:2,width:16,height:9,elements:[image]}})).toBe(true);
    expect(monitorIntegralImage({layout:{version:2,width:16,height:9,elements:[image,{kind:"text",text:"Subseção PASA",role:"title",x:.3,y:.1,w:.6,h:.2,z:2}]}})).toBe(true);
    expect(monitorIntegralImage({assetIds:["pasa-cover"]})).toBe(true);
    expect(monitorIntegralImage({assetIds:["pasa-cover"],bullets:["Informação adicional"]})).toBe(false);
    expect(monitorIntegralImage({layout:{version:2,width:16,height:9,elements:[{...image,w:.1,h:.1}]}})).toBe(false);
    expect(monitorIntegralImage({layout:{version:2,width:16,height:9,elements:[image,{kind:"table",x:.1,y:.1,w:.8,h:.8,z:2,columns:["OM"],rows:[["CMO"]]}]}})).toBe(false);
  });
  it.each(["SEMPRE DESTA FORMA", "Sempre Desta Forma", "sempre desta forma", "SEMPRE DESTA forma", "Sempre desta-forma"])("uses sentence case for %s", input => {
    expect(normalizeMonitorTitle(input)).toBe("Sempre desta forma");
  });
  it("keeps institutional acronyms and Roman class numbers", () => {
    expect(normalizeMonitorTitle("CLASSE II: SITUAÇÃO DOS MEM BALÍSTICOS DO CMO")).toBe("Classe II: situação dos MEM balísticos do CMO");
    expect(normalizeMonitorTitle("EXECUÇÃO POR PI 160NC00123")).toBe("Execução por PI 160NC00123");
  });
  it("defines exact white and black independently of source color", () => {
    expect(monitorTitleColor(false)).toBe("#FFFFFF");
    expect(monitorTitleColor(true)).toBe("#000000");
  });
  it("removes overlapping product pictures away from edges but keeps complete chart data and large figures", () => {
    const chart: MonitorSlideElement = { kind: "chart", x: .12, y: .2, w: .76, h: .78, z: 2, chart: { type: "bar", series: [{ name: "Existentes", categories: ["CMO"], values: [15495] }] } };
    const figure: MonitorSlideElement = { kind: "image", x: .2, y: .3, w: .5, h: .5, z: 3, assetId: "diagram" };
    const items: MonitorSlideElement[] = [chart, figure,
      { kind: "image", x: .2, y: .18, w: .07, h: .11, z: 4, assetId: "helmet" },
      { kind: "image", x: .76, y: .2, w: .08, h: .1, z: 5, assetId: "vest" }];
    const prepared = prepareMonitorElements(items);
    expect(prepared.elements).toEqual([chart, figure]);
    expect(prepared.omitted).toHaveLength(2);
    expect(items).toHaveLength(4);
  });
  it("extracts the full title, preserves subtitles and data, and keeps the body inside its reserved frame", () => {
    const title: MonitorSlideElement = { kind: "text", x: .1, y: .1, w: .8, h: .015, z: 1, role: "title", fontSizePt: 32, color: "#00FF00", text: "CLASSE II: CAPACETE BALÍSTICO" };
    const subtitle: MonitorSlideElement = { kind: "text", x: .1, y: .18, w: .8, h: .04, z: 2, role: "body", text: "Referência: 30 SET 26" };
    const table: MonitorSlideElement = { kind: "table", x: .04, y: .25, w: .92, h: .9, z: 3, columns: ["OM", "Quantidade"], rows: [["CMO", "15495"]] };
    const original = [title, subtitle, table];
    const result = monitorTitleElements(original, "Título truncado");
    expect(result.title).toBe(title.text);
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0].kind === "text" && result.elements[0].text).toBe(subtitle.text);
    expect(result.elements[1].kind === "table" && result.elements[1].rows).toEqual(table.rows);
    expect(result.elements.every(item => item.y >= 0 && item.y + item.h <= 1)).toBe(true);
    expect(original[0]).toBe(title);
  });
});
