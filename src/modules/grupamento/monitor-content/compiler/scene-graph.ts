import { createHash } from "node:crypto";
import type { MonitorSlideElement, MonitorSlideBox } from "../types";
import { monitorTitleElements } from "../presentation-title";
import { preserveChartAnnotations } from "../presentation-layout";
import { normalizeSemanticTitle, type SemanticEntry } from "./semantic-text";
import { COMPILER_VERSION, type CompilerDiagnostic, type CompilerIssue, type CompilerNode, type Archetype } from "./contracts";

const clone = <T>(value: T): T => structuredClone(value);
export const compilerHash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export function intersection(a: MonitorSlideBox, b: MonitorSlideBox) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}
export function elementStrings(element: MonitorSlideElement): string[] {
  if (element.kind === "text") return element.text.split("\n").filter(Boolean);
  if (element.kind === "table") return [...element.columns, ...element.rows.flat()];
  if (element.kind === "chart") return [element.chart.title ?? "", element.chart.xAxisTitle ?? "", element.chart.yAxisTitle ?? "", ...element.chart.series.flatMap(series => [series.name, ...series.categories, ...series.values.map(String), ...(series.dataLabels ?? []).filter((value): value is string => value !== null)])].filter(Boolean);
  return [];
}
function tokens(strings: string[]) {
  return strings.join("\n").normalize("NFC").toLocaleLowerCase("pt-BR").match(/[\p{L}\p{N}]+(?:[.,]\d+)*|[%$ºª]/gu) ?? [];
}
/** A multiset counts repeated fields/labels as well as distinct content. */
export function missingTokens(input: string[], output: string[]) {
  const counts = new Map<string, number>();
  for (const value of tokens(output)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return tokens(input).filter(value => { const count = counts.get(value) ?? 0; if (!count) return true; counts.set(value, count - 1); return false; });
}
export function fitComposition(input: MonitorSlideElement[]) {
  if (!input.length) return [];
  const left = Math.min(0, ...input.map(item => item.x)), top = Math.min(0, ...input.map(item => item.y));
  const right = Math.max(1, ...input.map(item => item.x + item.w)), bottom = Math.max(1, ...input.map(item => item.y + item.h));
  const scale = Math.min(1 / (right - left), 1 / (bottom - top));
  return clone(input).map(item => ({ ...item, x: (item.x - left) * scale, y: (item.y - top) * scale, w: item.w * scale, h: item.h * scale, ...(item.kind === "text" && item.fontSizePt ? { fontSizePt: item.fontSizePt * scale } : {}) }));
}
export function validateCompilerOutput(input: MonitorSlideElement[], output: MonitorSlideElement[], title?: string, paragraphs?: string[]): CompilerIssue[] {
  const issues: CompilerIssue[] = [];
  const lost = missingTokens(input.flatMap(elementStrings), paragraphs ? [title ?? "", ...paragraphs] : output.flatMap(elementStrings));
  if (lost.length) issues.push({ code: "TEXT_LOSS", message: `${lost.length} tokens de origem ausentes na saída.`, nodeIds: [], severity: "error" });
  const signature = (item: MonitorSlideElement) => JSON.stringify([item.kind, item.kind === "chart" ? item.chart : item.kind === "table" ? [item.columns, item.rows] : item.kind === "image" ? item.assetId ?? item.assetKey : ""]);
  const remaining = output.filter(item => ["image", "chart", "table"].includes(item.kind)).map(signature);
  for (const element of input.filter(item => ["image", "chart", "table"].includes(item.kind))) {
    const index = remaining.indexOf(signature(element));
    if (index < 0) issues.push({ code: "OBJECT_LOSS", message: `Objeto informacional ${element.kind} ausente ou alterado.`, nodeIds: [], severity: "error" });
    else remaining.splice(index, 1);
  }
  for (const [index, element] of output.entries()) {
    if (![element.x, element.y, element.w, element.h].every(Number.isFinite) || element.w <= 0 || element.h <= 0 || element.x < -1e-6 || element.y < -1e-6 || element.x + element.w > 1.000001 || element.y + element.h > 1.000001) issues.push({ code: "OUTSIDE_FRAME", message: "Geometria inválida ou fora do frame.", nodeIds: [String(index)], severity: "error" });
  }
  return issues;
}
export function compileSlide(input: {
  elements: MonitorSlideElement[]; title: string; page: number; rawHash: string; structuralHash: string;
  native?: Array<Partial<CompilerNode>>; issues?: CompilerIssue[]; catalog?: SemanticEntry[];
}) {
  const elements = clone(input.elements);
  const nodes: CompilerNode[] = elements.map((element, index) => ({ id: `s${input.page}:o${index}`, origin: `ppt/slides/slide${input.page}.xml`, children: [], confidence: .98, ...input.native?.[index], element }));
  const nativeCounts = new Map<string, number>();
  for (const node of nodes) {
    if (node.nativeId) {
      const key = `${node.origin}:${node.nativeId}`;
      const part = nativeCounts.get(key) ?? 0;
      nativeCounts.set(key, part + 1);
      node.id = `${key}:${part}`;
    }
    node.element.elementId = node.id;
  }
  const relations: CompilerDiagnostic["interpretedContent"]["relations"] = [];
  for (const a of nodes) for (const b of nodes) {
    if (a.id === b.id) continue;
    const overlap = intersection(a.element, b.element), area = a.element.w * a.element.h;
    if (overlap > 0 && area > 0) {
      const ratio = overlap / area;
      relations.push({ from: a.id, to: b.id, type: ratio >= .95 ? "inside" : "overlaps", confidence: ratio >= .95 ? .98 : .7 });
      if (ratio >= .95) relations.push({ from: b.id, to: a.id, type: "contains", confidence: .98 });
      if (a.element.kind === "text" && ["chart", "image", "table"].includes(b.element.kind) && ratio >= .5) {
        const type = b.element.kind === "chart" ? "belongs_to_chart" : b.element.kind === "image" ? "belongs_to_image" : "belongs_to_table";
        relations.push({ from: a.id, to: b.id, type, confidence: .9 });
        relations.push({ from: a.id, to: b.id, type: "annotates", confidence: .9 });
      }
    } else {
      const dx = Math.max(0, a.element.x - b.element.x - b.element.w, b.element.x - a.element.x - a.element.w);
      const dy = Math.max(0, a.element.y - b.element.y - b.element.h, b.element.y - a.element.y - a.element.h);
      if (Math.hypot(dx, dy) < .025) relations.push({ from: a.id, to: b.id, type: "near", confidence: .6 });
    }
  }
  const charts = elements.filter(item => item.kind === "chart"), tables = elements.filter(item => item.kind === "table"), images = elements.filter(item => item.kind === "image");
  const texts = elements.filter(item => item.kind === "text");
  const fullImage = !charts.length && !tables.length && images.some(item => item.w >= .85 && item.h >= .85);
  const textLines = texts.reduce((sum, item) => sum + item.text.split("\n").filter(Boolean).length, 0);
  let archetype: Archetype = fullImage ? "IMAGE_FULLFRAME" : charts.length && !tables.length && !images.length ? "CHART_CENTRIC" : tables.length && !charts.length && !images.length ? "TABLE_CENTRIC" : charts.length || tables.length || images.length ? "MIXED" : textLines >= 4 ? "DOCUMENT_LIKE" : texts.length ? "TEXT_CENTRIC" : "UNKNOWN";
  if (images.length === 1 && !texts.length && !charts.length && !tables.length && !fullImage) archetype = "COVER";
  const atomicBlocks: CompilerDiagnostic["interpretedContent"]["atomicBlocks"] = [];
  for (const node of nodes.filter(item => ["chart", "image", "table"].includes(item.element.kind))) {
    const linked = relations.filter(relation => relation.to === node.id && relation.type === "annotates").map(relation => relation.from);
    if (linked.length) atomicBlocks.push({ type: "ATOMIC_VISUAL_BLOCK", nodeIds: [node.id, ...linked], reason: "A anotação depende da composição nativa e não pode ser reposicionada independentemente." });
  }
  const complexChart = charts.some(item => ["unknown", "scatter", "area"].includes(item.chart.type) || item.chart.series.some(series => series.missingValueIndices?.length));
  if (complexChart || archetype === "UNKNOWN" || archetype === "MIXED") atomicBlocks.push({ type: "ATOMIC_VISUAL_BLOCK", nodeIds: nodes.map(item => item.id), reason: "Composição ambígua ou gráfico fora do contrato do renderer estrutural." });
  const annotated = preserveChartAnnotations(clone(elements)).map((element, i) => element.kind === "text" && relations.some(relation => relation.from === nodes[i].id && relation.type === "belongs_to_chart") ? {
    ...element, chartAnnotation: true as const, role: "label" as const, z: Math.max(element.z, ...charts.map(chart => chart.z + 1)),
  } : element);
  const fallbackTitle = annotated.filter(item => item.kind === "text").every(item => item.chartAnnotation) && charts.length === 1 ? charts[0].chart.title ?? input.title : input.title;
  const prepared = monitorTitleElements(annotated, fallbackTitle);
  const normalizedTitle = normalizeSemanticTitle(prepared.title, input.catalog);
  const document = ["DOCUMENT_LIKE", "TEXT_CENTRIC"].includes(archetype) && !charts.length && !tables.length && !images.length;
  const paragraphs = document ? [...prepared.elements].filter(item => item.kind === "text").sort((a, b) => a.y - b.y || a.x - b.x).flatMap(item => item.text.split("\n").filter(Boolean)) : undefined;
  const neutral = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const redundant = nodes.filter(node => node.element.kind === "shape" && !node.element.lineColor && neutral.has(node.element.fill?.toUpperCase() ?? "") && node.element.w * node.element.h >= .04
    && charts.some(chart => chart.z > node.element.z && intersection(node.element, chart) / (node.element.w * node.element.h) >= .25)
    && !texts.some(text => intersection(node.element, text) > 0));
  const redundantIds = new Set(redundant.map(node => node.id));
  const output = fitComposition(annotated.filter((_, index) => !redundantIds.has(nodes[index].id)));
  const issues = [...input.issues ?? [], ...validateCompilerOutput(elements, output, prepared.title, paragraphs)];
  const needsNative = issues.some(issue => issue.severity === "error") || atomicBlocks.length > 0;
  const confidence = needsNative ? .4 : document || fullImage ? .98 : .85;
  const diagnostic: CompilerDiagnostic = {
    version: COMPILER_VERSION, source: { rawHash: input.rawHash, page: input.page, structuralHash: input.structuralHash, parserVersion: 2 },
    parsedInput: { nodes, sourceStrings: elements.flatMap(elementStrings), issues: clone(input.issues ?? []) },
    interpretedContent: { archetype, confidence, relations, atomicBlocks, protectedTokens: normalizedTitle.protectedTokens },
    normalizedContent: { title: normalizedTitle.text, elements: output, paragraphs, transformations: [{ action: document ? "DOCUMENT_REFLOW" : "AFFINE_FIT", reason: "Preservar conteúdo e adaptar ao frame sem remover objetos por aparência.", nodeIds: nodes.map(node => node.id) }, ...redundant.map(node => ({ action: "REMOVE_REDUNDANT_BACKGROUND", reason: "Fundo neutro sem contorno nem interseção com texto, atrás de gráfico. Confiança estrutural 0.95; origem preservada.", nodeIds: [node.id] }))] },
    strategy: needsNative ? "BLOCKED" : fullImage ? "NATIVE_IMAGE" : document ? "DOCUMENT_REFLOW" : "STRUCTURED",
    preflight: { status: needsNative ? "BLOCKED" : "PASS", issues, inputStrings: elements.flatMap(elementStrings).length, outputStrings: paragraphs ? paragraphs.length + 1 : output.flatMap(elementStrings).length, inputObjects: elements.length, outputObjects: output.length, visual: "PENDING" },
    fallbackReason: needsNative ? [...issues.map(issue => issue.message), ...atomicBlocks.map(block => block.reason)].join(" ") : undefined,
    llm: { calls: 0, cache: "NOT_NEEDED" },
  };
  return diagnostic;
}
