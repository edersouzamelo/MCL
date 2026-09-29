import type { MonitorSlideElement, MonitorSlideTextElement } from "./types";

function hex(value?: string) {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return value.toUpperCase();
}

function rgb(value: string) {
  const normalized = hex(value);
  if (!normalized) return null;
  return [1, 3, 5].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16) / 255);
}

export function luminance(value?: string) {
  const parts = value ? rgb(value) : null;
  if (!parts) return null;
  const linear = parts.map((item) => item <= 0.03928 ? item / 12.92 : Math.pow((item + 0.055) / 1.055, 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(a?: string, b?: string) {
  const left = luminance(a);
  const right = luminance(b);
  if (left === null || right === null) return null;
  const light = Math.max(left, right);
  const dark = Math.min(left, right);
  return (light + 0.05) / (dark + 0.05);
}

function intersectionArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}

export function localBackgroundForText(text: MonitorSlideTextElement, elements: MonitorSlideElement[], ccol: boolean) {
  const area = Math.max(0.000001, text.w * text.h);
  const candidates = elements
    .filter((item) => item.kind === "shape" && item.z < text.z && Boolean(item.fill))
    .map((item) => ({ item, coverage: intersectionArea(text, item) / area }))
    .filter(({ coverage }) => coverage >= 0.35)
    .sort((a, b) => b.item.z - a.item.z || b.coverage - a.coverage);

  return candidates[0]?.item.kind === "shape" && candidates[0].item.fill
    ? candidates[0].item.fill
    : ccol ? "#FFFFFF" : "#020617";
}

export function readableTextColor(original: string | undefined, background: string, role?: MonitorSlideTextElement["role"]) {
  const preferred = hex(original);
  const minimum = role === "title" || role === "metric" ? 3 : 4.5;
  if (preferred) {
    const ratio = contrastRatio(preferred, background);
    if (ratio !== null && ratio >= minimum) return preferred;
  }

  const black = "#0F172A";
  const white = "#F8FAFC";
  const blackRatio = contrastRatio(black, background) ?? 0;
  const whiteRatio = contrastRatio(white, background) ?? 0;
  return whiteRatio >= blackRatio ? white : black;
}

export function presentationTextColor(text: MonitorSlideTextElement, elements: MonitorSlideElement[], ccol: boolean) {
  return readableTextColor(text.color, localBackgroundForText(text, elements, ccol), text.role);
}
