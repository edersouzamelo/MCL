"use client";

import { OmMentions } from "@/components/OmIdentity";
import { findOmCrest } from "@/modules/grupamento/om-crests";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { MonitorDocumentChart as Chart } from "@/modules/grupamento/monitor-content/types";
import { barSegments, chartDomain, chartTicks, chartValueLabel, hasPoint, isStacked, seriesColor } from "@/modules/grupamento/monitor-content/chart-geometry";
import { estimatedChartLabelWidth, fitBarPointLabel, fitHorizontalCategoryLabel, fitVerticalCategoryAxis } from "@/modules/grupamento/monitor-content/chart-label-layout";
import { pieArcPath, pieLabelPositions, pieSliceGeometry } from "@/modules/grupamento/monitor-content/pie-layout";

export function MonitorDocumentChart({ chart, ccol = false, decorateOms = true, showTitle = true }: { chart: Chart; ccol?: boolean; decorateOms?: boolean; showTitle?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId().replaceAll(":", "");
  const [size, setSize] = useState({ width: 900, height: 480 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setSize((current) => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      return Math.abs(width - current.width) <= 1 && Math.abs(height - current.height) <= 1 ? current : { width, height };
    }));
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
  const categoryLabels = Array.from({ length: count }, (_, i) => chart.categoryFormat && categories[i]?.trim() && Number.isFinite(Number(categories[i])) ? chartValueLabel(Number(categories[i]), chart.categoryFormat) : categories[i] ?? "");
  const categoryCrests = categoryLabels.map((name) => decorateOms ? findOmCrest(name) : undefined);
  const crestSpace = categoryCrests.some(Boolean) ? font * 2.4 : 0;
  const preferredCategoryFont = font * .9;
  const categoryWidth = Math.min(size.width * .48, Math.max(88, ...categoryLabels.map((text) => estimatedChartLabelWidth(text, preferredCategoryFont) + 8)));
  const margin = { left: (horizontal ? categoryWidth + 16 + crestSpace : Math.max(50, ...ticks.map((v) => label(v).length * font * .6 + 10))) + (yTitle ? font * 2 : 0), top: chart.series.some(series => series.dataLabels?.some(Boolean)) && !horizontal ? font * 4 : font, right: horizontal ? Math.max(24, ...ticks.map((v) => label(v).length * font * .3)) : 24, bottom: font * (xTitle ? 5 : 3.2) };
  const width = Math.max(1, size.width - margin.left - margin.right);
  const categoryLines = categoryLabels.map((text) => [text]);
  const verticalAxisLayout = horizontal ? null : fitVerticalCategoryAxis(categoryLabels, width / count, size.height, preferredCategoryFont);
  // Keep every tick at its true coordinate; stagger labels when space is scarce.
  const tickLanes: number[] = [];
  const laneEnds: number[] = [];
  ticks.map((tick, index) => ({ index, center: (chart.valueReverse ? 1 - (tick - min) / (max - min) : (tick - min) / (max - min)) * width, half: label(tick).length * font * .29 }))
    .sort((a, b) => a.center - b.center).forEach(({ index, center, half }) => {
      let lane = laneEnds.findIndex((end) => end + 12 <= center - half);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = center + half;
      tickLanes[index] = lane;
    });
  margin.bottom = horizontal
    ? font * (2 + Math.max(1, laneEnds.length) * 1.3) + (xTitle ? font * 2 : 0)
    : Math.max(font * 3.2, (verticalAxisLayout?.bottomExtent ?? font * 1.5) + font * 1.6) + (xTitle ? font * 2 : 0) + crestSpace;
  const height = Math.max(1, size.height - margin.top - margin.bottom);
  const categoryLayouts = categoryLabels.map((text, index) => horizontal
    ? fitHorizontalCategoryLabel(text, Math.max(40, categoryWidth - 6), height / count, preferredCategoryFont)
    : { lines: categoryLines[index], fontSize: verticalAxisLayout?.fontSize ?? preferredCategoryFont, lineHeight: font * 1.2 });
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
  const legend = chart.legendPosition === "none" ? null : <div className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 p-1" style={{ color: foreground, fontSize: font, maxWidth: chart.legendPosition === "left" || chart.legendPosition === "right" ? "25%" : undefined, alignContent: "center" }} data-chart-legend>{legendItems.map((item, i) => <span key={i} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />{decorateOms ? <OmMentions text={item.name} /> : item.name}</span>)}</div>;
  const sideLegend = chart.legendPosition === "left" || chart.legendPosition === "right";
  const title = chart.title?.trim();
  const chartAria = [title, `Gráfico ${horizontal ? "horizontal" : chart.type}`, chart.series.map((s) => s.name).filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  return <div className="flex h-full w-full min-h-0 flex-col">
    {showTitle && title && <div
      className="shrink-0 px-2 pb-1 text-center font-black leading-tight"
      style={{ color: foreground, fontSize: "clamp(14px,1.6vw,24px)" }}
      data-chart-title
    >{title}</div>}
    <div className={`flex min-h-0 min-w-0 flex-1 ${sideLegend ? "flex-row" : "flex-col"}`}>
      {(chart.legendPosition === "top" || chart.legendPosition === "left") && legend}
      <div ref={ref} className="relative min-h-0 min-w-0 flex-1">
        {unsupported ? <div className="flex h-full items-center justify-center text-center text-xs" style={{ color: foreground }}>Gráfico {chart.type}: consulte o documento original. Renderização fiel ainda não disponível.</div> : pie ? <Pie chart={chart} colors={legendItems.map((item) => item.color)} size={size} foreground={foreground} ccol={ccol} /> : <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={chartAria} style={{ color: foreground, fontFamily: "inherit", fontSize: font }}>
          <defs><clipPath id={clipId}><rect x={margin.left} y={margin.top} width={width} height={height} /></clipPath></defs>
          {ticks.map((tick, i) => <g key={i} data-value-tick={tick}>
            {chart.showGridlines !== false && <line x1={horizontal ? val(tick) : margin.left} x2={horizontal ? val(tick) : margin.left + width} y1={horizontal ? margin.top : val(tick)} y2={horizontal ? margin.top + height : val(tick)} stroke={grid} strokeWidth="1" />}
            <text fill="currentColor" x={horizontal ? val(tick) : margin.left - 8} y={horizontal ? margin.top + height + font * (1.4 + tickLanes[i] * 1.3) : val(tick) + font * .3} textAnchor={horizontal ? "middle" : "end"} fontSize={font * .85}>{label(tick)}</text>
          </g>)}
          {Array.from({ length: count }, (_, i) => {
            const layout = categoryLayouts[i];
            const x = horizontal ? margin.left - 8 : cat(i);
            const y = horizontal
              ? cat(i) + layout.fontSize * .32 - (layout.lines.length - 1) * layout.lineHeight / 2
              : margin.top + height + font * 1.25 + crestSpace;
            const angle = horizontal ? 0 : verticalAxisLayout?.angle ?? 0;
            const crest = categoryCrests[i];
            const crestHeight = horizontal ? Math.min(crestSpace, height / count * .8) : crestSpace;
            return <g key={i}>{crest && <image href={crest.image} x={horizontal ? margin.left - categoryWidth - crestSpace : x - crestHeight * .36} y={horizontal ? cat(i) - crestHeight / 2 : margin.top + height + 3} width={crestHeight * .72} height={crestHeight} preserveAspectRatio="xMidYMid meet" aria-label={crest.acronym} />}<text
              key={i}
              fill="currentColor"
              x={x}
              y={y}
              transform={angle ? `rotate(${angle} ${x} ${y})` : undefined}
              textAnchor={horizontal || angle ? "end" : "middle"}
              fontSize={layout.fontSize}
              data-category-label
              data-category-lines={layout.lines.length}
              data-category-angle={angle}
            >
              {layout.lines.map((line, lineIndex) => <tspan key={lineIndex} x={x} dy={lineIndex === 0 ? 0 : layout.lineHeight}>{line}</tspan>)}
            </text></g>;
          })}
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
          {chart.series.flatMap((series, seriesIndex) => (series.dataLabels ?? []).map((text, index) => {
            if (!text || !hasPoint(series, index)) return null;
            const segment = barSegments(chart, index).find(item => item.seriesIndex === seriesIndex);
            if (!segment) return null;
            const overlap = !isStacked(chart) && (chart.overlap ?? 0) >= 90;
            const band = (horizontal ? height : width) / count * .7;
            const thickness = isStacked(chart) || overlap ? band : band / Math.max(1, chart.series.length);
            const cross = chart.type === "bar" ? cat(index) - band / 2 + (isStacked(chart) || overlap ? band / 2 : thickness * (seriesIndex + .5)) : cat(index);
            const point = fitBarPointLabel({ text, position: series.dataLabelPositions?.[index], horizontal, start: val(segment.start), end: val(segment.end), cross, thickness: chart.type === "bar" ? thickness : width / count, fontSize: font * .9, bounds: { left: margin.left, top: 0, right: size.width, bottom: size.height - margin.bottom } });
            return <g key={`${seriesIndex}:${index}`} aria-label={text} data-point-label={`${seriesIndex}:${index}`} data-label-position={series.dataLabelPositions?.[index] ?? "outEnd"} data-label-inside={point.inside}>
              {point.callout && <line x1={horizontal ? val(segment.end) : cross} y1={horizontal ? cross : val(segment.end)} x2={point.x} y2={point.y} stroke={foreground} strokeWidth="1" />}
              <text x={point.x} y={point.y} textAnchor="middle" fill={foreground} stroke={ccol ? "#ffffff" : "#071421"} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" fontSize={point.fontSize} fontWeight="700">
                {point.lines.map((line, lineIndex) => <tspan key={lineIndex} x={point.x} dy={lineIndex ? point.fontSize * 1.1 : 0}>{line}</tspan>)}
              </text>
            </g>;
          }))}
          {xTitle && <text x={margin.left + width / 2} y={size.height - 4} textAnchor="middle" fill="currentColor" fontWeight="700">{xTitle}</text>}
          {yTitle && <text transform={`translate(${font},${margin.top + height / 2}) rotate(-90)`} textAnchor="middle" fill="currentColor" fontWeight="700">{yTitle}</text>}
        </svg>}
      </div>
      {(!chart.legendPosition || chart.legendPosition === "bottom" || chart.legendPosition === "right") && legend}
    </div>
  </div>;
}
function Pie({ chart, colors, size, foreground, ccol }: { chart: Chart; colors: string[]; size: { width: number; height: number }; foreground: string; ccol: boolean }) {
  const series = chart.series[0];
  const values = series?.values ?? [];
  const labels = series?.dataLabels ?? [];
  const slices = pieSliceGeometry(values);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const explicitLabelIndices = labels.flatMap((text, index) => text?.trim() ? [index] : []);
  const hasLabels = explicitLabelIndices.length > 0;
  const fontSize = Math.max(11, Math.min(18, size.width / 48));
  const radius = Math.max(8, Math.min(size.height * (hasLabels ? .29 : .42), size.width * (hasLabels ? .25 : .42)));
  const innerRadius = chart.type === "doughnut" ? radius * .52 : 0;
  const positions = pieLabelPositions(slices, size.width, size.height, radius, explicitLabelIndices, fontSize);
  const labelPosition = new Map(positions.map((item) => [item.index, item]));
  const wrapLabel = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    const limit = Math.max(12, Math.min(30, Math.floor(size.width / Math.max(1, fontSize * 3.2))));
    const lines: string[] = [];
    for (const word of cleaned.split(" ")) {
      if (lines.length && lines[lines.length - 1].length + word.length + 1 <= limit) lines[lines.length - 1] += " " + word;
      else lines.push(word);
    }
    return lines.length ? lines : [cleaned];
  };

  return <svg
    width="100%"
    height="100%"
    viewBox={`0 0 ${size.width} ${size.height}`}
    role="img"
    aria-label={chart.title || series?.name || "Gráfico de setores"}
    style={{ overflow: "visible", fontFamily: "inherit" }}
    data-pie-chart
  >
    {total > 0 && slices.map((slice) => slice.value > 0 ? <path
      key={slice.index}
      d={pieArcPath(size.width / 2, size.height / 2, radius, slice.startAngle, slice.endAngle, innerRadius)}
      fill={colors[slice.index] ?? seriesColor({ ...series, color: undefined }, slice.index)}
      stroke={ccol ? "#ffffff" : "#0f172a"}
      strokeWidth="1"
      data-pie-slice={slice.index}
    ><title>{series?.categories?.[slice.index] ?? "Categoria"}: {slice.value}</title></path> : null)}
    {positions.map((position) => {
      const text = labels[position.index]?.trim();
      if (!text) return null;
      const lines = wrapLabel(text);
      return <g key={position.index} data-pie-label={position.index}>
        <polyline
          points={`${position.lineStartX},${position.lineStartY} ${position.lineBendX},${position.lineBendY} ${position.x},${position.y}`}
          fill="none"
          stroke={foreground}
          strokeWidth="1.5"
          opacity=".82"
        />
        <text
          x={position.x}
          y={position.y - (lines.length - 1) * fontSize * .55}
          textAnchor={position.anchor}
          fill={foreground}
          stroke={ccol ? "#ffffff" : "#071421"}
          strokeWidth="3"
          paintOrder="stroke"
          strokeLinejoin="round"
          fontSize={fontSize}
          fontWeight="800"
        >
          {lines.map((line, lineIndex) => <tspan key={lineIndex} x={position.x} dy={lineIndex ? fontSize * 1.15 : 0}>{line}</tspan>)}
        </text>
      </g>;
    })}
    {chart.type === "doughnut" && total <= 0 ? <circle cx={size.width / 2} cy={size.height / 2} r={radius} fill="none" stroke={foreground} opacity=".2" /> : null}
  </svg>;
}
