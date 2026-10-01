import { describe, it, expect, vi } from "vitest";
import { compileSlide, fitComposition, validateCompilerOutput, missingTokens } from "@/modules/grupamento/monitor-content/compiler/scene-graph";
import { normalizeSemanticTitle } from "@/modules/grupamento/monitor-content/compiler/semantic-text";
import { finalizeCompilation, compilationMetrics } from "@/modules/grupamento/monitor-content/compiler/pipeline";
import { classifyAmbiguity, type SemanticClassifier } from "@/modules/grupamento/monitor-content/compiler/semantic-classifier";
import type { MonitorDocumentExtraction, MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";

const text = (value: string, x = .1, y = .1): MonitorSlideElement => ({ kind: "text", text: value, x, y, w: .8, h: .1, z: 1, fontSizePt: 24 });
const chart: MonitorSlideElement = { kind: "chart", x: .1, y: .2, w: .8, h: .7, z: 2, chart: { type: "bar", title: "Recebidos", xAxisTitle: "PI", yAxisTitle: "R$", legendPosition: "bottom", series: [{ name: "Crédito", categories: ["A", "B"], values: [10, 20], dataLabels: ["10 reais", "20 reais"] }] } };
const compile = (elements: MonitorSlideElement[], issues: Parameters<typeof compileSlide>[0]["issues"] = []) => compileSlide({ elements, title: "Slide 1", page: 1, rawHash: "a".repeat(64), structuralHash: "b".repeat(64), issues });

describe("universal compiler invariants", () => {
  it("A: links manual text to a chart and keeps source geometry immutable", () => {
    const elements = [chart, text("86% disponíveis", .3, .4)]; const before = structuredClone(elements);
    const result = compile(elements);
    expect(elements).toEqual(before); expect(result.strategy).toBe("BLOCKED");
    expect(result.interpretedContent.atomicBlocks[0].nodeIds).toHaveLength(2);
    expect(result.interpretedContent.relations.some(relation => relation.type === "belongs_to_chart")).toBe(true);
    expect(result.parsedInput.nodes[1].element.z).toBe(1);
    expect(result.normalizedContent.elements[1].z).toBeGreaterThan(chart.z);
  });
  it("B: treats document text as ordered paragraphs including repetitions", () => {
    const result = compile([text("Relatório", .1, .05), text("Origem: Alpha", .1, .2), text("Destino: Beta", .1, .35), text("Destino: Beta", .1, .5)]);
    expect(result.strategy).toBe("DOCUMENT_REFLOW"); expect(result.interpretedContent.archetype).toBe("DOCUMENT_LIKE");
    expect(result.normalizedContent.paragraphs).toEqual(["Origem: Alpha", "Destino: Beta", "Destino: Beta"]); expect(result.preflight.status).toBe("PASS");
  });
  it("C: integral covers retain their image without a reconstructed title", () => {
    const result = compile([{ kind: "image", assetKey: "cover", x: 0, y: 0, w: 1, h: 1, z: 1 }]);
    expect(result.interpretedContent.archetype).toBe("IMAGE_FULLFRAME"); expect(result.strategy).toBe("NATIVE_IMAGE");
  });
  it.each([
    ["EXECUÇÃO ORÇAMENTÁRIA DO 9º B MNT", "Execução orçamentária do 9º B MNT"],
    ["TRANSPORTE PARA RIO DE JANEIRO", "Transporte para Rio de Janeiro"],
    ["MISSÕES EM CAMPO GRANDE E SÃO PAULO", "Missões em Campo Grande e São Paulo"],
    ["Execução de Projeto Aurora", "Execução de Projeto Aurora"],
    ["RECURSOS DO PROJETO XENOVIA", "Recursos do PROJETO XENOVIA"],
  ])("D: normalizes known words and protects entities: %s", (source, expected) => expect(normalizeSemanticTitle(source).text).toBe(expected));
  it("uses reusable catalog entities and preserves provenance", () => {
    const result = normalizeSemanticTitle("EXECUÇÃO POR PI AA001", [{ value: "AA001", canonical: "AA001", category: "PI", provenance: "SAG catalog" }]);
    expect(result.protectedTokens).toContainEqual({ source: "AA001", normalized: "AA001", category: "PI", provenance: "SAG catalog" });
  });
  it("E: preserves unsupported chart composition atomically", () => {
    const result = compile([{ ...chart, chart: { ...chart.chart, type: "scatter" } }]);
    expect(result.strategy).toBe("BLOCKED"); expect(result.interpretedContent.atomicBlocks[0].type).toBe("ATOMIC_VISUAL_BLOCK");
  });
  it("F: keeps small images and uncertain shapes; only redundant neutral chart backgrounds may be removed", () => {
    const small: MonitorSlideElement = { kind: "image", assetKey: "meaningful-small", x: .95, y: .02, w: .02, h: .02, z: 3 };
    const result = compile([chart, small]); expect(result.normalizedContent.elements).toContainEqual(small);
    const shape: MonitorSlideElement = { kind: "shape", x: .1, y: .2, w: .8, h: .7, z: 0, fill: "#F8FAFC" };
    const removed = compile([shape, chart]); expect(removed.parsedInput.nodes[0].element).toEqual(shape); expect(removed.normalizedContent.elements).toHaveLength(1);
    expect(compile([shape, chart, text("Nota", .2, .3)]).normalizedContent.elements.some(item => item.kind === "shape")).toBe(true);
  });
  it("G: applies the same affine transform to all dependent objects", () => {
    const source = [{ ...chart, x: -.2, w: 1.4 }, text("Anotação", .3, .3)];
    const output = fitComposition(source);
    expect(validateCompilerOutput(source, output)).toEqual([]);
    expect((output[1].x - output[0].x) / output[0].w).toBeCloseTo((source[1].x - source[0].x) / source[0].w);
  });
  it("H: rejects losses in series, labels, units, repeated words and tables", () => {
    expect(missingTokens(["Beta Beta"], ["Beta"])).toEqual(["beta"]);
    expect(validateCompilerOutput([chart], [{ ...chart, chart: { ...chart.chart, yAxisTitle: undefined } }]).map(issue => issue.code)).toContain("OBJECT_LOSS");
    const table: MonitorSlideElement = { kind: "table", x: 0, y: 0, w: 1, h: 1, z: 1, columns: ["Item"], rows: [["A"], ["B"]] };
    expect(validateCompilerOutput([table], [{ ...table, rows: [["A"]] }]).some(issue => issue.code === "OBJECT_LOSS")).toBe(true);
  });
  it("native fallback resolves a blocked composition using its verified reference", async () => {
    const diagnostic = compile([chart, text("Nota", .2, .4)]);
    const extraction: MonitorDocumentExtraction = { scenes: [{ sceneType: "CHART", title: "Teste", sourcePage: 1, payload: { inputCompiler: diagnostic } }], assets: [], warnings: [] };
    const renderer = vi.fn().mockResolvedValue([{ page: 1, sha256: "c".repeat(64), rendererVersion: "test", text: "Nota", asset: { key: "native", fileName: "source.png", mimeType: "image/png", width: 1920, height: 1080, data: Buffer.from("image") } }]);
    const result = await finalizeCompilation(Buffer.from("source"), "pptx", extraction, renderer);
    expect(result.scenes[0].payload.inputCompiler).toMatchObject({ strategy: "NATIVE_FALLBACK", preflight: { status: "PASS", visual: "NATIVE_VERIFIED" } });
  });
  it("native text loss never unlocks publication", async () => {
    const extraction: MonitorDocumentExtraction = { scenes: [{ sceneType: "TEXT", title: "Teste", sourcePage: 1, payload: { inputCompiler: compile([text("Documento confidencial")], [{ code: "GROUP", message: "group", severity: "error", nodeIds: [] }]) } }], assets: [], warnings: [] };
    const result = await finalizeCompilation(Buffer.from("source"), "pptx", extraction, async () => [{ page: 1, sha256: "c".repeat(64), rendererVersion: "test", text: "Documento", asset: { key: "native", fileName: "source.png", mimeType: "image/png", width: 1920, height: 1080, data: Buffer.from("image") } }]);
    expect(result.scenes[0].payload.inputCompiler?.preflight.status).toBe("BLOCKED");
  });
  it("optional LLM rejects invented IDs and cannot authorize a blocked scene", async () => {
    const diagnostic = compile([chart, text("Anotação", .2, .4)]);
    const classifier: SemanticClassifier = { model: "test/model", getCached: async () => null, cache: vi.fn(), classify: async () => ({ archetype: "CHART_CENTRIC", confidence: 1, objects: [{ id: "invented", role: "body" }] }) };
    await classifyAmbiguity(diagnostic, classifier);
    expect(diagnostic.llm.rejected).toBeTruthy(); expect(diagnostic.preflight.status).toBe("BLOCKED"); expect(classifier.cache).not.toHaveBeenCalled();
  });
  it("semantic cache avoids repeat external calls without relaxing preflight", async () => {
    const diagnostic = compile([chart, text("Anotação", .2, .4)]);
    const classifier: SemanticClassifier = { model: "test/model", getCached: async () => ({ archetype: "CHART_CENTRIC", confidence: .9, objects: [] }), cache: vi.fn(), classify: vi.fn() };
    await classifyAmbiguity(diagnostic, classifier);
    expect(diagnostic.llm.cache).toBe("HIT"); expect(classifier.classify).not.toHaveBeenCalled(); expect(diagnostic.preflight.status).toBe("BLOCKED");
  });
  it("quality telemetry never equates absence of edits with verified fidelity", () => {
    const diagnostic = compile([text("Relatório")]); expect(compilationMetrics([diagnostic]).verifiedWithoutManualCorrectionPercent).toBeNull();
    diagnostic.humanReview = { outcome: "CORRECT", actorId: "operator", at: "2026-10-01" };
    expect(compilationMetrics([diagnostic]).verifiedSampleSize).toBe(1);
  });
});
