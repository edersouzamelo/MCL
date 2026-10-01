import { z } from "zod";
import type { MonitorDocumentSceneDto, MonitorSlideElement } from "./types";
import { normalizeMonitorTitle, monitorTitleElements, monitorIntegralImage } from "./presentation-title";
import { prepareMonitorElements } from "./presentation-layout";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const box = { x: z.number().finite().min(-2).max(2), y: z.number().finite().min(-2).max(2), w: z.number().finite().positive().max(3), h: z.number().finite().positive().max(3), z: z.number().int().min(0).max(1000) };
const string = z.string().max(12000);
const series = z.looseObject({ name: string, categories: z.array(string).max(500), values: z.array(z.number().finite()).max(500), color: color.optional(), pointColors: z.array(color.nullable()).max(500).optional() });
const chart = z.looseObject({ type: z.enum(["bar", "line", "pie", "doughnut", "area", "scatter", "unknown"]), series: z.array(series).min(1).max(30) });
export const editorElementSchema = z.discriminatedUnion("kind", [
  z.object({ ...box, kind: z.literal("text"), text: string, fontSizePt: z.number().min(10).max(72).optional(), fontFace: z.literal("Arial").optional(), bold: z.boolean().optional(), align: z.enum(["left", "center", "right"]).optional(), verticalAlign: z.enum(["top", "middle", "bottom"]).optional(), color: color.optional(), fill: color.optional(), lineColor: color.optional(), role: z.enum(["body", "metric", "label"]).optional() }),
  z.object({ ...box, kind: z.literal("image"), assetId: z.string().uuid() }),
  z.object({ ...box, kind: z.literal("shape"), fill: color.optional(), lineColor: color.optional(), opacity: z.number().min(0).max(1).optional(), radius: z.number().min(0).max(.5).optional() }),
  z.object({ ...box, kind: z.literal("chart"), chart }),
  z.object({ ...box, kind: z.literal("table"), columns: z.array(string).max(50), rows: z.array(z.array(string).max(50)).max(1000) }),
]);
export const editorSaveSchema = z.object({ scenes: z.array(z.object({ id: z.string().uuid(), revision: z.number().int().nonnegative(), title: z.string().trim().min(1).max(240), elements: z.array(editorElementSchema).max(150) })).min(1).max(80) });
export type EditorScene = MonitorDocumentSceneDto;
export function editorRevision(scene: Pick<EditorScene, "payload">) { return scene.payload.onlineEditor?.revision ?? 0; }

/** Convert once to the same body coordinates used by the presentation. */
export function prepareEditorScene(scene: EditorScene): EditorScene {
  scene = structuredClone(scene);
  if (scene.payload.onlineEditor || !scene.payload.layout) return scene;
  const integral = monitorIntegralImage(scene.payload);
  const prepared = scene.payload.inputCompiler?.strategy === "PRESERVE_COMPOSITION" ? { elements: scene.payload.layout.elements, title: scene.title } : monitorTitleElements(scene.payload.inputCompiler ? scene.payload.layout.elements : prepareMonitorElements(scene.payload.layout.elements).elements, scene.title);
  const elements = (integral ? scene.payload.layout.elements : prepared.elements).map(item => item.kind === "text" ? {
    ...item, fontFace: "Arial", fontSizePt: Math.max(10, Math.min(72, item.fontSizePt ?? 18)), role: item.role === "title" ? "body" as const : item.role,
    color: /^#[0-9a-f]{6}$/i.test(item.color ?? "") ? item.color : "#111827",
  } : item).map(item => {
    if (item.kind === "text" || item.kind === "shape") for (const key of ["fill", "lineColor"] as const) if (item[key] && !/^#[0-9a-f]{6}$/i.test(item[key])) delete item[key];
    return item;
  });
  return { ...structuredClone(scene), title: normalizeMonitorTitle(integral ? scene.title : prepared.title), payload: { ...scene.payload, onlineEditor: { version: 1, revision: 0 }, layout: { ...scene.payload.layout, elements } } };
}

export function optimizeEditorElements(input: MonitorSlideElement[], arrange = false): MonitorSlideElement[] {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const elements = structuredClone(input).map(item => {
    if (item.kind === "image" && item.x === 0 && item.y === 0 && item.w === 1 && item.h === 1) return item;
    const w = clamp(item.w, .04, .96), h = clamp(item.h, .04, .96);
    return { ...item, w, h, x: clamp(Math.round(item.x * 200) / 200, .02, .98 - w), y: clamp(Math.round(item.y * 200) / 200, .02, .98 - h) };
  });
  const content = elements.filter(item => item.kind !== "shape");
  const panels = content.filter(item => ["chart", "table", "image"].includes(item.kind));
  const overlap = content.some((a, i) => content.slice(i + 1).some(b => {
    if ((a.kind === "text" && (a.role === "label" || a.role === "metric")) || (b.kind === "text" && (b.role === "label" || b.role === "metric"))) return false;
    return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) > Math.min(a.w * a.h, b.w * b.h) * .35;
  }));
  if ((arrange || overlap) && content.length > 0 && content.length <= 12) {
    const notes = content.filter(item => item.kind === "text");
    if (panels.length === 1 && ["chart", "table"].includes(panels[0].kind) && notes.length === content.length - 1 && notes.length <= 4) {
      Object.assign(panels[0], { x: .03, y: .03, w: .94, h: notes.length ? .70 : .94 });
      notes.forEach((item, i) => Object.assign(item, { x: .03 + i * .94 / notes.length, y: .76, w: .94 / notes.length - .02, h: .20 }));
    } else {
      const columns = content.length === 1 ? 1 : 2, rows = Math.ceil(content.length / columns);
      content.forEach((item, i) => { item.x = .03 + (i % columns) * .94 / columns; item.y = .03 + Math.floor(i / columns) * .94 / rows; item.w = .94 / columns - .02; item.h = .94 / rows - .02; });
    }
  }
  for (const item of content) if (item.kind === "text") {
    let size = item.fontSizePt ?? 18;
    const lines = (pointSize: number) => item.text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(1, item.w * 1920 / (pointSize * 1.33 * .55)))), 0);
    while (size > 10 && lines(size) * size * 1.33 * 1.12 > item.h * 900) size--;
    item.fontSizePt = size;
  }
  return elements;
}

/** Graph values and metadata remain identical; only series and column colors can change. */
export function chartWithoutColors(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(chartWithoutColors);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "color" && key !== "pointColors").sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, chartWithoutColors(item)]));
  return value;
}
