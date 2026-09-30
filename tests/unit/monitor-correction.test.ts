import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createMonitorCorrectionPowerPoint } from "@/modules/grupamento/monitor-correction-export";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import { activeMonitorCorrection, MONITOR_CORRECTION_MARKER } from "@/modules/grupamento/monitor-content/correction";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";

describe("PowerPoint de correção", () => {
  it("reconhece a origem após editar e prioriza a geometria e estilo do operador", async () => {
    const pptx = createMonitorCorrectionPowerPoint(9);
    const slide = pptx.addSlide();
    slide.addText("DADOS DE TESTE · CORRIGIDO", { x: 8, y: 3, w: 4, h: 1, color: "B00020", fontFace: "Arial", fontSize: 18, bold: true });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13, h: 7, fill: { color: "FFFFFF" } });
    const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const zip = await JSZip.loadAsync(buffer);
    expect(await zip.file("docProps/core.xml")!.async("string")).toContain(MONITOR_CORRECTION_MARKER);
    // A user moves the text from 8 to 9 inches in PowerPoint's native XML.
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    zip.file("ppt/slides/slide1.xml", xml.replace('x="7315200"', 'x="8229600"'));
    const corrected = await zip.generateAsync({ type: "nodebuffer" });
    const result = await extractMonitorDocument(corrected, "renamed-by-user.pptx");
    expect(result.scenes[0].payload.correction).toEqual({ version: 1, preserveLayout: true, fullFrame: true });
    const text = result.scenes[0].payload.layout!.elements.find(e => e.kind === "text");
    expect(text).toMatchObject({ kind: "text", color: "#B00020", fontSizePt: 18, bold: true, fontFace: "Arial" });
    expect(text!.x).toBeCloseTo(9 / 13.3333333333, 4);
    expect(result.warnings.join(" ")).toContain("PPT de correção reconhecido");
  });
  it("a última correção aprovada substitui a sequência e a retirada restaura a anterior", () => {
    const source = { importId: "original", sourceImportedAt: "2026-09-30T10:00:00Z", approvedAt: "2026-09-30T11:00:00Z", payload: {} } as MonitorDocumentSceneDto;
    const correction = { ...source, importId: "corrected", approvedAt: "2026-09-30T12:00:00Z", payload: { correction: { version: 1 as const, preserveLayout: true as const, fullFrame: true as const } } };
    const newest = { ...correction, importId: "newest", approvedAt: "2026-09-30T13:00:00Z" };
    expect(activeMonitorCorrection([source, correction, newest])).toEqual([newest]);
    expect(activeMonitorCorrection([source])).toBeNull();
  });
});
