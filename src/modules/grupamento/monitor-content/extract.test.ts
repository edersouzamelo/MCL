import { describe, expect, it } from "vitest";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";

type Entry = { name: string; data: Buffer };

export function storedZip(entries: Entry[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + entry.data.length;
  }

  const localBlock = Buffer.concat(locals);
  const centralBlock = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBlock.length, 12);
  eocd.writeUInt32LE(localBlock.length, 16);
  return Buffer.concat([localBlock, centralBlock, eocd]);
}

function picture(id: number, x: number) {
  return [
    "<p:pic><p:blipFill><a:blip r:embed=\"rId" + String(id) + "\"/></p:blipFill>",
    "<p:spPr><a:xfrm><a:off x=\"" + String(x) + "\" y=\"3500000\"/><a:ext cx=\"1200000\" cy=\"900000\"/></a:xfrm></p:spPr></p:pic>",
  ].join("");
}

describe("monitor content extraction", () => {
  it("preserves PPTX slide geometry, all figures, a centered metric and vertical bar orientation", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=", "base64");
    const slide = Buffer.from([
      "<p:sld xmlns:p=\"p\" xmlns:a=\"a\" xmlns:c=\"c\" xmlns:r=\"r\"><p:cSld><p:spTree>",
      "<p:sp><p:spPr><a:xfrm><a:off x=\"900000\" y=\"800000\"/><a:ext cx=\"7000000\" cy=\"800000\"/></a:xfrm></p:spPr>",
      "<p:txBody><a:bodyPr/><a:p><a:r><a:rPr sz=\"2800\" b=\"1\"/><a:t>Classe I: Quantitativo de Subsistência (QS)</a:t></a:r></a:p></p:txBody></p:sp>",
      "<p:sp><p:spPr><a:xfrm><a:off x=\"3500000\" y=\"2200000\"/><a:ext cx=\"5000000\" cy=\"1200000\"/></a:xfrm></p:spPr>",
      "<p:txBody><a:bodyPr anchor=\"ctr\"/><a:p><a:pPr algn=\"ctr\"/><a:r><a:rPr sz=\"4200\" b=\"1\"/><a:t>R$ 34.876.682,00</a:t></a:r></a:p></p:txBody></p:sp>",
      picture(1,700000), picture(2,2400000), picture(3,4100000), picture(4,5800000), picture(5,7500000), picture(6,9200000),
      "<p:graphicFrame><p:xfrm><a:off x=\"1100000\" y=\"4700000\"/><a:ext cx=\"9800000\" cy=\"1700000\"/></p:xfrm>",
      "<a:graphic><a:graphicData><c:chart r:id=\"rId7\"/></a:graphicData></a:graphic></p:graphicFrame>",
      "</p:spTree></p:cSld></p:sld>",
    ].join(""));

    const relItems = [1,2,3,4,5,6].map((id) =>
      "<Relationship Id=\"rId" + String(id) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/image" + String(id) + ".png\"/>",
    ).join("");
    const rels = Buffer.from("<Relationships>" + relItems + "<Relationship Id=\"rId7\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart\" Target=\"../charts/chart1.xml\"/></Relationships>");
    const chart = Buffer.from([
      "<c:chartSpace xmlns:c=\"c\" xmlns:a=\"a\"><c:chart><c:plotArea><c:barChart>",
      "<c:barDir val=\"col\"/><c:grouping val=\"clustered\"/><c:ser><c:tx><c:v>Toneladas/litros</c:v></c:tx>",
      "<c:spPr><a:solidFill><a:srgbClr val=\"4F81BD\"/></a:solidFill></c:spPr>",
      "<c:cat><c:strCache><c:pt><c:v>Açúcar</c:v></c:pt><c:pt><c:v>Arroz</c:v></c:pt></c:strCache></c:cat>",
      "<c:val><c:numCache><c:pt><c:v>7.1</c:v></c:pt><c:pt><c:v>20.1</c:v></c:pt></c:numCache></c:val>",
      "</c:ser></c:barChart>",
      "<c:catAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Itens de suprimento</a:t></a:r></a:p></c:rich></c:tx></c:title></c:catAx>",
      "<c:valAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Toneladas/litros</a:t></a:r></a:p></c:rich></c:tx></c:title></c:valAx>",
      "</c:plotArea></c:chart></c:chartSpace>",
    ].join(""));

    const entries: Entry[] = [
      { name: "ppt/presentation.xml", data: Buffer.from("<p:presentation xmlns:p=\"p\"><p:sldSz cx=\"12192000\" cy=\"6858000\"/></p:presentation>") },
      { name: "ppt/slides/slide1.xml", data: slide },
      { name: "ppt/slides/_rels/slide1.xml.rels", data: rels },
      { name: "ppt/charts/chart1.xml", data: chart },
    ];
    for (let id = 1; id <= 6; id += 1) entries.push({ name: "ppt/media/image" + String(id) + ".png", data: png });

    const result = await extractMonitorDocument(storedZip(entries), "classe-i.pptx");
    expect(result.scenes).toHaveLength(1);
    expect(result.assets).toHaveLength(6);

    const scene = result.scenes[0];
    expect(scene.title).toContain("Classe I");
    expect(scene.payload.layoutVersion).toBe(2);
    const elements = scene.payload.layout?.elements ?? [];
    expect(elements.filter((item) => item.kind === "image")).toHaveLength(6);

    const metric = elements.find((item) => item.kind === "text" && item.text.includes("34.876.682"));
    expect(metric?.kind).toBe("text");
    if (metric?.kind === "text") {
      expect(metric.align).toBe("center");
      expect(metric.fontSizePt).toBe(42);
    }

    const graph = elements.find((item) => item.kind === "chart");
    expect(graph?.kind).toBe("chart");
    if (graph?.kind === "chart") {
      expect(graph.chart.orientation).toBe("vertical");
      expect(graph.chart.grouping).toBe("clustered");
      expect(graph.chart.series[0]?.values).toEqual([7.1, 20.1]);
      expect(graph.chart.series[0]?.color).toBe("#4F81BD");
      expect(graph.chart.xAxisTitle).toBe("Itens de suprimento");
      expect(graph.chart.yAxisTitle).toBe("Toneladas/litros");
    }
  });

  it("preserves horizontal chart semantics, overlap and multiple colored series", async () => {
    const slide = Buffer.from([
      "<p:sld xmlns:p=\"p\" xmlns:a=\"a\" xmlns:c=\"c\" xmlns:r=\"r\"><p:cSld><p:spTree>",
      "<p:sp><p:spPr><a:xfrm><a:off x=\"500000\" y=\"5000000\"/><a:ext cx=\"5200000\" cy=\"1100000\"/></a:xfrm><a:solidFill><a:srgbClr val=\"F8FAFC\"/></a:solidFill><a:prstGeom prst=\"roundRect\"/></p:spPr></p:sp>",
      "<p:graphicFrame><p:xfrm><a:off x=\"1000000\" y=\"1000000\"/><a:ext cx=\"10000000\" cy=\"5000000\"/></p:xfrm>",
      "<a:graphic><a:graphicData><c:chart r:id=\"rId1\"/></a:graphicData></a:graphic></p:graphicFrame>",
      "</p:spTree></p:cSld></p:sld>",
    ].join(""));
    const rels = Buffer.from("<Relationships><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart\" Target=\"../charts/chart1.xml\"/></Relationships>");
    const chart = Buffer.from([
      "<c:chartSpace xmlns:c=\"c\" xmlns:a=\"a\"><c:chart><c:plotArea><c:barChart>",
      "<c:barDir val=\"bar\"/><c:grouping val=\"clustered\"/><c:overlap val=\"100\"/>",
      "<c:ser><c:tx><c:v>Estoque OP</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val=\"3C7D0E\"/></a:solidFill></c:spPr><c:cat><c:strCache><c:pt><c:v>Açúcar</c:v></c:pt></c:strCache></c:cat><c:val><c:numCache><c:pt><c:v>46432</c:v></c:pt></c:numCache></c:val></c:ser>",
      "<c:ser><c:tx><c:v>Estoque OM</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val=\"4F81BD\"/></a:solidFill></c:spPr><c:cat><c:strCache><c:pt><c:v>Açúcar</c:v></c:pt></c:strCache></c:cat><c:val><c:numCache><c:pt><c:v>46507</c:v></c:pt></c:numCache></c:val></c:ser>",
      "<c:ser><c:tx><c:v>A receber</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val=\"FFFF00\"/></a:solidFill></c:spPr><c:cat><c:strCache><c:pt><c:v>Açúcar</c:v></c:pt></c:strCache></c:cat><c:val><c:numCache><c:pt><c:v>46640</c:v></c:pt></c:numCache></c:val></c:ser>",
      "</c:barChart>",
      "<c:catAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Itens</a:t></a:r></a:p></c:rich></c:tx></c:title></c:catAx>",
      "<c:valAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Período</a:t></a:r></a:p></c:rich></c:tx></c:title><c:scaling><c:min val=\"46200\"/><c:max val=\"46700\"/></c:scaling><c:numFmt formatCode=\"dd/mm/yy\"/></c:valAx>",
      "</c:plotArea></c:chart></c:chartSpace>",
    ].join(""));

    const result = await extractMonitorDocument(storedZip([
      { name: "ppt/presentation.xml", data: Buffer.from("<p:presentation xmlns:p=\"p\"><p:sldSz cx=\"12192000\" cy=\"6858000\"/></p:presentation>") },
      { name: "ppt/slides/slide1.xml", data: slide },
      { name: "ppt/slides/_rels/slide1.xml.rels", data: rels },
      { name: "ppt/charts/chart1.xml", data: chart },
    ]), "estoques.pptx");

    const graph = result.scenes[0]?.payload.layout?.elements.find((item) => item.kind === "chart");
    expect(graph?.kind).toBe("chart");
    if (graph?.kind === "chart") {
      expect(graph.chart.orientation).toBe("horizontal");
      expect(graph.chart.overlap).toBe(100);
      expect(graph.chart.valueFormat).toBe("dd/mm/yy");
      expect(graph.chart.axisMin).toBe(46200);
      expect(graph.chart.axisMax).toBe(46700);
      expect(graph.chart.series.map((item) => item.color)).toEqual(["#3C7D0E", "#4F81BD", "#FFFF00"]);
      expect(graph.chart.xAxisTitle).toBe("Período");
      expect(graph.chart.yAxisTitle).toBe("Itens");
    }
    expect(result.scenes[0]?.payload.layout?.elements.some((item) => item.kind === "shape" && item.fill === "#F8FAFC")).toBe(false);
  });

  it("extracts paragraphs, tables and figures from DOCX deterministically", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=", "base64");
    const document = Buffer.from("<w:document xmlns:w=\"w\"><w:p><w:r><w:t>Classe V</w:t></w:r></w:p><w:p><w:r><w:t>Situação do suprimento</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>OM</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Status</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>9 B Sup</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Regular</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:document>");
    const file = storedZip([
      { name: "word/document.xml", data: document },
      { name: "word/media/image1.png", data: png },
    ]);
    const result = await extractMonitorDocument(file, "classe-v.docx");
    expect(result.scenes.some((scene) => scene.sceneType === "TEXT")).toBe(true);
    expect(result.scenes.some((scene) => scene.sceneType === "TABLE")).toBe(true);
    expect(result.scenes.some((scene) => scene.sceneType === "FIGURE")).toBe(true);
    expect(result.assets).toHaveLength(1);
  });
});
