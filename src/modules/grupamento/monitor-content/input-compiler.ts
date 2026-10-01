import type { MonitorSlideBox, MonitorSlideElement } from "./types";
import { preserveChartAnnotations } from "./presentation-layout";

// Integrity > readability > organization > aesthetics. UNKNOWN is a valid result.
export type SlideArchetype = "COVER" | "CHART_CENTRIC" | "TABLE_CENTRIC" | "DOCUMENT_LIKE" | "IMAGE_FULLFRAME" | "TEXT_CENTRIC" | "MIXED" | "UNKNOWN";
export type CompilerDiagnostic = {
  version: 1;
  source: { page: number; slideHash: string; rawHash: string };
  parsedInput: MonitorSlideElement[];
  nodes: Array<{ id: string; origin: string; element: MonitorSlideElement; confidence: number }>;
  relations: Array<{ from: string; to: string; type: "inside" | "overlaps" | "annotates"; confidence: number }>;
  archetype: SlideArchetype;
  confidence: number;
  transformations: Array<{ nodeId: string; action: "REMOVE_REDUNDANT_BACKGROUND"; confidence: number; reason: string }>;
  atomicBlocks: Array<{ type: "ATOMIC_VISUAL_BLOCK"; nodeIds: string[]; reason: string }>;
  strategy: "REFLOW" | "PRESERVE_COMPOSITION" | "BLOCKED";
  preflight: { status: "PASS" | "BLOCKED"; issues: string[]; inputObjects: number; outputObjects: number };
  llmCalls: 0;
};

function intersection(a: MonitorSlideBox, b: MonitorSlideBox) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}

/** Compare multisets, including duplicate strings, complete chart data and table cells.
 * Geometry/style may change. A retained object does not prove pixel-level fidelity. */
export function validateCompilerOutput(input: MonitorSlideElement[], output: MonitorSlideElement[]) {
  const signature = (item: MonitorSlideElement) => JSON.stringify(item.kind === "text" ? [item.kind, item.text] : item.kind === "chart" ? [item.kind, item.chart] : item.kind === "table" ? [item.kind, item.columns, item.rows] : item.kind === "image" ? [item.kind, item.assetId ?? item.assetKey] : [item.kind, item.fill, item.lineColor]);
  const remaining = output.map(signature);
  const issues: string[] = [];
  for (const item of input) {
    const index = remaining.indexOf(signature(item));
    if (index < 0) issues.push(`Objeto perdido ou alterado: ${item.kind}`);
    else remaining.splice(index, 1);
  }
  for (const item of output) {
    if (![item.x, item.y, item.w, item.h].every(Number.isFinite) || item.w <= 0 || item.h <= 0) issues.push("Geometria inválida");
    else if (item.x < -1e-6 || item.y < -1e-6 || item.x + item.w > 1.000001 || item.y + item.h > 1.000001) issues.push("Objeto fora do frame");
  }
  return { status: issues.length ? "BLOCKED" as const : "PASS" as const, issues, inputObjects: input.length, outputObjects: output.length };
}

/** One affine transform for the entire composition, never independent movement of annotations. */
export function fitCompilerComposition(elements: MonitorSlideElement[]) {
  if (!elements.length) return [];
  const left = Math.min(0, ...elements.map(item => item.x));
  const top = Math.min(0, ...elements.map(item => item.y));
  const right = Math.max(1, ...elements.map(item => item.x + item.w));
  const bottom = Math.max(1, ...elements.map(item => item.y + item.h));
  const scale = Math.min(1 / (right - left), 1 / (bottom - top));
  return elements.map(item => ({ ...item, x: (item.x - left) * scale + (1 - (right - left) * scale) / 2, y: (item.y - top) * scale + (1 - (bottom - top) * scale) / 2, w: item.w * scale, h: item.h * scale, ...(item.kind === "text" && item.fontSizePt ? { fontSizePt: item.fontSizePt * scale } : {}) }));
}

export function compileMonitorInput(elements: MonitorSlideElement[], source: CompilerDiagnostic["source"], parserIssues: string[] = []) {
  const parsedInput = structuredClone(elements);
  const nodes = parsedInput.map((element, i) => ({ id: `object_${i}`, origin: `ppt/slides/slide${source.page}.xml`, element, confidence: 1 }));
  const relations: CompilerDiagnostic["relations"] = [];
  for (const a of nodes) for (const b of nodes) {
    if (a.id === b.id) continue;
    const overlap = intersection(a.element, b.element);
    if (!overlap) continue;
    const ratio = overlap / Math.max(1e-9, a.element.w * a.element.h);
    relations.push({ from: a.id, to: b.id, type: a.element.kind === "text" && b.element.kind === "chart" && ratio >= .8 ? "annotates" : ratio >= .95 ? "inside" : "overlaps", confidence: ratio >= .8 ? .9 : .5 });
  }
  const charts = nodes.filter(n => n.element.kind === "chart");
  const tables = nodes.filter(n => n.element.kind === "table");
  const images = nodes.filter(n => n.element.kind === "image");
  const texts = nodes.filter(n => n.element.kind === "text");
  const full = !charts.length && !tables.length && images.some(n => n.element.w >= .75 && n.element.h >= .75 && n.element.w * n.element.h >= .6);
  const kinds = Number(charts.length > 0) + Number(tables.length > 0) + Number(images.length > 0);
  const archetype: SlideArchetype = full ? "IMAGE_FULLFRAME" : kinds > 1 ? "MIXED" : charts.length ? "CHART_CENTRIC" : tables.length ? "TABLE_CENTRIC" : !images.length && texts.length >= 4 ? "DOCUMENT_LIKE" : !images.length && texts.length ? "TEXT_CENTRIC" : "UNKNOWN";
  const atomicBlocks: CompilerDiagnostic["atomicBlocks"] = charts.flatMap(chart => {
    const annotations = relations.filter(r => r.to === chart.id && r.type === "annotates").map(r => r.from);
    return annotations.length ? [{ type: "ATOMIC_VISUAL_BLOCK" as const, nodeIds: [chart.id, ...annotations], reason: "Anotações dependem da composição do gráfico; coordenadas mantidas em conjunto." }] : [];
  });
  if (archetype === "MIXED" || archetype === "UNKNOWN") atomicBlocks.push({ type: "ATOMIC_VISUAL_BLOCK", nodeIds: nodes.map(n => n.id), reason: "Composição ambígua preservada; remoção automática desabilitada." });
  const neutral = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const redundant = nodes.filter(n => n.element.kind === "shape" && !n.element.lineColor && neutral.has(n.element.fill?.toUpperCase() ?? "") && n.element.w * n.element.h >= .04
    && charts.some(c => c.element.z > n.element.z && intersection(n.element, c.element) / (n.element.w * n.element.h) >= .25)
    && !texts.some(t => intersection(n.element, t.element) > 0));
  const transformations: CompilerDiagnostic["transformations"] = redundant.map(n => ({ nodeId: n.id, action: "REMOVE_REDUNDANT_BACKGROUND", confidence: .95, reason: "Fundo neutro atrás do gráfico, sem contorno nem texto sobreposto; original mantido no Scene Graph." }));
  const retained = nodes.filter(n => !redundant.includes(n)).map(n => n.element);
  const output = fitCompilerComposition(preserveChartAnnotations(structuredClone(retained)));
  const preflight = validateCompilerOutput(retained, output);
  preflight.inputObjects = parsedInput.length;
  // Recharts does not expose the native plot rectangle. Retaining a text box is
  // insufficient to prove association with the same native bar after redraw.
  if (relations.some(r => r.type === "annotates")) preflight.issues.push("Gráfico com anotações manuais exige fallback visual do original; associação à barra ainda não verificada.");
  preflight.issues.push(...parserIssues);
  if (preflight.issues.length) preflight.status = "BLOCKED";
  const diagnostic: CompilerDiagnostic = { version: 1, source, parsedInput, nodes, relations, archetype, confidence: preflight.status === "BLOCKED" ? 0 : atomicBlocks.length ? .6 : archetype === "UNKNOWN" ? .3 : .9, atomicBlocks, transformations, strategy: preflight.status === "BLOCKED" ? "BLOCKED" : atomicBlocks.length || full ? "PRESERVE_COMPOSITION" : "REFLOW", preflight, llmCalls: 0 };
  return { elements: output, diagnostic };
}
