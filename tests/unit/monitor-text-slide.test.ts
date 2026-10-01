import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { monitorTextSlide } from "@/modules/grupamento/monitor-content/text-slide";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import type { MonitorDocumentScenePayload, MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";

const lines = ["MISSÃO EM ANDAMENTO", "FINALIDADE - Material do 44º BI Mtz para o 9º B Mnt destinado ao desfazimento.", "PERÍODO: 29 SET a 2 OUT 26", "ROTAS / PARADAS: Campo Grande, Coxim (47º BI), Cuiabá (44º BI Mtz), Campo Grande.", "CARGA DE RETORNO: Não há"];
const elements: MonitorSlideElement[] = lines.map((text, i) => ({kind:"text", text, role:i < 3 ? "title" : "body", x:.04,y:.02+i*.18,w:.92,h:.12,z:i,fontSizePt:24}));
const payload: MonitorDocumentScenePayload = {layoutVersion:2,layout:{version:2,width:12192000,height:6858000,elements}};
describe("text-panel PowerPoint reports", () => {
  it("separates the actual title from field labels even when PPT marks fields as titles", () => {
    expect(monitorTextSlide(payload,lines[0])).toEqual({title:lines[0],paragraphs:lines.slice(1)});
  });
  it("preserves maps, covers, charts, tables, diagrams and saved user layouts", () => {
    const extras: MonitorSlideElement[] = [
      {kind:"image",x:0,y:0,w:1,h:1,z:10,assetId:"map"},
      {kind:"chart",x:.1,y:.5,w:.8,h:.4,z:10,chart:{type:"bar",series:[]}},
      {kind:"table",x:.1,y:.5,w:.8,h:.4,z:10,columns:["OM"],rows:[["9º B Sup"]]},
      {kind:"shape",x:.01,y:.8,w:.02,h:.02,z:10,fill:"#FF0000"},
    ];
    for (const extra of extras) expect(monitorTextSlide({...payload,layout:{...payload.layout!,elements:[...elements,extra]}},lines[0])).toBeNull();
    expect(monitorTextSlide({...payload,onlineEditor:{version:1,revision:2}},lines[0])).toBeNull();
    expect(monitorTextSlide({...payload,correction:{version:1,preserveLayout:true,fullFrame:true}},lines[0])).toBeNull();
    expect(monitorTextSlide({...payload,layout:{...payload.layout!,elements:elements.slice(0,2)}},lines[0])).toBeNull();
  });
  it("reprocesses text-heavy PPT into readable scenes without truncating any words or changing source pages", async () => {
    const zip = new JSZip();
    const body = [lines[0], ...Array.from({length:12}, (_,i) => `Registro ${i+1}: ` + lines[3].repeat(4))];
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
    zip.file("ppt/slides/slide1.xml", '<p:sld><p:spTree>'+body.map((text,i) => `<p:sp><p:spPr><a:xfrm><a:off x="300000" y="${i*400000}"/><a:ext cx="11000000" cy="350000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="2400"/><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`).join("")+"</p:spTree></p:sld>");
    const result = await extractMonitorDocument(await zip.generateAsync({type:"nodebuffer"}),"missoes.pptx");
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].payload.inputCompiler?.strategy).toBe("DOCUMENT_REFLOW");
    expect(result.scenes.flatMap(scene => scene.payload.inputCompiler?.normalizedContent.paragraphs ?? []).join(" ")).toBe(body.slice(1).join(" "));
    expect(result.scenes.every(scene => scene.sourcePage === 1 && scene.payload.inputCompiler?.preflight.status === "PASS")).toBe(true);
  });
});
