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

function intersection(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
}

function nearOuterEdge(item: { x: number; y: number; w: number; h: number }) {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  return cx < .16 || cx > .84 || cy < .13 || cy > .87;
}

function supportsSemanticText(shape: MonitorSlideElement, elements: MonitorSlideElement[]) {
  if (shape.kind !== "shape") return false;
  return elements.some((item) => item.kind === "text" && item.role !== "body" && intersection(shape, item) >= item.w * item.h * .45);
}

/** Presentation-only cleanup and adaptive reflow. The original payload and document remain intact. */
export function prepareMonitorElements(elements: MonitorSlideElement[]) {
  const omitted: Array<{ element: MonitorSlideElement; reason: string }> = [];
  const dataElements = elements.filter((item) => item.kind === "chart" || item.kind === "table");
  const hasStructuredData = dataElements.length > 0;
  const hasData = hasStructuredData || elements.some((item) => item.kind === "text" && /R\$|\d[.,]\d|\d\s*%/.test(item.text));
  const neutral = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const visible = elements.filter((item) => {
    const area = item.w * item.h;
    let reason = "";
    const canvasCoverage = area > 0 ? intersection(item, { x: 0, y: 0, w: 1, h: 1 }) / area : 1;
    const outside = area > 0 && canvasCoverage < .8;
    const dataOverlap = hasStructuredData && area > 0
      ? Math.max(0, ...dataElements.map((data) => intersection(item, data) / area))
      : 0;

    // Never discard charts, tables or numerical annotations. Briefing cleanup targets framing and decoration.
    if (outside && (item.kind === "shape" || (item.kind === "text" && !/\d/.test(item.text)))) {
      reason = "Adorno de borda fora da área do slide";
    } else if (hasData && item.kind === "image" && item.y >= 0 && item.y + item.h <= .18 && area < .015 && item.w < .12 && item.h < .16) {
      reason = "Pequeno ícone de cabeçalho em slide de dados";
    } else if (hasStructuredData && item.kind === "image" && area < .035 && dataOverlap < .08 && nearOuterEdge(item)) {
      reason = "Imagem periférica decorativa removida no modo briefing";
    } else if (item.kind === "shape" && area >= .04 && neutral.has(item.fill?.toUpperCase() ?? "") && dataElements.some((data) => intersection(item, data) / area >= .25)) {
      reason = "Fundo redundante sobre gráfico ou tabela";
    } else if (
      hasStructuredData
      && item.kind === "shape"
      && area >= .018
      && dataOverlap < .05
      && (nearOuterEdge(item) || supportsSemanticText(item, elements))
    ) {
      reason = supportsSemanticText(item, elements)
        ? "Faixa ou moldura de título normalizada pelo MCL no modo briefing"
        : "Forma decorativa periférica removida no modo briefing";
    }
    if (reason) omitted.push({ element: item, reason });
    return !reason;
  });
  const optimized = optimizeDominantChart(visible);
  return { elements: optimized.elements, omitted, adjustments: optimized.adjustment ? [optimized.adjustment] : [] };
}
