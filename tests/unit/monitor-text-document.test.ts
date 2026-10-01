import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import { composeTextDocument, pdfTextBlocks, splitDocumentParagraph } from "@/modules/grupamento/monitor-content/text-document";
import { documentProseAllowsCrests, omMentionParts } from "@/modules/grupamento/om-crests";
import { CURRENT_MONITOR_EXTRACTION_VERSION, monitorSceneNeedsRefresh } from "@/modules/grupamento/monitor-content/version";

function pdfFixture(lines: string[]) {
  const stream = lines.map((text, i) => `BT /F1 ${i ? 10 : 18} Tf 40 ${800-i*16} Td (${text}) Tj ET`).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 900] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let text = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object,i) => { offsets.push(Buffer.byteLength(text)); text += `${i+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(text);
  text += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10,"0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(text);
}

describe("documentary text presentation", () => {
  it("splits long prose without losing words, repeating a summary or truncating the tail", async () => {
    const paragraphs = Array.from({length:18}, (_,i) => `Registro ${i+1}: A missão transportou ${i+1} toneladas até o destino e retornou com material identificado. `.repeat(3).trim());
    const result = await extractMonitorDocument(Buffer.from(["MISSÃO EM ANDAMENTO", ...paragraphs, "CONCLUSÃO", "Último registro: 1.280 toneladas, R$ 348.203,02."].join("\n\n")), "relatorio.txt");
    expect(result.scenes.length).toBeGreaterThan(5);
    const bodies = result.scenes.flatMap(scene => scene.payload.bullets ?? []);
    expect(bodies.join(" ")).toBe([...paragraphs,"Último registro: 1.280 toneladas, R$ 348.203,02."].join(" "));
    expect(result.scenes.at(-1)?.title).toBe("CONCLUSÃO");
    expect(result.scenes.every(scene => scene.payload.textDocument?.version === 1)).toBe(true);
    expect(splitDocumentParagraph(paragraphs[0], 80).join(" ")).toBe(paragraphs[0]);
  });
  it("reads Word heading styles, adjacent runs and repeated text; keeps every table row once", async () => {
    const rows = Array.from({length:24},(_,i) => `<w:tr><w:tc><w:p><w:r><w:t>OM ${i}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${i} toneladas</w:t></w:r></w:p></w:tc></w:tr>`).join("");
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Missões previstas</w:t></w:r></w:p><w:p><w:r><w:t>Trans</w:t></w:r><w:r><w:t>porte confirmado.</w:t></w:r></w:p><w:p><w:r><w:t>Transporte confirmado.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>OM</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Carga</w:t></w:r></w:p></w:tc></w:tr>${rows}</w:tbl><w:p><w:r><w:t>Fim do documento.</w:t></w:r></w:p></w:body></w:document>`);
    const result = await extractMonitorDocument(await zip.generateAsync({type:"nodebuffer"}),"missoes.docx");
    const bodies = result.scenes.flatMap(scene => scene.payload.bullets ?? []);
    expect(bodies).toEqual(["Transporte confirmado.","Transporte confirmado.","Fim do documento."]);
    const table = result.scenes.find(scene => scene.sceneType === "TABLE")!;
    expect(table.title).toBe("Missões previstas"); expect(table.payload.rows).toHaveLength(24);
    expect(table.payload.rows?.at(-1)).toEqual(["OM 23","23 toneladas"]);
    expect(bodies.some(text => text.includes("OM 23"))).toBe(false);
  });
  it("reads a real PDF text layer and preserves text beyond the old eight-line cut", async () => {
    const lines = ["PLANEJAMENTO DE TRANSPORTE", ...Array.from({length:30},(_,i) => `Registro ${i+1}: carga de ${i+1} toneladas confirmada.`)];
    const result = await extractMonitorDocument(pdfFixture(lines),"planejamento.pdf");
    expect(result.scenes.length).toBeGreaterThan(1);
    const text = result.scenes.flatMap(scene => scene.payload.bullets ?? []).join(" ");
    for (const line of lines.slice(1)) expect(text).toContain(line);
    expect(result.scenes.every(scene => scene.sourcePage === 1)).toBe(true);
  });
  it("keeps embedded Word figures next to their surrounding text", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", '<w:document><w:p><w:r><w:t>Antes da figura.</w:t></w:r></w:p><w:p><a:blip r:embed="rId1"/></w:p><w:p><w:r><w:t>Depois da figura.</w:t></w:r></w:p></w:document>');
    zip.file("word/_rels/document.xml.rels", '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>');
    zip.file("word/media/image1.png",Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=","base64"));
    const result = await extractMonitorDocument(await zip.generateAsync({type:"nodebuffer"}),"figuras.docx");
    expect(result.scenes.map(scene => scene.sceneType)).toEqual(["TEXT","FIGURE","TEXT"]);
    expect(result.scenes[0].payload.bullets).toEqual(["Antes da figura."]);
    expect(result.scenes[2].payload.bullets).toEqual(["Depois da figura."]);
    expect(result.assets).toHaveLength(1);
  });
  it("recognizes aligned numeric PDF tables without dropping duplicate records", () => {
    const items = [["OM","Carga"],["9 B Sup","20"],["9 B Sup","20"]].flatMap((row,i) => row.map((str,j) => ({str,x:40+j*220,y:750-i*16,width:str.length*5,fontSize:10})));
    const blocks = pdfTextBlocks(items,2);
    expect(blocks).toEqual([{kind:"table",page:2,rows:[["OM","Carga"],["9 B Sup","20"],["9 B Sup","20"]]}]);
  });
  it("rejects oversized slide counts rather than silently publishing a partial document", () => {
    expect(() => composeTextDocument(Array.from({length:81},(_,i) => ({kind:"heading" as const,text:`Assunto ${i}`})))).toThrow("mais de 80");
  });
  it("suppresses inline route emblems while retaining OM identities and the existing mention parser", () => {
    const route = "ROTAS / PARADAS: Campo Grande, Coxim (47º BI), Rondonópolis (18º GAC), Cuiabá (44º BI Mtz), retorno a Campo Grande.";
    expect(documentProseAllowsCrests(route)).toBe(false);
    expect(documentProseAllowsCrests("Material do 44º BI Mtz para o 9º B Mnt destinado ao desfazimento.")).toBe(false);
    expect(documentProseAllowsCrests("44º BI Mtz")).toBe(true);
    expect(documentProseAllowsCrests("Situação do 9º B Sup")).toBe(true);
    expect(omMentionParts(route).filter(part => part.om).length).toBe(3);
  });
  it("refreshes old text/PDF imports without reprocessing current PPT or saved online edits", () => {
    const payload = {extractionVersion:CURRENT_MONITOR_EXTRACTION_VERSION};
    for (const ext of ["docx","pdf","txt"]) expect(monitorSceneNeedsRefresh({payload,sourceFileName:`source.${ext}`})).toBe(true);
    expect(monitorSceneNeedsRefresh({payload,sourceFileName:"source.pptx"})).toBe(false);
    expect(monitorSceneNeedsRefresh({payload:{...payload,textDocument:{version:1}},sourceFileName:"source.pdf"})).toBe(false);
    expect(monitorSceneNeedsRefresh({payload:{...payload,onlineEditor:{version:1,revision:2}},sourceFileName:"source.pdf"})).toBe(false);
  });
});
