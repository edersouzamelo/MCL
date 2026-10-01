import type { MonitorDocumentScenePayload, MonitorSlideElement, MonitorSlideTextElement } from "./types";

const ACRONYMS = new Set("B MNT BI BIM BDA INF MTZ CMEC C MEC BSUP SUP LOG RM AAAE FRON ADM AP CATSER MCL CMO CCOL OM OMDS UG UGS UASG PI PIS MEM QDMP PEEX SISCOFIS PRDU IRDU PCA PNCP CATMAT DFD SAG RPN RP ARP SISFRON EB PASA I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX".split(" "));

/** Sentence case, preserving institutional acronyms, Roman numerals and identifiers. */
export function normalizeMonitorTitle(value: string) {
  const clean = value.normalize("NFC").replace(/[–—]/g, ":").replace(/(?<=\p{L})-(?=\p{L})/gu, " ").replace(/\s+/g, " ").trim();
  let firstWord = true;
  return clean.replace(/[\p{L}\p{N}]+(?:[ºª])?/gu, (word) => {
    const upper = word.toLocaleUpperCase("pt-BR");
    const first = firstWord;
    firstWord = false;
    if (ACRONYMS.has(upper) || /\p{L}.*\d|\d.*\p{L}/u.test(word)) return upper;
    const lower = word.toLocaleLowerCase("pt-BR");
    return first ? lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1) : lower;
  });
}

export function monitorTitleColor(light: boolean) { return light ? "#000000" : "#FFFFFF"; }

/** A flattened slide carries its own title inside the image. Do not add framing or infer text from pixels. */
export function monitorIntegralImage(payload: MonitorDocumentScenePayload) {
  const elements = payload.layout?.elements;
  if (!elements) return payload.assetIds?.length === 1 && !payload.chart && !payload.rows?.length && !payload.bullets?.length;
  if (elements.some(item => item.kind === "chart" || item.kind === "table")) return false;
  return elements.some(item => item.kind === "image" && item.w >= .75 && item.h >= .75 && item.w * item.h >= .6);
}

export function monitorSceneTitle(elements: MonitorSlideElement[], fallback: string) {
  const result = monitorTitleElements(elements, fallback);
  return result.title;
}

export function monitorTitleElements(elements: MonitorSlideElement[], fallback: string) {
  const texts = elements.filter((item): item is MonitorSlideTextElement => item.kind === "text");
  const candidates = texts.filter(item => !item.chartAnnotation && item.role === "title" && item.y < .3);
  const normalizedFallback = normalizeMonitorTitle(fallback);
  const matching = texts.find(item => !item.chartAnnotation && normalizeMonitorTitle(item.text) === normalizedFallback)
    ?? texts.find(item => !item.chartAnnotation && item.y < .3 && normalizedFallback.length >= 20 && normalizeMonitorTitle(item.text).startsWith(normalizedFallback));
  const header = texts.filter(item => !item.chartAnnotation && item.y < .3 && item.role !== "metric" && !/^(?:Fonte|Dados|Atualizad|Referência|Slide\s+\d)/i.test(item.text.trim()) && /\p{L}/u.test(item.text) && item.w >= .3)
    .sort((a, b) => (b.fontSizePt ?? 0) - (a.fontSizePt ?? 0) || a.y - b.y)[0];
  const primary = matching ?? candidates.sort((a, b) => (b.fontSizePt ?? 0) - (a.fontSizePt ?? 0) || a.y - b.y)[0] ?? header;
  const charts = elements.filter(item => item.kind === "chart");
  const chartTitle = charts.length === 1 ? charts[0].chart.title?.trim() : undefined;
  const genericFallback = !fallback.trim() || /^(?:Slide|Página|Page)\s+\d+$/i.test(fallback.trim());
  const title = primary?.text ?? (genericFallback ? chartTitle : undefined) ?? fallback;
  const titles = primary ? texts.filter(item => !item.chartAnnotation && (item === primary || (item.y < .3 && normalizeMonitorTitle(item.text) === normalizeMonitorTitle(primary.text)))) : [];
  const content = elements.filter(item => !titles.includes(item as MonitorSlideTextElement));
  // Reflow within the body only. The title has its own non-shrinking layout row.
  const top = content.length ? Math.min(...content.map(item => item.y)) : 0;
  const bottom = Math.max(top + .01, ...content.map(item => item.y + item.h));
  return {
    title,
    promotedChartTitle: Boolean(chartTitle && normalizeMonitorTitle(chartTitle) === normalizeMonitorTitle(title)),
    elements: content.map(item => ({ ...item, y: .02 + .96 * (item.y - top) / (bottom - top), h: .96 * item.h / (bottom - top) })),
  };
}
