import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { monitorTitleElements } from "@/modules/grupamento/monitor-content/presentation-title";
import { monitorTextSlide } from "@/modules/grupamento/monitor-content/text-slide";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";
const title = "RELATÓRIO DE TRANSPORTE";
const body = ["FINALIDADE: Suprimento", "PERÍODO: Outubro", "ROTAS/PARADAS: Origem e destino", "VIATURAS: 3", "CARGA OCIOSA: Não há", "CARGA DE RETORNO: Não há"];
const textbox: MonitorSlideElement = { kind: "text", text: [title, ...body].join("\n"), role: "title", x: .02, y: .18, w: .96, h: .8, z: 0, fontSizePt: 26 };
describe("mixed heading/body text boxes", () => {
  it("promotes only the heading and preserves all remaining fields", () => {
    const prepared = monitorTitleElements([textbox], textbox.text);
    expect(prepared.title).toBe(title);
    expect(prepared.elements.filter(e => e.kind === "text").map(e => e.text).join("\n")).toBe(body.join("\n"));
    expect(textbox.text).toBe([title, ...body].join("\n"));
    expect(monitorTextSlide({ layout: { version: 2, width: 13439775, height: 7559675, elements: [textbox] } }, textbox.text)).toEqual({ title, paragraphs: body });
  });
  it("does not split an actual multiline heading without body fields", () => {
    const original = { ...textbox, text: "PRIMEIRA LINHA\nSEGUNDA LINHA\nTERCEIRA LINHA" };
    expect(monitorTitleElements([original], original.text).title).toBe(original.text);
  });
  it("keeps totals alongside an image instead of consuming the entire text box as title", () => {
    const box = { ...textbox, y: .05, text: "RECURSOS DE TRANSPORTE\nTOTAL RECEBIDO: R$ 100,00\nTOTAL APLICADO: R$ 90,00" };
    const image: MonitorSlideElement = { kind: "image", x: .25, y: .35, w: .5, h: .5, z: 1, assetKey: "chart" };
    const prepared = monitorTitleElements([box, image], box.text);
    expect(prepared.title).toBe("RECURSOS DE TRANSPORTE");
    expect(prepared.elements.some(e => e.kind === "image")).toBe(true);
    expect(prepared.elements.find(e => e.kind === "text")).toMatchObject({ text: "TOTAL RECEBIDO: R$ 100,00\nTOTAL APLICADO: R$ 90,00" });
    const [text, picture] = prepared.elements;
    expect(text.y + text.h).toBeLessThan(picture.y);
  });
  it.each(['cy="7559675" cx="13439775"', 'cx="13439775" cy="7559675"'])("reads slide dimensions independently of XML attribute order: %s", async attributes => {
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", `<p:presentation><p:sldSz ${attributes}/></p:presentation>`);
    zip.file("ppt/slides/slide1.xml", '<p:sld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="13439775" cy="7559675"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>CAPA</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:sld>');
    const r = await extractMonitorDocument(await zip.generateAsync({type:"nodebuffer"}), "fixture.pptx");
    expect(r.scenes[0].payload.layout).toMatchObject({ width: 13439775, height: 7559675, elements: [expect.objectContaining({x:0,y:0,w:1,h:1})] });
  });
});
