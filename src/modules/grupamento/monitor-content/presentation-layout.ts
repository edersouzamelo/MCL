import type { MonitorSlideElement } from "./types";

/** Presentation-only cleanup. The original payload and document remain intact. */
export function prepareMonitorElements(elements: MonitorSlideElement[]) {
  const omitted: Array<{ element: MonitorSlideElement; reason: string }> = [];
  const charts = elements.filter((item) => item.kind === "chart" || item.kind === "table");
  const hasData = charts.length > 0 || elements.some((item) => item.kind === "text" && /R\$|\d[.,]\d|\d\s*%/.test(item.text));
  const neutral = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const intersection = (a: MonitorSlideElement, b: { x: number; y: number; w: number; h: number }) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const visible = elements.filter((item) => {
    const area = item.w * item.h;
    let reason = "";
    const outside = area > 0 && intersection(item, { x: 0, y: 0, w: 1, h: 1 }) / area < .8;
    // Never discard charts, tables, numerical annotations or in-frame data bars.
    if (outside && (item.kind === "shape" || (item.kind === "text" && !/\d/.test(item.text)))) {
      reason = "Adorno de borda fora da área do slide";
    } else if (hasData && item.kind === "image" && item.y >= 0 && item.y + item.h <= .18 && area < .015 && item.w < .12 && item.h < .16) {
      reason = "Pequeno ícone de cabeçalho em slide de dados";
    } else if (item.kind === "shape" && area >= .04 && neutral.has(item.fill?.toUpperCase() ?? "") && charts.some((chart) => intersection(item, chart) / area >= .25)) {
      reason = "Fundo redundante sobre gráfico ou tabela";
    }
    if (reason) omitted.push({ element: item, reason });
    return !reason;
  });
  return { elements: visible, omitted };
}
