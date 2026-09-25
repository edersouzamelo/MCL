/* eslint-disable @next/next/no-img-element */
"use client";

import { BarChart3, FileText, Image as ImageIcon, Table2 } from "lucide-react";
import type {
  MonitorDocumentSceneDto,
  MonitorSlideElement,
  MonitorSlideTextElement,
} from "@/modules/grupamento/monitor-content/types";

import { MonitorDocumentChart } from "@/components/MonitorDocumentChart";

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

function TextElement({ item, ccol, slideWidth }: { item: MonitorSlideTextElement; ccol: boolean; slideWidth: number }) {
  const size = item.fontSizePt ?? 18;
  const justify = item.verticalAlign === "middle" ? "center" : item.verticalAlign === "bottom" ? "flex-end" : "flex-start";
  const area = item.w * item.h;
  return (
    <div className="absolute flex overflow-hidden whitespace-pre-line px-[.15%] py-[.1%]" style={{
      ...boxStyle(item),
      alignItems: justify,
      justifyContent: item.align === "center" ? "center" : item.align === "right" ? "flex-end" : "flex-start",
      textAlign: item.align,
      fontSize: `${size / (slideWidth / 12700) * 100}cqw`,
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
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden" style={{ containerType: "size" }}>
      <div className="relative w-full overflow-hidden rounded-[18px] border border-white/[0.045] bg-transparent shadow-[0_26px_70px_rgba(2,6,23,.12)]" style={{ aspectRatio: String(layout.width) + " / " + String(layout.height), width: `min(100cqw, calc(100cqh * ${layout.width / layout.height}))`, containerType: "inline-size" }}>
        {sorted.map((item: MonitorSlideElement, index) => {
          if (item.kind === "shape") {
            const area = item.w * item.h;
            return <div key={"shape-" + String(index)} className="absolute" style={{...boxStyle(item),background:adaptedShapeFill(item.fill,area,ccol),border:item.lineColor ? "1px solid " + item.lineColor : undefined,borderRadius:String((item.radius ?? 0)*100)+"%"}} />;
          }
          if (item.kind === "text") return <TextElement key={"text-" + String(index)} item={item} ccol={ccol} slideWidth={layout.width} />;
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
            return <div key={"chart-" + String(index)} className="absolute overflow-hidden rounded-xl border border-white/[0.04] bg-slate-950/10 p-[1.2%]" style={boxStyle(item)}><MonitorDocumentChart chart={item.chart} ccol={ccol} /></div>;
          }
          return <div key={"table-" + String(index)} className="absolute overflow-hidden rounded-lg border border-white/10 bg-slate-950/20" style={boxStyle(item)}>
            <table className="h-full w-full table-fixed text-[clamp(12px,.78vw,15px)]">
              <thead className="bg-white/[0.08]"><tr>{item.columns.map((cell,cellIndex)=><th key={cellIndex} className="px-2 py-1 text-left font-black">{cell}</th>)}</tr></thead>
              <tbody>{item.rows.map((row,rowIndex)=><tr key={rowIndex} className="border-t border-white/[0.05]">{row.map((cell,cellIndex)=><td key={cellIndex} className="truncate px-2 py-1">{cell}</td>)}</tr>)}</tbody>
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
      {assetIds.map((assetId, index) => (
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
          Documento estruturado · fonte rastreável
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
          {bullets.map((bullet, index) => (
            <div key={index} className={"mcl-broadcast-card flex items-start gap-3 rounded-2xl border px-5 py-4 text-lg font-semibold leading-7 " + (ccol ? "border-slate-300 bg-white/80" : "border-white/10 bg-white/[0.03]")}>
              <span className={"mt-2 h-2 w-2 shrink-0 rounded-full " + (ccol ? "bg-sky-700" : "bg-sky-400")} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
        {payload.chart && <div className="h-[50vh]"><MonitorDocumentChart chart={payload.chart} ccol={ccol} /></div>}
        {payload.columns && payload.rows && <table className="w-full text-sm"><thead><tr>{payload.columns.map((cell, i) => <th key={i} className="p-2 text-left">{cell}</th>)}</tr></thead><tbody>{payload.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}</tr>)}</tbody></table>}
        <AssetGrid assetIds={assets} title={scene.title} />
      </div>
    </section>
  );
}
