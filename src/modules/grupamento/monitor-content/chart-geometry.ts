import type { MonitorDocumentChart, MonitorDocumentSeries } from "./types";

const PALETTE = ["#16a34a", "#4f86c6", "#eab308", "#0ea5e9", "#f97316", "#a855f7"];
export function seriesColor(series: MonitorDocumentSeries, index: number, point?: number) {
  return (point === undefined ? undefined : series.pointColors?.[point]) || series.color || PALETTE[index % PALETTE.length];
}
export function hasPoint(series: MonitorDocumentSeries, index: number) {
  return Number.isFinite(series.values[index]) && !series.missingValueIndices?.includes(index);
}
export function isStacked(chart: MonitorDocumentChart) {
  return chart.grouping === "stacked" || chart.grouping === "percentStacked";
}
export function barSegments(chart: MonitorDocumentChart, index: number) {
  let positive = 0;
  let negative = 0;
  const total = chart.series.reduce((sum, series) => sum + (hasPoint(series, index) ? Math.abs(series.values[index]) : 0), 0);
  return chart.series.flatMap((series, seriesIndex) => {
    if (!hasPoint(series, index)) return [];
    const value = series.values[index];
    const amount = chart.grouping === "percentStacked" ? (total ? value / total : 0) : value;
    const start = isStacked(chart) ? (amount >= 0 ? positive : negative) : 0;
    if (amount >= 0) positive += amount; else negative += amount;
    return [{ seriesIndex, value, start, end: start + amount, color: seriesColor(series, seriesIndex, index) }];
  });
}
export function chartDomain(chart: MonitorDocumentChart) {
  const count = Math.max(0, ...chart.series.map((s) => s.values.length));
  const points = Array.from({ length: count }, (_, i) => barSegments(chart, i)).flat();
  const min = chart.axisMin ?? Math.min(0, ...points.map((p) => p.start), ...points.map((p) => p.end));
  const max = chart.axisMax ?? Math.max(chart.grouping === "percentStacked" ? 1 : 0, ...points.map((p) => p.end), 0);
  return { min, max: max > min ? max : min + 1 };
}
export function chartValueLabel(value: number, format?: string, percent = false) {
  if (format && /[dy]/i.test(format.replace(/"[^"]*"/g, "")) && value > 20000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date).replace(".", "");
  }
  if (percent || format?.includes("%")) return (value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
export function chartTicks(chart: MonitorDocumentChart, min: number, max: number) {
  if (chart.valueAxisTicks?.length) return chart.valueAxisTicks.filter((v) => Number.isFinite(v) && v >= min && v <= max);
  if (chart.majorUnit && (max - min) / chart.majorUnit <= 60) {
    const ticks: number[] = [];
    for (let n = 0; n <= 60 && min + n * chart.majorUnit <= max; n++) ticks.push(min + n * chart.majorUnit);
    return ticks;
  }
  if (chart.valueFormat && /[dy]/i.test(chart.valueFormat) && min > 20000) {
    const epoch = Date.UTC(1899, 11, 30);
    const start = new Date(epoch + min * 86400000);
    const ticks: number[] = [];
    for (let n = 0; n < 60; n++) {
      const value = (Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + n, 1) - epoch) / 86400000;
      if (value > max) break;
      if (value >= min) ticks.push(value);
    }
    if (ticks.length > 1) return ticks;
  }
  return Array.from({ length: 6 }, (_, i) => min + (max - min) * i / 5);
}
