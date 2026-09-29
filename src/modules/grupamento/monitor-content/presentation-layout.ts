import type { MonitorSlideElement } from "./types";

function optimizeDominantChart(elements: MonitorSlideElement[]) {
  const charts = elements.filter((item) => item.kind === "chart");
  if (charts.length !== 1 || elements.some((item) => item.kind === "table" || item.kind === "image")) {
    return { elements, adjustment: null as string | null };
  }

  const chart = charts[0];
  const texts = elements.filter((item) => item.kind === "text");
  const above = texts.filter((item) => item.y + item.h <= chart.y + .04);
  const below = texts.filter((item) => item.y >= chart.y + chart.h - .04);
  if (above.length + below.length !== texts.length) {
    return { elements, adjustment: null as string | null };
  }

  const top = Math.max(.03, ...above.map((item) => item.y + item.h + .015));
  const bottom = Math.min(.97, ...below.map((item) => item.y - .015));
  if (bottom - top < .38) return { elements, adjustment: null as string | null };

  const target = { x: .04, y: top, w: .92, h: bottom - top };
  const currentArea = chart.w * chart.h;
  const targetArea = target.w * target.h;
  if (currentArea >= targetArea * .86) return { elements, adjustment: null as string | null };

  const optimized = elements.map((item) => item === chart ? { ...item, ...target } : item);
  return {
    elements: optimized,
    adjustment: "Gráfico dominante ampliado para aproveitar a área útil sem encobrir títulos ou notas.",
  };
}

/** Presentation-only cleanup and adaptive reflow. The original payload and document remain intact. */
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
  const optimized = optimizeDominantChart(visible);
  return { elements: optimized.elements, omitted, adjustments: optimized.adjustment ? [optimized.adjustment] : [] };
}
