/* eslint-disable @next/next/no-img-element */
"use client";

import { BarChart3, FileText, Image as ImageIcon, Table2 } from "lucide-react";
import { useAnimatedValue } from "@/components/MonitorAnimatedValue";
import type { MonitorDocumentSceneDto, MonitorDocumentSeries } from "@/modules/grupamento/monitor-content/types";

function SceneIcon({ type }: { type: MonitorDocumentSceneDto["sceneType"] }) {
  if (type === "CHART") return <BarChart3 className="h-4 w-4" />;
  if (type === "TABLE") return <Table2 className="h-4 w-4" />;
  if (type === "FIGURE") return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function AssetGrid({ assetIds, title }: { assetIds: string[]; title: string }) {
  if (!assetIds.length) return null;
  return (
    <div className={`grid min-h-0 gap-3 ${assetIds.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {assetIds.slice(0, 3).map((assetId, index) => (
        <div key={assetId} className="mcl-broadcast-card flex min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-400/10 bg-slate-950/25 p-2" style={{ animationDelay: `${220 + index * 80}ms` }}>
          <img
            src={`/api/grupamento/monitor-content/assets/${assetId}`}
            alt={`${title} · figura ${index + 1}`}
            className="max-h-[48vh] w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

function AnimatedChartBar({ value, max, delay }: { value: number; max: number; delay: number }) {
  const animated = useAnimatedValue(value, { duration: 1_400, delay });
  const width = max > 0 ? Math.max(0, Math.min(100, (animated / max) * 100)) : 0;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-300 shadow-[0_0_18px_rgba(56,189,248,.24)]" style={{ width: `${width}%` }} />
    </div>
  );
}

function ChartScene({ series }: { series: MonitorDocumentSeries[] }) {
  const flattened = series.flatMap((item) => item.values);
  const max = Math.max(1, ...flattened.map((value) => Math.abs(value)));
  const rows = series.flatMap((item) =>
    item.values.slice(0, 7).map((value, index) => ({
      series: item.name,
      category: item.categories[index] || `Item ${index + 1}`,
      value,
    })),
  ).slice(0, 12);

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={`${row.series}-${row.category}-${index}`} className="mcl-broadcast-row grid grid-cols-[minmax(150px,1fr)_2.2fr_130px] items-center gap-4 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3" style={{ animationDelay: `${180 + index * 55}ms` }}>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{row.category}</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-slate-500">{row.series}</div>
          </div>
          <AnimatedChartBar value={Math.abs(row.value)} max={max} delay={260 + index * 55} />
          <div className="text-right font-mono text-sm font-black tabular-nums">{row.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div>
        </div>
      ))}
    </div>
  );
}

export function MonitorDocumentScene({ scene, ccol }: { scene: MonitorDocumentSceneDto; ccol: boolean }) {
  const payload = scene.payload ?? {};
  const assets = payload.assetIds ?? [];
  const bullets = payload.bullets ?? [];

  return (
    <section className="relative h-full min-h-[58vh]">
      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>
            <SceneIcon type={scene.sceneType} /> Conteúdo documental aprovado
          </div>
          <h1 className="mcl-broadcast-title mt-2 max-w-5xl text-4xl font-black tracking-tight">{scene.title}</h1>
        </div>
        <div className={`mcl-broadcast-card shrink-0 rounded-xl border px-4 py-3 text-right text-[10px] ${ccol ? "border-slate-300 bg-white/80 text-slate-600" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
          <div className="font-bold uppercase tracking-wider">Fonte documental</div>
          <div className="mt-1 max-w-72 truncate font-semibold">{scene.sourceFileName}</div>
          <div>{scene.sourcePage ? `slide/página ${scene.sourcePage}` : "documento completo"}</div>
        </div>
      </div>

      {scene.sceneType === "CHART" ? (
        <ChartScene series={payload.series ?? []} />
      ) : scene.sceneType === "TABLE" ? (
        <div className={`mcl-broadcast-card overflow-hidden rounded-2xl border ${ccol ? "border-slate-300 bg-white/80" : "border-white/10 bg-white/[0.025]"}`}>
          <table className="w-full table-fixed text-left text-sm">
            <thead className={ccol ? "bg-slate-100 text-slate-700" : "bg-white/[0.06] text-slate-300"}>
              <tr>{(payload.columns ?? []).slice(0, 7).map((column, index) => <th key={index} className="px-4 py-3 font-black">{column || `Coluna ${index + 1}`}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(payload.rows ?? []).slice(0, 9).map((row, rowIndex) => (
                <tr key={rowIndex} className="mcl-broadcast-row" style={{ animationDelay: `${160 + rowIndex * 55}ms` }}>
                  {row.slice(0, 7).map((cell, cellIndex) => <td key={cellIndex} className="truncate px-4 py-3" title={cell}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : scene.sceneType === "FIGURE" ? (
        <AssetGrid assetIds={assets} title={scene.title} />
      ) : (
        <div className={`grid gap-5 ${assets.length ? "lg:grid-cols-[1.15fr_.85fr]" : "grid-cols-1"}`}>
          <div className="space-y-3">
            {bullets.slice(0, 9).map((bullet, index) => (
              <div key={index} className={`mcl-broadcast-card flex items-start gap-3 rounded-2xl border px-5 py-4 text-lg font-semibold leading-7 ${ccol ? "border-slate-300 bg-white/80" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: `${120 + index * 70}ms` }}>
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${ccol ? "bg-sky-700" : "bg-sky-400"}`} />
                <span>{bullet}</span>
              </div>
            ))}
            {payload.note ? <div className={`px-2 text-xs ${ccol ? "text-slate-500" : "text-slate-500"}`}>{payload.note}</div> : null}
          </div>
          <AssetGrid assetIds={assets} title={scene.title} />
        </div>
      )}

      <div className={`absolute bottom-0 left-0 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] ${ccol ? "border-slate-300 bg-white/75 text-slate-600" : "border-white/10 bg-slate-950/65 text-slate-400"}`}>
        Dado documental importado · publicação humana aprovada · fonte preservada
      </div>
    </section>
  );
}
