/* eslint-disable @next/next/no-img-element */
"use client";

import { BarChart3, FileText, Image as ImageIcon, Table2 } from "lucide-react";
import type {
  MonitorDocumentChart,
  MonitorDocumentSceneDto,
  MonitorDocumentSeries,
  MonitorSlideElement,
  MonitorSlideTextElement,
} from "@/modules/grupamento/monitor-content/types";

const FALLBACK_COLORS = ["#16a34a", "#4f86c6", "#eab308", "#0ea5e9", "#f97316", "#a855f7"];

function SceneIcon({ type }: { type: MonitorDocumentSceneDto["sceneType"] }) {
  if (type === "CHART") return <BarChart3 className="h-4 w-4" />;
  if (type === "TABLE") return <Table2 className="h-4 w-4" />;
  if (type === "FIGURE") return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function hexLuminance(value?: string) {
  if (!value || !/^#[0-9A-Fa-f]{6}$/.test(value)) return null;
  const parts = [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16) / 255);
  const linear = parts.map((item) => item <= 0.03928 ? item / 12.92 : Math.pow((item + 0.055) / 1.055, 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function adaptedTextColor(original: string | undefined, ccol: boolean) {
  const lum = hexLuminance(original);
  if (lum === null) return ccol ? "#0f172a" : "#f8fafc";
  if (!ccol && lum < 0.34) return "#f8fafc";
  if (ccol && lum > 0.86) return "#0f172a";
  return original;
}

function adaptedShapeFill(original: string | undefined, area: number, ccol: boolean) {
  if (!original) return "transparent";
  const lum = hexLuminance(original);
  if (area > 0.72 && lum !== null && ((!ccol && lum > 0.82) || (ccol && lum < 0.18))) return "transparent";
  return original;
}

function boxStyle(item: { x: number; y: number; w: number; h: number; z: number }) {
  return {
    left: String(item.x * 100) + "%",
    top: String(item.y * 100) + "%",
    width: String(item.w * 100) + "%",
    height: String(item.h * 100) + "%",
    zIndex: item.z,
  };
}

function excelDate(value: number) {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

function valueLabel(value: number, chart: MonitorDocumentChart) {
  if (chart.valueFormat && /[dmy]/i.test(chart.valueFormat) && value > 20000) return excelDate(value);
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function chartColor(series: MonitorDocumentSeries, index: number) {
  return series.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function ChartLegend({ chart }: { chart: MonitorDocumentChart }) {
  if (chart.series.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-2 text-[clamp(12px,.82vw,16px)] font-semibold text-slate-300">
      {chart.series.map((series, index) => (
        <span key={series.name + String(index)} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: chartColor(series, index) }} />
          {series.name}
        </span>
      ))}
    </div>
  );
}

function HorizontalChart({ chart }: { chart: MonitorDocumentChart }) {
  const categories = chart.series[0]?.categories ?? [];
  const values = chart.series.flatMap((item) => item.values);
  const rawMin = chart.axisMin ?? Math.min(0, ...values);
  const rawMax = chart.axisMax ?? Math.max(1, ...values);
  const span = Math.max(1, rawMax - rawMin);
  const overlap = (chart.overlap ?? 0) >= 90 && chart.series.length > 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-[1.2%]">
        {categories.slice(0, 12).map((category, rowIndex) => (
          <div key={category + String(rowIndex)} className="grid grid-cols-[18%_1fr] items-center gap-3" style={{ height: String(100 / Math.max(1, Math.min(categories.length, 12))) + "%" }}>
            <div className="truncate pr-1 text-right text-[clamp(13px,.9vw,17px)] font-bold text-slate-200">{category}</div>
            <div className="relative h-[72%] min-h-3 overflow-visible rounded-sm bg-white/[0.055]">
              {overlap ? chart.series.map((series, seriesIndex) => {
                const value = series.values[rowIndex] ?? rawMin;
                const pct = Math.max(0, Math.min(100, ((value - rawMin) / span) * 100));
                return (
                  <div key={series.name + String(seriesIndex)} className="absolute inset-y-0 left-0 origin-left rounded-sm opacity-95 mcl-document-chart-grow" style={{ width: String(pct) + "%", background: chartColor(series, seriesIndex), zIndex: seriesIndex + 1 }} />
                );
              }) : chart.grouping === "stacked" || chart.grouping === "percentStacked" ? (
                <div className="flex h-full overflow-hidden rounded-sm">
                  {chart.series.map((series, seriesIndex) => {
                    const rowValues = chart.series.map((item) => Math.max(0, item.values[rowIndex] ?? 0));
                    const total = Math.max(1, rowValues.reduce((sum, item) => sum + item, 0));
                    const value = Math.max(0, series.values[rowIndex] ?? 0);
                    return <div key={series.name + String(seriesIndex)} className="h-full mcl-document-chart-grow" style={{ width: String((value / total) * 100) + "%", background: chartColor(series, seriesIndex) }} />;
                  })}
                </div>
              ) : (
                <div className="flex h-full items-stretch gap-[2px]">
                  {chart.series.map((series, seriesIndex) => {
                    const value = series.values[rowIndex] ?? 0;
                    const pct = Math.max(0, Math.min(100, ((value - rawMin) / span) * 100));
                    return <div key={series.name + String(seriesIndex)} className="h-full min-w-[2px] origin-left rounded-sm mcl-document-chart-grow" style={{ width: String(pct / Math.max(1, chart.series.length)) + "%", background: chartColor(series, seriesIndex) }} />;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between pl-[19%] text-[clamp(11px,.72vw,14px)] font-mono font-semibold text-slate-400">
        <span>{valueLabel(rawMin, chart)}</span><span>{valueLabel(rawMax, chart)}</span>
      </div>
      <ChartLegend chart={chart} />
    </div>
  );
}

function VerticalChart({ chart }: { chart: MonitorDocumentChart }) {
  const categories = chart.series[0]?.categories ?? [];
  const values = chart.series.flatMap((item) => item.values);
  const min = chart.axisMin ?? Math.min(0, ...values);
  const max = chart.axisMax ?? Math.max(1, ...values);
  const span = Math.max(1, max - min);
  const visible = categories.slice(0, 14);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => min + span * ratio);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 pl-11">
        <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between py-1 text-right text-[clamp(10px,.68vw,13px)] font-mono font-semibold text-slate-400">
          {ticks.map((tick, index) => <span key={index}>{valueLabel(tick, chart)}</span>)}
        </div>
        <div className="relative h-full border-b border-l border-white/10">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((_, index) => <span key={index} className="block border-t border-white/[0.055]" />)}
          </div>
          <div className="absolute inset-0 flex items-end justify-around gap-[1.2%] px-[2%]">
          {visible.map((category, rowIndex) => (
            <div key={category + String(rowIndex)} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div className="flex min-h-0 flex-1 items-end justify-center gap-[3px]">
                {chart.grouping === "stacked" || chart.grouping === "percentStacked" ? (
                  <div className="flex w-[58%] flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: "92%" }}>
                    {chart.series.map((series, seriesIndex) => {
                      const rowValues = chart.series.map((item) => Math.max(0, item.values[rowIndex] ?? 0));
                      const total = Math.max(1, rowValues.reduce((sum, item) => sum + item, 0));
                      const value = Math.max(0, series.values[rowIndex] ?? 0);
                      return <div key={series.name + String(seriesIndex)} className="w-full mcl-document-chart-rise" style={{ height: String((value / total) * 100) + "%", background: chartColor(series, seriesIndex) }} />;
                    })}
                  </div>
                ) : chart.series.map((series, seriesIndex) => {
                  const value = series.values[rowIndex] ?? 0;
                  const pct = Math.max(1, Math.min(100, ((value - min) / span) * 100));
                  return <div key={series.name + String(seriesIndex)} className="w-full max-w-[38px] rounded-t-sm mcl-document-chart-rise" style={{ height: String(pct) + "%", background: chartColor(series, seriesIndex) }} />;
                })}
              </div>
              <div className="mt-1 truncate text-center text-[clamp(11px,.72vw,14px)] font-semibold text-slate-300" title={category}>{category}</div>
            </div>
          ))}
          </div>
        </div>
      </div>
      <ChartLegend chart={chart} />
    </div>
  );
}

function LineChart({ chart }: { chart: MonitorDocumentChart }) {
  const count = Math.max(2, ...chart.series.map((item) => item.values.length));
  const values = chart.series.flatMap((item) => item.values);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  return (
    <div className="h-full w-full">
      <svg viewBox="0 0 1000 420" preserveAspectRatio="none" className="h-[88%] w-full overflow-visible">
        {[0,1,2,3,4].map((index) => <line key={index} x1="0" x2="1000" y1={String(index * 100 + 10)} y2={String(index * 100 + 10)} stroke="rgba(148,163,184,.12)" strokeWidth="1" />)}
        {chart.series.map((series, seriesIndex) => {
          const points = series.values.map((value, index) => {
            const x = count <= 1 ? 0 : (index / (count - 1)) * 1000;
            const y = 400 - ((value - min) / span) * 360;
            return String(x) + "," + String(y);
          }).join(" ");
          return <polyline key={series.name + String(seriesIndex)} points={points} fill="none" stroke={chartColor(series, seriesIndex)} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="mcl-document-line-draw" />;
        })}
      </svg>
      <ChartLegend chart={chart} />
    </div>
  );
}

function PieChart({ chart }: { chart: MonitorDocumentChart }) {
  const values = chart.series[0]?.values ?? [];
  const categories = chart.series[0]?.categories ?? [];
  const total = Math.max(1, values.reduce((sum, value) => sum + Math.max(0, value), 0));
  const stops = values.map((value, index) => {
    const start = values.slice(0, index).reduce((sum, item) => sum + Math.max(0, item), 0) / total * 100;
    const end = start + (Math.max(0, value) / total) * 100;
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length] + " " + String(start) + "% " + String(end) + "%";
  });
  return (
    <div className="flex h-full items-center justify-center gap-8">
      <div className="aspect-square h-[78%] rounded-full shadow-[0_0_45px_rgba(56,189,248,.08)]" style={{ background: "conic-gradient(" + stops.join(",") + ")" }}>
        {chart.type === "doughnut" ? <div className="m-[24%] h-[52%] rounded-full bg-slate-950/95" /> : null}
      </div>
      <div className="space-y-2 text-xs">
        {categories.slice(0,10).map((category,index) => <div key={category + String(index)} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{background:FALLBACK_COLORS[index%FALLBACK_COLORS.length]}} /><span>{category}</span><strong>{valueLabel(values[index] ?? 0,chart)}</strong></div>)}
      </div>
    </div>
  );
}

function DocumentChart({ chart }: { chart: MonitorDocumentChart }) {
  const singleSeriesLabel = chart.series.length === 1 ? chart.series[0]?.name : undefined;
  const unitLikeSeriesLabel = singleSeriesLabel && /[/٪%]|tonel|litro|quilo|kg\b|unidade|quantidade|valor|R\$/i.test(singleSeriesLabel)
    ? singleSeriesLabel
    : undefined;
  const xAxisTitle = chart.xAxisTitle
    ?? (chart.type === "bar" && chart.orientation === "vertical" ? unitLikeSeriesLabel : undefined);
  const yAxisTitle = chart.yAxisTitle
    ?? (chart.type === "bar" && chart.orientation === "horizontal" ? unitLikeSeriesLabel : undefined);

  const chartBody = chart.type === "bar"
    ? (chart.orientation === "horizontal" ? <HorizontalChart chart={chart} /> : <VerticalChart chart={chart} />)
    : chart.type === "pie" || chart.type === "doughnut"
      ? <PieChart chart={chart} />
      : <LineChart chart={chart} />;

  return (
    <div className="relative h-full w-full">
      {yAxisTitle ? (
        <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-x-[42%] -translate-y-1/2 -rotate-90 whitespace-nowrap text-[clamp(11px,.72vw,14px)] font-bold tracking-wide text-slate-300">
          {yAxisTitle}
        </div>
      ) : null}
      <div className={"h-full w-full " + (yAxisTitle ? "pl-5 " : "") + (xAxisTitle ? "pb-6" : "")}>
        {chartBody}
      </div>
      {xAxisTitle ? (
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[clamp(11px,.72vw,14px)] font-bold tracking-wide text-slate-300">
          {xAxisTitle}
        </div>
      ) : null}
    </div>
  );
}

function TextElement({ item, ccol }: { item: MonitorSlideTextElement; ccol: boolean }) {
  const size = item.fontSizePt ?? 18;
  const baseViewport = Math.max(0.72, Math.min(4.8, size / 11.2));
  const minimumPx = item.role === "metric" ? 34 : item.role === "title" ? 24 : item.role === "label" ? 13 : 15;
  const maximumPx = Math.max(minimumPx + 4, size * (item.role === "metric" ? 1.7 : 1.6));
  const justify = item.verticalAlign === "middle" ? "center" : item.verticalAlign === "bottom" ? "flex-end" : "flex-start";
  const area = item.w * item.h;
  return (
    <div className="absolute flex overflow-hidden whitespace-pre-line px-[.15%] py-[.1%]" style={{
      ...boxStyle(item),
      alignItems: justify,
      justifyContent: item.align === "center" ? "center" : item.align === "right" ? "flex-end" : "flex-start",
      textAlign: item.align,
      fontSize: "clamp(" + String(minimumPx) + "px," + String(baseViewport) + "vw," + String(maximumPx) + "px)",
      lineHeight: item.role === "metric" ? 1 : item.role === "label" ? 1.06 : 1.12,
      fontWeight: item.bold || item.role === "metric" || item.role === "title" ? 800 : 650,
      color: adaptedTextColor(item.color, ccol),
      textShadow: ccol ? "none" : "0 2px 14px rgba(2,6,23,.55)",
      letterSpacing: item.role === "label" ? ".02em" : undefined,
      opacity: area < 0.002 ? 0.94 : 1,
    }}>
      {item.text}
    </div>
  );
}

function LayoutScene({ scene, ccol }: { scene: MonitorDocumentSceneDto; ccol: boolean }) {
  const layout = scene.payload.layout;
  if (!layout) return null;
  const chartBoxes = layout.elements.filter((element) => element.kind === "chart");
  const neutralFills = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const sorted = [...layout.elements]
    .filter((element) => {
      if (element.kind !== "shape" || !element.fill || !neutralFills.has(element.fill.toUpperCase())) return true;
      const area = element.w * element.h;
      if (area < 0.04) return true;
      const redundantOverChart = chartBoxes.some((chartElement) => {
        const overlapW = Math.max(0, Math.min(element.x + element.w, chartElement.x + chartElement.w) - Math.max(element.x, chartElement.x));
        const overlapH = Math.max(0, Math.min(element.y + element.h, chartElement.y + chartElement.h) - Math.max(element.y, chartElement.y));
        return (overlapW * overlapH) / Math.max(area, 0.0001) >= 0.25;
      });
      return !redundantOverChart;
    })
    .sort((a,b) => a.z-b.z);
  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
      <div className="relative w-full overflow-hidden rounded-[18px] border border-white/[0.045] bg-transparent shadow-[0_26px_70px_rgba(2,6,23,.12)]" style={{ aspectRatio: String(layout.width) + " / " + String(layout.height), maxHeight: "100%" }}>
        {sorted.map((item: MonitorSlideElement, index) => {
          if (item.kind === "shape") {
            const area = item.w * item.h;
            return <div key={"shape-" + String(index)} className="absolute" style={{...boxStyle(item),background:adaptedShapeFill(item.fill,area,ccol),border:item.lineColor ? "1px solid " + item.lineColor : undefined,borderRadius:String((item.radius ?? 0)*100)+"%"}} />;
          }
          if (item.kind === "text") return <TextElement key={"text-" + String(index)} item={item} ccol={ccol} />;
          if (item.kind === "image") {
            const framed = item.w * item.h >= 0.005;
            return <div
              key={"image-" + String(index)}
              className={"absolute flex items-center justify-center overflow-hidden " + (framed ? "rounded-xl border border-slate-300/60 bg-white/95 p-[.3%] shadow-[0_8px_22px_rgba(2,6,23,.16)]" : "")}
              style={boxStyle(item)}
            >
              {item.assetId ? <img src={"/api/grupamento/monitor-content/assets/" + item.assetId} alt="" className={"h-full w-full object-contain " + (framed ? "rounded-lg" : "drop-shadow-[0_8px_16px_rgba(2,6,23,.16)]")} /> : null}
            </div>;
          }
          if (item.kind === "chart") {
            return <div key={"chart-" + String(index)} className="absolute overflow-hidden rounded-xl border border-white/[0.04] bg-slate-950/10 p-[1.2%]" style={boxStyle(item)}><DocumentChart chart={item.chart} /></div>;
          }
          return <div key={"table-" + String(index)} className="absolute overflow-hidden rounded-lg border border-white/10 bg-slate-950/20" style={boxStyle(item)}>
            <table className="h-full w-full table-fixed text-[clamp(12px,.78vw,15px)]">
              <thead className="bg-white/[0.08]"><tr>{item.columns.slice(0,8).map((cell,cellIndex)=><th key={cellIndex} className="px-2 py-1 text-left font-black">{cell}</th>)}</tr></thead>
              <tbody>{item.rows.slice(0,12).map((row,rowIndex)=><tr key={rowIndex} className="border-t border-white/[0.05]">{row.slice(0,8).map((cell,cellIndex)=><td key={cellIndex} className="truncate px-2 py-1">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>;
        })}
      </div>
      <div className={"pointer-events-none absolute right-2 top-2 rounded-lg border px-2.5 py-1.5 text-right text-[8px] leading-3 backdrop-blur " + (ccol ? "border-slate-300/70 bg-white/70 text-slate-600" : "border-white/10 bg-slate-950/55 text-slate-400")}>
        <div className="font-black uppercase tracking-wider">Fonte</div>
        <div className="max-w-52 truncate">{scene.sourceFileName}</div>
        <div>{scene.sourcePage ? "slide/página " + String(scene.sourcePage) : "documento"}</div>
      </div>
    </div>
  );
}

function AssetGrid({ assetIds, title }: { assetIds: string[]; title: string }) {
  if (!assetIds.length) return null;
  return (
    <div className={"grid min-h-0 gap-3 " + (assetIds.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
      {assetIds.slice(0, 8).map((assetId, index) => (
        <div key={assetId} className="mcl-broadcast-card flex min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-400/10 bg-slate-950/25 p-2" style={{ animationDelay: String(220 + index * 80) + "ms" }}>
          <img src={"/api/grupamento/monitor-content/assets/" + assetId} alt={title + " · figura " + String(index + 1)} className="max-h-[48vh] w-full object-contain" />
        </div>
      ))}
    </div>
  );
}

export function MonitorDocumentScene({ scene, ccol }: { scene: MonitorDocumentSceneDto; ccol: boolean }) {
  const payload = scene.payload ?? {};
  if (payload.layoutVersion === 2 && payload.layout) {
    return (
      <section className="relative h-full min-h-0 overflow-hidden">
        <LayoutScene scene={scene} ccol={ccol} />
        <div className={"absolute bottom-0 left-0 rounded-full border px-3 py-1 text-[8px] font-bold uppercase tracking-[0.12em] " + (ccol ? "border-slate-300 bg-white/75 text-slate-600" : "border-white/10 bg-slate-950/65 text-slate-400")}>
          Documento estruturado · layout preservado · fonte rastreável
        </div>
      </section>
    );
  }

  const assets = payload.assetIds ?? [];
  const bullets = payload.bullets ?? [];
  return (
    <section className="relative h-full min-h-[58vh]">
      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <div className={"flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] " + (ccol ? "text-sky-800" : "text-sky-300")}>
            <SceneIcon type={scene.sceneType} /> Conteúdo documental aprovado
          </div>
          <h1 className="mcl-broadcast-title mt-2 max-w-5xl text-4xl font-black tracking-tight">{scene.title}</h1>
        </div>
      </div>
      <div className={"grid gap-5 " + (assets.length ? "lg:grid-cols-[1.15fr_.85fr]" : "grid-cols-1")}>
        <div className="space-y-3">
          {bullets.slice(0, 9).map((bullet, index) => (
            <div key={index} className={"mcl-broadcast-card flex items-start gap-3 rounded-2xl border px-5 py-4 text-lg font-semibold leading-7 " + (ccol ? "border-slate-300 bg-white/80" : "border-white/10 bg-white/[0.03]")}>
              <span className={"mt-2 h-2 w-2 shrink-0 rounded-full " + (ccol ? "bg-sky-700" : "bg-sky-400")} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
        <AssetGrid assetIds={assets} title={scene.title} />
      </div>
    </section>
  );
}
