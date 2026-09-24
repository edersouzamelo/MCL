/* eslint-disable @next/next/no-img-element */
"use client";

import type {
  MonitorDocumentChart,
  MonitorDocumentScenePayload,
  MonitorSlideElement,
} from "@/modules/grupamento/monitor-content/types";

const FALLBACK = ["#16a34a", "#4f86c6", "#eab308", "#0ea5e9", "#f97316", "#a855f7"];

function colorFor(chart: MonitorDocumentChart, index: number) {
  return chart.series[index]?.color || FALLBACK[index % FALLBACK.length];
}

function ThumbnailChart({ item }: { item: Extract<MonitorSlideElement, { kind: "chart" }> }) {
  const chart = item.chart;
  const categories = chart.series[0]?.categories ?? [];
  if (!chart.series.length) return null;

  if (chart.type === "bar" && chart.orientation === "vertical") {
    const values = chart.series.flatMap((series) => series.values);
    const max = Math.max(1, ...values.map((value) => Math.abs(value)));
    return (
      <div className="flex h-full items-end justify-around gap-[2%] px-[3%] pb-[4%]">
        {categories.slice(0, 12).map((category, rowIndex) => (
          <div key={category + rowIndex} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
            {chart.series.map((series, seriesIndex) => {
              const value = Math.abs(series.values[rowIndex] ?? 0);
              return <span key={series.name + seriesIndex} className="block min-w-[2px] flex-1 rounded-t-[1px]" style={{ height: Math.max(4, value / max * 92) + "%", background: colorFor(chart, seriesIndex) }} />;
            })}
          </div>
        ))}
      </div>
    );
  }

  if (chart.type === "bar") {
    const values = chart.series.flatMap((series) => series.values);
    const min = chart.axisMin ?? Math.min(0, ...values);
    const max = chart.axisMax ?? Math.max(1, ...values);
    const span = Math.max(1, max - min);
    const overlap = (chart.overlap ?? 0) >= 90 && chart.series.length > 1;
    return (
      <div className="flex h-full flex-col justify-around gap-[3%] px-[4%] py-[3%]">
        {categories.slice(0, 10).map((category, rowIndex) => (
          <div key={category + rowIndex} className="relative min-h-[3px] flex-1">
            {overlap ? chart.series.map((series, seriesIndex) => {
              const value = series.values[rowIndex] ?? min;
              const width = Math.max(2, Math.min(96, ((value - min) / span) * 96));
              return <span key={series.name + seriesIndex} className="absolute left-0 top-[19%] block h-[62%] rounded-r-[1px]" style={{ width: width + "%", background: colorFor(chart, seriesIndex), zIndex: seriesIndex + 1 }} />;
            }) : (
              <div className="flex h-full items-center gap-[2px]">
                {chart.series.map((series, seriesIndex) => {
                  const value = series.values[rowIndex] ?? 0;
                  const width = Math.max(3, Math.abs(value) / Math.max(1, ...values.map((item) => Math.abs(item))) * 94);
                  return <span key={series.name + seriesIndex} className="block h-[62%] rounded-r-[1px]" style={{ width: width + "%", background: colorFor(chart, seriesIndex) }} />;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (chart.type === "pie" || chart.type === "doughnut") {
    const values = chart.series[0]?.values ?? [];
    const total = Math.max(1, values.reduce((sum, value) => sum + Math.max(0, value), 0));
    const stops = values.map((value, index) => {
      const start = values.slice(0, index).reduce((sum, item) => sum + Math.max(0, item), 0) / total * 100;
      const end = start + Math.max(0, value) / total * 100;
      return FALLBACK[index % FALLBACK.length] + " " + start + "% " + end + "%";
    });
    return <div className="m-auto aspect-square h-[78%] rounded-full" style={{ background: "conic-gradient(" + stops.join(",") + ")" }} />;
  }

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full p-[4%]">
      {chart.series.slice(0, 4).map((series, seriesIndex) => {
        const max = Math.max(1, ...series.values.map((value) => Math.abs(value)));
        const points = series.values.map((value, index) => {
          const x = series.values.length <= 1 ? 0 : index / (series.values.length - 1) * 100;
          const y = 38 - Math.abs(value) / max * 34;
          return x + "," + y;
        }).join(" ");
        return <polyline key={series.name + seriesIndex} points={points} fill="none" stroke={colorFor(chart, seriesIndex)} strokeWidth="1.5" />;
      })}
    </svg>
  );
}

function elementStyle(item: { x: number; y: number; w: number; h: number; z: number }) {
  return {
    left: item.x * 100 + "%",
    top: item.y * 100 + "%",
    width: item.w * 100 + "%",
    height: item.h * 100 + "%",
    zIndex: item.z,
  };
}

export function MonitorContentSceneThumbnail({
  payload,
  title,
}: {
  payload?: MonitorDocumentScenePayload;
  title: string;
}) {
  const layout = payload?.layout;
  if (!layout) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-950 p-4 text-center text-[11px] font-bold text-slate-200">
        {title}
      </div>
    );
  }

  const chartBoxes = layout.elements.filter((element) => element.kind === "chart");
  const neutralFills = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
  const visibleElements = [...layout.elements]
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
    .sort((a, b) => a.z - b.z);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-[#07111f] shadow-inner">
      {visibleElements.map((item, index) => {
        if (item.kind === "shape") {
          return <div key={index} className="absolute" style={{ ...elementStyle(item), background: item.fill || "transparent", border: item.lineColor ? "1px solid " + item.lineColor : undefined }} />;
        }
        if (item.kind === "text") {
          const fontSize = Math.max(5, Math.min(16, (item.fontSizePt ?? 16) / 3.8));
          return (
            <div key={index} className="absolute overflow-hidden whitespace-pre-line leading-tight" style={{ ...elementStyle(item), fontSize, fontWeight: item.bold || item.role === "title" || item.role === "metric" ? 800 : 600, textAlign: item.align, color: item.color && item.color !== "#000000" ? item.color : "#f8fafc" }}>
              {item.text}
            </div>
          );
        }
        if (item.kind === "image") {
          const framed = item.w * item.h >= 0.005;
          return (
            <div key={index} className={"absolute overflow-hidden " + (framed ? "rounded-sm border border-slate-300/60 bg-white p-[1px]" : "")} style={elementStyle(item)}>
              {item.assetId ? <img src={"/api/grupamento/monitor-content/assets/" + item.assetId} alt="" className="h-full w-full object-contain" /> : null}
            </div>
          );
        }
        if (item.kind === "chart") {
          return <div key={index} className="absolute overflow-hidden rounded-sm bg-white/[0.03]" style={elementStyle(item)}><ThumbnailChart item={item} /></div>;
        }
        return (
          <div key={index} className="absolute overflow-hidden border border-white/10 bg-white/[0.03]" style={elementStyle(item)}>
            <div className="grid h-full content-start gap-[1px] p-[2px] text-[4px] text-slate-200">
              {[item.columns, ...item.rows.slice(0, 4)].map((row, rowIndex) => <div key={rowIndex} className="truncate">{row.join(" | ")}</div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
