import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { writeFile, mkdir } from "node:fs/promises";
import { buildBriefingPowerPoint } from "@/modules/grupamento/briefing-export";
import { briefingDate, BRIEFING_CLASSES } from "@/modules/grupamento/briefing";
import { defaultCcoMonitorConfig, parseCcoMonitorConfig } from "@/modules/grupamento/monitor";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";

const scene: MonitorDocumentSceneDto = {
  id: "fixture-scene", importId: "fixture-import", monitorId: 1, sceneOrder: 0, sceneType: "CHART",
  title: "DADOS DE TESTE", sourceFileName: "FIXTURE_TESTE.pptx", sourceImportedAt: "2026-09-29T02:00:00Z",
  sourceImportedByName: "TESTE", approvedAt: "2026-09-29", sourcePage: 1,
  payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [
    { kind: "text", x: .03, y: .02, w: .9, h: .1, z: 1, text: "DADOS DE TESTE", fontSizePt: 24, role: "title" },
    { kind: "chart", x: .03, y: .18, w: .9, h: .75, z: 2, chart: { type: "bar", grouping: "stacked", series: [{ name: "Estoque TESTE", categories: ["Jan", "Fev"], values: [10, 20], color: "#008000" }, { name: "Recebimento TESTE", categories: ["Jan", "Fev"], values: [5, 15], color: "#FFC000" }] } },
  ] } },
};

describe("Briefing editável", () => {
  it("aceita terceiro layout e mantém as configurações antigas", () => {
    const monitor = defaultCcoMonitorConfig()[0];
    for (const layout of ["mcl", "ccol", "briefing"]) expect(parseCcoMonitorConfig({ ...monitor, layout }, 1)?.layout).toBe(layout);
    expect(briefingDate("2026-09-29T02:00:00Z")).toBe("Atualizado em 28 SET 26");
  });
  it("preserva modelo original, classes, gráficos nativos e todas as linhas documentais", async () => {
    const monitors = defaultCcoMonitorConfig().slice(0, 8).map((m) => ({ ...m, layout: "mcl" as const, screens: [] }));
    const tableScene: MonitorDocumentSceneDto = { ...scene, id: "fixture-table", monitorId: 2, sceneType: "TABLE", payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [
      { kind: "table", x: .02, y: .1, w: .96, h: .8, z: 1, columns: ["Item", "Quantidade"], rows: Array.from({ length: 23 }, (_, i) => [`ITEM TESTE ${i}`, String(i)]) },
    ] } } };
    const result = await buildBriefingPowerPoint({ monitors, sag: null, rpn: null, scenes: { 1: [scene], 2: [tableScene] }, loadAsset: async () => null });
    expect(result.slideCount).toBe(10);
    const zip = await JSZip.loadAsync(result.buffer);
    const slides = await Promise.all(Array.from({ length: result.slideCount }, (_, i) => zip.file(`ppt/slides/slide${i + 1}.xml`)!.async("string")));
    expect(slides[0]).toContain("Classe I"); expect(slides[0]).toContain("Atualizado em 28 SET 26");
    expect(slides[0]).toContain("a:gradFill"); expect(slides[0]).toContain("rIdBriefing");
    expect(slides[0]).not.toContain("Material de Intend");
    for (const name of BRIEFING_CLASSES) expect(slides.join("")).toContain(name);
    for (let i = 0; i < 23; i++) expect(slides.join("")).toContain(`ITEM TESTE ${i}`);
    expect(slides[1]).toContain("<a:tbl>");
    const chart = await zip.file("ppt/charts/chart1.xml")!.async("string");
    expect(chart).toContain('val="stacked"'); expect(chart).toContain("Estoque TESTE"); expect(chart).toContain("008000");
    expect(Object.keys(zip.files).some((p) => p.endsWith(".xlsx"))).toBe(true);
    // Render fixture for visual inspection, never used as production data.
    await mkdir("/tmp/mcl-briefing-test", { recursive: true });
    await writeFile("/tmp/mcl-briefing-test/TESTE-briefing.pptx", result.buffer);
  });
  it("exporta a edição online preservando título manual, cores e imagens adicionadas", async () => {
    const online: MonitorDocumentSceneDto = { ...scene, title: "TÍTULO CORRIGIDO", payload: { ...scene.payload, onlineEditor: { version: 1, revision: 1 }, layout: { ...scene.payload.layout!, elements: [
      scene.payload.layout!.elements[1],
      { kind: "text", text: "Nota online", x: .1, y: .85, w: .6, h: .1, z: 4, color: "#ff0000", fontSizePt: 18 },
      { kind: "image", assetId: "online-image", x: .02, y: .02, w: .08, h: .08, z: 3 },
    ] } } };
    let assetsLoaded = 0;
    const result = await buildBriefingPowerPoint({ monitors: [{ ...defaultCcoMonitorConfig()[0], screens: [] }], sag: null, rpn: null, scenes: { 1: [online] }, loadAsset: async () => { assetsLoaded++; return { mimeType: "image/png", data: new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64")) }; } });
    const zip = await JSZip.loadAsync(result.buffer), xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain("TÍTULO CORRIGIDO"); expect(xml).toContain("Nota online"); expect(xml).toContain("FF0000"); expect(assetsLoaded).toBe(1);
  });
  it("recusa SAG incompleto e imagem inacessível sem entregar exportação parcial", async () => {
    const input = { monitors: defaultCcoMonitorConfig(), sag: null, rpn: null, scenes: {}, loadAsset: async () => null };
    await expect(buildBriefingPowerPoint(input)).rejects.toThrow("par SAG incompleto");
    const imageScene: MonitorDocumentSceneDto = { ...scene, payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [{ kind: "image", assetId: "missing", x: .2, y: .2, w: .5, h: .5, z: 1 }] } } };
    await expect(buildBriefingPowerPoint({ ...input, monitors: input.monitors.map((m) => ({ ...m, screens: [] })), scenes: { 1: [imageScene] } })).rejects.toThrow("Figura indisponível");
  });
});
