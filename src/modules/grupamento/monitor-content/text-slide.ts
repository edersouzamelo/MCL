import { monitorTitleElements } from "./presentation-title";
import type { MonitorDocumentScenePayload, MonitorSlideTextElement } from "./types";

/** Reports made of text panels need measured flow, rather than fixed PPT boxes.
 * Mixed slides, diagrams, flattened covers and user-corrected layouts stay intact.
 */
export function monitorTextSlide(payload: MonitorDocumentScenePayload, title: string) {
  if (!payload.layout || payload.onlineEditor || payload.correction?.preserveLayout) return null;
  const elements = payload.layout.elements;
  if (elements.some(item => item.kind === "image" || item.kind === "chart" || item.kind === "table")) return null;
  const texts = elements.filter((item): item is MonitorSlideTextElement => item.kind === "text");
  const panelShapes = elements.filter(item => item.kind === "shape");
  if (panelShapes.some(shape => shape.w * shape.h < .04 || (shape.w * shape.h < .9 && !texts.some(text => {
    const w = Math.max(0, Math.min(shape.x + shape.w, text.x + text.w) - Math.max(shape.x, text.x));
    const h = Math.max(0, Math.min(shape.y + shape.h, text.y + text.h) - Math.max(shape.y, text.y));
    return w * h / (shape.w * shape.h) >= .8;
  })))) return null;
  const prepared = monitorTitleElements(elements, title);
  const body = prepared.elements.filter((item): item is MonitorSlideTextElement => item.kind === "text")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const fields = body.filter(item => /^[^:\n]{2,48}\s*[:\-–]\s*\S/u.test(item.text)).length;
  if (body.length < 3 || (fields < 2 && body.reduce((sum, item) => sum + item.text.length, 0) < 600)) return null;
  return { title: prepared.title, paragraphs: body.map(item => item.text) };
}
