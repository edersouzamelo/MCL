import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import { compileMonitorInput, validateCompilerOutput } from "@/modules/grupamento/monitor-content/input-compiler";
import { normalizeMonitorTitle } from "@/modules/grupamento/monitor-content/presentation-title";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";
const source = { page: 1, rawHash: "raw", slideHash: "slide" };
const chart: MonitorSlideElement = { kind: "chart", x: .1, y: .2, w: .8, h: .7, z: 3, chart: { type: "bar", series: [{ name: "Recebido", categories: ["BIDS"], values: [123], dataLabels: ["R$ 123"] }] } };
const text: MonitorSlideElement = { kind: "text", text: "Bandeiras e distintivos", x: .2, y: .4, w: .3, h: .1, z: 1 };
describe("MCL Input Compiler foundations", () => {
  it("A: retains manual chart text and records geometric association without guessing a bar", () => {
    const input = [chart, text];
    const result = compileMonitorInput(input, source);
    expect(result.diagnostic.relations).toContainEqual({ from: "object_1", to: "object_0", type: "annotates", confidence: .9 });
    expect(result.diagnostic.atomicBlocks[0].nodeIds).toEqual(["object_0", "object_1"]);
    expect(result.elements[1]).toMatchObject({ text: text.text, x: text.x, y: text.y, chartAnnotation: true });
    expect(result.diagnostic.preflight.status).toBe("BLOCKED");
    expect(input[1].z).toBe(1);
    expect(result.diagnostic.parsedInput[1]).toEqual(text);
  });
  it("B: classifies document-like boxes and preserves duplicate strings", () => {
    const input = Array.from({ length: 5 }, (_, i) => ({ ...text, x: .1, y: i * .15, text: "Mesmo texto" }));
    const result = compileMonitorInput(input, source);
    expect(result.diagnostic.archetype).toBe("DOCUMENT_LIKE");
    expect(result.elements).toHaveLength(5);
    expect(validateCompilerOutput(input, result.elements.slice(1)).status).toBe("BLOCKED");
  });
  it("C: recognizes integral covers without title framing", () => {
    expect(compileMonitorInput([{ kind: "image", x: 0, y: 0, w: 1, h: 1, z: 0, assetKey: "cover" }], source).diagnostic).toMatchObject({ archetype: "IMAGE_FULLFRAME", strategy: "PRESERVE_COMPOSITION" });
  });
  it("D: preserves military tokens and ordinal", () => {
    expect(normalizeMonitorTitle("EXECUÇÃO ORÇAMENTÁRIA DO 9º B MNT")).toBe("Execução orçamentária do 9º B MNT");
  });
  it("E: blocks publication when the parser cannot supply faithful output", () => {
    expect(compileMonitorInput([chart], source, ["Gráfico sem renderização fiel"]).diagnostic).toMatchObject({ confidence: 0, strategy: "BLOCKED", preflight: { status: "BLOCKED" } });
  });
  it("F: never infers that a small image or nonnumeric off-frame text is disposable", () => {
    const input: MonitorSlideElement[] = [chart, { ...text, x: -.1 }, { kind: "image", x: .2, y: .3, w: .05, h: .05, z: 4, assetKey: "legend" }];
    const result = compileMonitorInput(input, source);
    expect(result.elements).toHaveLength(3);
    expect(result.diagnostic.preflight.status).toBe("PASS");
  });
  it("G: fits overflow with one transform, preserving relative distances and chart values", () => {
    const result = compileMonitorInput([{ ...chart, w: 1.3 }, { ...text, y: .02 }], source);
    expect(result.elements[0].w / result.elements[1].w).toBeCloseTo(1.3 / .3);
    expect(result.diagnostic.preflight.status).toBe("PASS");
    expect(result.elements[0].kind === "chart" && result.elements[0].chart).toEqual(chart.chart);
  });
  it("keeps the real repository briefing in preview when native crop/rotation cannot be reproduced", async () => {
    const result = await extractMonitorDocument(readFileSync("public/briefing/model.pptx"), "model.pptx");
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.scenes[0].payload.inputCompiler?.preflight.status).toBe("BLOCKED");
    expect(result.scenes[0].payload.inputCompiler?.source.rawHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.assets.length).toBeGreaterThan(0);
  });
  it("H: leaves in-frame source boxes unchanged and rejects changed chart data or table truncation", () => {
    const table: MonitorSlideElement = { kind: "table", x: .1, y: .1, w: .8, h: .8, z: 0, columns: ["OM"], rows: [["CMO"], ["9º B MNT"]] };
    expect(compileMonitorInput([chart], source).elements).toEqual([chart]);
    expect(validateCompilerOutput([table], [{ ...table, rows: [["CMO"]] }]).status).toBe("BLOCKED");
    expect(validateCompilerOutput([chart], [{ ...chart, chart: { ...chart.chart, series: [] } }]).status).toBe("BLOCKED");
  });
});
