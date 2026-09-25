/* eslint-disable @next/next/no-img-element */
"use client";

import type {
  MonitorDocumentScenePayload,
} from "@/modules/grupamento/monitor-content/types";

import { MonitorDocumentChart } from "@/components/MonitorDocumentChart";

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
          return <div key={index} className="absolute overflow-hidden rounded-sm bg-white/[0.03]" style={elementStyle(item)}><MonitorDocumentChart chart={item.chart} /></div>;
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
