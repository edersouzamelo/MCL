import { describe, expect, it } from "vitest";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";

type Entry = { name: string; data: Buffer };

function storedZip(entries: Entry[]) {
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

describe("monitor content extraction", () => {
  it("turns a PPTX slide into text, figure and chart-ready scenes", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=", "base64");
    const slide = Buffer.from(`
      <p:sld xmlns:p="p" xmlns:a="a">
        <a:t>Situação Classe II</a:t>
        <a:t>Empenhado 72%</a:t>
        <a:t>Liquidado 48%</a:t>
      </p:sld>
    `);
    const rels = Buffer.from(`
      <Relationships>
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
      </Relationships>
    `);
    const chart = Buffer.from(`
      <c:chart xmlns:c="c"><c:ser>
        <c:tx><c:v>Execução</c:v></c:tx>
        <c:cat><c:strCache><c:pt><c:v>9 B Sup</c:v></c:pt><c:pt><c:v>9 B Mnt</c:v></c:pt></c:strCache></c:cat>
        <c:val><c:numCache><c:pt><c:v>72</c:v></c:pt><c:pt><c:v>48</c:v></c:pt></c:numCache></c:val>
      </c:ser></c:chart>
    `);

    const file = storedZip([
      { name: "ppt/slides/slide1.xml", data: slide },
      { name: "ppt/slides/_rels/slide1.xml.rels", data: rels },
      { name: "ppt/media/image1.png", data: png },
      { name: "ppt/charts/chart1.xml", data: chart },
    ]);

    const result = await extractMonitorDocument(file, "classe-ii.pptx");

    expect(result.scenes.some((scene) => scene.sceneType === "TEXT" && scene.title === "Situação Classe II")).toBe(true);
    expect(result.scenes.some((scene) => scene.sceneType === "CHART")).toBe(true);
    expect(result.assets).toHaveLength(1);
    const chartScene = result.scenes.find((scene) => scene.sceneType === "CHART");
    expect(chartScene?.payload.series?.[0]?.values).toEqual([72, 48]);
  });

  it("extracts paragraphs, tables and figures from DOCX deterministically", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=", "base64");
    const document = Buffer.from(`
      <w:document xmlns:w="w">
        <w:p><w:r><w:t>Classe V</w:t></w:r></w:p>
        <w:p><w:r><w:t>Situação do suprimento</w:t></w:r></w:p>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>OM</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Status</w:t></w:r></w:p></w:tc></w:tr>
        <w:tr><w:tc><w:p><w:r><w:t>9 B Sup</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Regular</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:document>
    `);
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
