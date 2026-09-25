"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { MonitorDocumentChart as Chart } from "@/modules/grupamento/monitor-content/types";
import { barSegments, chartDomain, chartTicks, chartValueLabel, hasPoint, isStacked, seriesColor } from "@/modules/grupamento/monitor-content/chart-geometry";

export function MonitorDocumentChart({ chart, ccol = false }: { chart: Chart; ccol?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId().replaceAll(":", "");
  const [size, setSize] = useState({ width: 900, height: 480 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setSize((current) => node.clientWidth === current.width && node.clientHeight === current.height ? current : { width: node.clientWidth, height: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const foreground = ccol ? "#334155" : "#cbd5e1";
  const grid = chart.gridlineColor ?? (ccol ? "#cbd5e1" : "#334155");
  const font = Math.max(10, Math.min(16, size.width / 65));
  const horizontal = chart.type === "bar" && chart.orientation === "horizontal";
  const { min, max } = chartDomain(chart);
  const categories = chart.series[0]?.categories ?? [];
  const count = Math.max(1, categories.length, ...chart.series.map((series) => series.values.length));
  const ticks = chartTicks(chart, min, max);
  const label = (value: number) => chartValueLabel(value, chart.valueFormat, chart.grouping === "percentStacked");
  const xTitle = chart.xAxisTitle;
  const yTitle = chart.yAxisTitle;
  const margin = { left: (horizontal ? Math.min(size.width * .23, 180) : Math.max(50, ...ticks.map((v) => label(v).length * font * .6 + 10))) + (yTitle ? font * 2 : 0), top: 12, right: 24, bottom: font * (xTitle ? 5 : 3.2) };
  const width = Math.max(1, size.width - margin.left - margin.right);
  const height = Math.max(1, size.height - margin.top - margin.bottom);
  const ratio = (value: number) => chart.valueReverse ? 1 - (value - min) / (max - min) : (value - min) / (max - min);
  const val = (value: number) => horizontal ? margin.left + ratio(value) * width : margin.top + (1 - ratio(value)) * height;
  const cat = (index: number) => {
    const reversed = horizontal ? !chart.categoryReverse : chart.categoryReverse;
    const position = reversed ? count - 1 - index : index;
    return (horizontal ? margin.top : margin.left) + (position + .5) / count * (horizontal ? height : width);
  };
  const pie = chart.type === "pie" || chart.type === "doughnut";
  const unsupported = !["bar", "line", "pie", "doughnut"].includes(chart.type);
  const legendItems = pie ? categories.map((name, i) => ({ name, color: chart.series[0]?.pointColors?.[i] || seriesColor({ ...chart.series[0], color: undefined }, i) })) : chart.series.map((series, i) => ({ name: series.name, color: seriesColor(series, i) }));
  const legend = chart.legendPosition === "none" ? null : <div className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 p-1" style={{ color: foreground, fontSize: font, maxWidth: chart.legendPosition === "left" || chart.legendPosition === "right" ? "25%" : undefined, alignContent: "center" }} data-chart-legend>{legendItems.map((item, i) => <span key={i} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />{item.name}</span>)}</div>;
  const sideLegend = chart.legendPosition === "left" || chart.legendPosition === "right";
  return <div className={`flex h-full w-full min-h-0 ${sideLegend ? "flex-row" : "flex-col"}`}>
    {(chart.legendPosition === "top" || chart.legendPosition === "left") && legend}
    <div ref={ref} className="relative min-h-0 min-w-0 flex-1">
      {unsupported ? <div className="flex h-full items-center justify-center text-center text-xs" style={{ color: foreground }}>Gráfico {chart.type}: consulte o documento original. Renderização fiel ainda não disponível.</div> : pie ? <Pie chart={chart} colors={legendItems.map((item) => item.color)} /> : <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={`Gráfico ${horizontal ? "horizontal" : chart.type} ${chart.series.map((s) => s.name).join(", ")}`} style={{ color: foreground, fontFamily: "inherit", fontSize: font }}>
        <defs><clipPath id={clipId}><rect x={margin.left} y={margin.top} width={width} height={height} /></clipPath></defs>
        {ticks.map((tick, i) => <g key={i} data-value-tick={tick}>
          {chart.showGridlines !== false && <line x1={horizontal ? val(tick) : margin.left} x2={horizontal ? val(tick) : margin.left + width} y1={horizontal ? margin.top : val(tick)} y2={horizontal ? margin.top + height : val(tick)} stroke={grid} strokeWidth="1" />}
          <text fill="currentColor" x={horizontal ? val(tick) : margin.left - 8} y={horizontal ? margin.top + height + font * 1.4 : val(tick) + font * .3} textAnchor={horizontal ? "middle" : "end"} fontSize={font * .85}>{label(tick)}</text>
        </g>)}
        {Array.from({ length: count }, (_, i) => <text key={i} fill="currentColor" x={horizontal ? margin.left - 8 : cat(i)} y={horizontal ? cat(i) + font * .3 : margin.top + height + font * 1.4} textAnchor={horizontal ? "end" : "middle"} fontSize={font * .9} data-category-label>{chart.categoryFormat && Number.isFinite(Number(categories[i])) ? chartValueLabel(Number(categories[i]), chart.categoryFormat) : categories[i] ?? ""}</text>)}
        <g clipPath={`url(#${clipId})`}>
          {chart.type === "bar" ? Array.from({ length: count }, (_, index) => {
            const overlap = !isStacked(chart) && (chart.overlap ?? 0) >= 90;
            const segments = barSegments(chart, index);
            if (overlap) segments.sort((a, b) => Math.abs(b.end) - Math.abs(a.end));
            const band = (horizontal ? height : width) / count * .7;
            const thickness = isStacked(chart) || overlap ? band : band / Math.max(1, chart.series.length);
            return segments.map((segment) => {
              const a = val(segment.start); const b = val(segment.end);
              const cross = cat(index) - band / 2 + (isStacked(chart) || overlap ? 0 : thickness * segment.seriesIndex);
              return <rect key={`${index}:${segment.seriesIndex}`} data-series={chart.series[segment.seriesIndex].name} data-value={segment.value} x={horizontal ? Math.min(a, b) : cross} y={horizontal ? cross : Math.min(a, b)} width={horizontal ? Math.abs(b - a) : Math.max(0, thickness - 1)} height={horizontal ? Math.max(0, thickness - 1) : Math.abs(b - a)} fill={segment.color}><title>{categories[index]} · {chart.series[segment.seriesIndex].name}: {label(segment.value)}</title></rect>;
            });
          }) : chart.series.map((series, seriesIndex) => {
            let connected = false;
            const path = series.values.map((value, index) => {
              if (!hasPoint(series, index)) { connected = false; return ""; }
              const command = connected ? "L" : "M"; connected = true;
              return `${command}${cat(index)},${val(value)}`;
            }).join(" ");
            return <path key={seriesIndex} d={path} fill="none" stroke={seriesColor(series, seriesIndex)} strokeWidth="2.5" />;
          })}
        </g>
        {xTitle && <text x={margin.left + width / 2} y={size.height - 4} textAnchor="middle" fill="currentColor" fontWeight="700">{xTitle}</text>}
        {yTitle && <text transform={`translate(${font},${margin.top + height / 2}) rotate(-90)`} textAnchor="middle" fill="currentColor" fontWeight="700">{yTitle}</text>}
      </svg>}
    </div>
    {(!chart.legendPosition || chart.legendPosition === "bottom" || chart.legendPosition === "right") && legend}
  </div>;
}
function Pie({ chart, colors }: { chart: Chart; colors: string[] }) {
  const values = chart.series[0]?.values ?? [];
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  let start = 0;
  const stops = values.map((value, index) => {
    const end = start + (total ? Math.max(0, value) / total * 100 : 0);
    const stop = `${colors[index]} ${start}% ${end}%`; start = end; return stop;
  });
  return <div className="flex h-full items-center justify-center"><div role="img" aria-label={chart.series[0]?.name} className="aspect-square h-[85%] rounded-full" style={{ background: total ? `conic-gradient(${stops.join(",")})` : "transparent" }}>{chart.type === "doughnut" && <div className="m-[24%] h-[52%] rounded-full bg-slate-950" />}</div></div>;
}
