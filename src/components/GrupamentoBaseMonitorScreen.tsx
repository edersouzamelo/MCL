"use client";

import { type ReactNode } from "react";
import { BarChart3, Building2, CircleDollarSign, ListTree } from "lucide-react";
import { AnimatedCurrency, AnimatedPercent, useAnimatedValue } from "@/components/MonitorAnimatedValue";
import type { CcoLayoutId } from "@/modules/grupamento/cco";
import { CCO_PI_ROWS_PER_PAGE, CCO_UNIT_ROWS_PER_PAGE, type CcoScreenId } from "@/modules/grupamento/monitor";
import type { RpnImportResult, RpnSnapshot } from "@/modules/grupamento/rpn";
import type { SagImportResult, SagSnapshot } from "@/modules/grupamento/sag";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function cap(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function GrupamentoBaseMonitorScreen({
  screen,
  sag,
  rpn,
  layout,
  page = 0,
  pageSize,
}: {
  screen: CcoScreenId;
  sag: SagImportResult;
  rpn: RpnImportResult;
  layout: CcoLayoutId;
  page?: number;
  pageSize?: number;
}) {
  if (screen === "execution") return <Execution snapshot={sag.totals} layout={layout} />;
  if (screen === "rpn") return <PreviousCredits rpn={rpn} layout={layout} />;
  if (screen === "pis") return <PiTable sag={sag} layout={layout} page={page} pageSize={pageSize ?? CCO_PI_ROWS_PER_PAGE} />;
  if (screen === "units-current-160") return <CurrentUnits sag={sag} prefix="160" layout={layout} page={page} pageSize={pageSize ?? CCO_UNIT_ROWS_PER_PAGE} />;
  if (screen === "units-current-167") return <CurrentUnits sag={sag} prefix="167" layout={layout} page={page} pageSize={pageSize ?? CCO_UNIT_ROWS_PER_PAGE} />;
  if (screen === "units-rpn-160") return <PreviousUnits rpn={rpn} prefix="160" layout={layout} page={page} pageSize={pageSize ?? CCO_UNIT_ROWS_PER_PAGE} />;
  if (screen === "units-rpn-167") return <PreviousUnits rpn={rpn} prefix="167" layout={layout} page={page} pageSize={pageSize ?? CCO_UNIT_ROWS_PER_PAGE} />;
  return <Overview sag={sag} rpn={rpn} layout={layout} />;
}

function Overview({ sag, rpn, layout }: { sag: SagImportResult; rpn: RpnImportResult; layout: CcoLayoutId }) {
  const ccol = layout === "ccol";
  const top = sag.byUg.slice(0, 8);
  const max = Math.max(...top.map((item) => item.snapshot.total), 1);

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Situação orçamentária consolidada</div>
          <h1 className="mcl-broadcast-title mt-2 text-5xl font-black tracking-tight"><AnimatedPercent value={sag.totals.committedPercent} /> empenhado</h1>
          <p className={`mcl-broadcast-subtitle mt-2 text-lg ${ccol ? "text-slate-600" : "text-slate-400"}`}><AnimatedPercent value={sag.totals.liquidatedPercent} delay={180} /> liquidado no Exercício Corrente · <AnimatedPercent value={rpn.totals.liquidatedPercent} delay={260} /> dos créditos do exercício anterior liquidados</p>
        </div>
        <Donut value={sag.totals.committedPercent} secondary={sag.totals.liquidatedPercent} title="Exercício Corrente" ccol={ccol} />
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Crédito recebido" value={<AnimatedCurrency value={sag.totals.total} delay={120} />} ccol={ccol} delay={120} />
        <Metric label="Disponível" value={<AnimatedCurrency value={sag.totals.available} delay={200} />} ccol={ccol} delay={200} />
        <Metric label="Créditos anteriores inscritos" value={<AnimatedCurrency value={rpn.totals.inscribed} delay={280} />} ccol={ccol} delay={280} />
        <Metric label="Créditos anteriores a liquidar" value={<AnimatedCurrency value={rpn.totals.toLiquidate} delay={360} />} ccol={ccol} delay={360} />
      </div>

      <div className={`mcl-broadcast-card mt-6 rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "420ms" }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> Maior volume recebido por OM · Exercício Corrente</div>
        <div className="mt-5 grid gap-x-8 gap-y-4 xl:grid-cols-2">
          {top.map((item, index) => (
            <div key={item.ug} className="mcl-broadcast-row" style={{ animationDelay: `${520 + index * 55}ms` }}>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="truncate font-semibold">{item.acronym || item.ug} <span className={ccol ? "text-slate-400" : "text-slate-500"}>({item.ug})</span></span><strong>{currency(item.snapshot.total)}</strong></div>
              <div className={`mt-2 h-2 overflow-hidden rounded-full ${ccol ? "bg-slate-200" : "bg-white/10"}`}><div className={ccol ? "mcl-broadcast-bar h-full rounded-full bg-sky-800" : "mcl-broadcast-bar h-full rounded-full bg-sky-400"} style={{ width: `${(item.snapshot.total / max) * 100}%`, animationDelay: `${620 + index * 55}ms` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Execution({ snapshot, layout }: { snapshot: SagSnapshot; layout: CcoLayoutId }) {
  const ccol = layout === "ccol";
  const items = [
    ["Disponível", snapshot.available],
    ["A liquidar", snapshot.toLiquidate],
    ["Em liquidação", snapshot.inLiquidation],
    ["Liquidado", snapshot.liquidated],
    ["Pago", snapshot.paid],
  ] as const;
  const max = Math.max(...items.map(([, value]) => value), 1);

  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Exercício Corrente</div>
      <h1 className="mt-2 text-4xl font-black">Execução Orçamentária</h1>
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        <Metric label="Execução empenhada" value={<AnimatedPercent value={snapshot.committedPercent} />} ccol={ccol} delay={120} />
        <Metric label="Execução liquidada" value={<AnimatedPercent value={snapshot.liquidatedPercent} delay={180} />} ccol={ccol} delay={200} />
        <Metric label="Crédito recebido" value={<AnimatedCurrency value={snapshot.total} delay={240} />} ccol={ccol} delay={280} />
      </div>
      <div className={`mcl-broadcast-card mt-6 rounded-2xl border p-6 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "380ms" }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> Composição do crédito</div>
        <div className="mt-5 space-y-4">
          {items.map(([label, value], index) => (
            <div key={label} className="mcl-broadcast-row grid grid-cols-[140px_1fr_180px] items-center gap-4 text-sm" style={{ animationDelay: `${460 + index * 80}ms` }}>
              <span className={ccol ? "text-slate-600" : "text-slate-400"}>{label}</span>
              <div className={`h-5 overflow-hidden rounded-full ${ccol ? "bg-slate-200" : "bg-white/10"}`}><div className={ccol ? "mcl-broadcast-bar h-full bg-sky-800" : "mcl-broadcast-bar h-full bg-sky-400"} style={{ width: `${(value / max) * 100}%`, animationDelay: `${560 + index * 80}ms` }} /></div>
              <strong className="text-right">{currency(value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviousCredits({ rpn, layout }: { rpn: RpnImportResult; layout: CcoLayoutId }) {
  const ccol = layout === "ccol";
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const visibleRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-violet-800" : "text-violet-300"}`}>Créditos do exercício anterior</div>
      <h1 className="mt-2 text-4xl font-black">Execução dos créditos do exercício anterior</h1>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr_0.8fr]">
        <Metric label="Total inscrito" value={<AnimatedCurrency value={rpn.totals.inscribed} />} ccol={ccol} delay={120} />
        <Metric label="A liquidar" value={<AnimatedCurrency value={rpn.totals.toLiquidate} delay={180} />} ccol={ccol} delay={200} />
        <Donut value={rpn.totals.liquidatedPercent} secondary={rpn.totals.cancelledPercent} secondaryLabel="cancelado" title="Liquidação" ccol={ccol} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Metric label="Liquidado" value={<AnimatedCurrency value={rpn.totals.liquidated} delay={260} />} ccol={ccol} delay={280} />
        <Metric label="Cancelado" value={<AnimatedCurrency value={rpn.totals.cancelled} delay={340} />} ccol={ccol} delay={360} />
      </div>
    </div>
  );
}

function CurrentUnits({ sag, prefix, layout, page, pageSize }: { sag: SagImportResult; prefix: "160" | "167"; layout: CcoLayoutId; page: number; pageSize: number }) {
  const rows = sag.byUg.filter((item) => item.ug.startsWith(prefix));
  return <UnitGrid source="Exercício Corrente" prefix={prefix} rows={rows.map((item) => ({ ug: item.ug, acronym: item.acronym, total: item.snapshot.total, primary: item.snapshot.committedPercent, secondary: item.snapshot.liquidatedPercent }))} layout={layout} page={page} pageSize={pageSize} />;
}

function PreviousUnits({ rpn, prefix, layout, page, pageSize }: { rpn: RpnImportResult; prefix: "160" | "167"; layout: CcoLayoutId; page: number; pageSize: number }) {
  const rows = rpn.byUg.filter((item) => item.ug.startsWith(prefix));
  return <UnitGrid source="Créditos do exercício anterior" prefix={prefix} rows={rows.map((item) => ({ ug: item.ug, acronym: item.acronym, total: item.snapshot.inscribed, primary: item.snapshot.liquidatedPercent, secondary: item.snapshot.cancelledPercent }))} layout={layout} page={page} pageSize={pageSize} previous />;
}

function UnitGrid({ source, prefix, rows, layout, page, pageSize, previous = false }: { source: string; prefix: string; rows: Array<{ ug: string; acronym?: string; total: number; primary: number; secondary: number }>; layout: CcoLayoutId; page: number; pageSize: number; previous?: boolean }) {
  const ccol = layout === "ccol";
  return (
    <div>
      <div className="flex items-end justify-between gap-5">
        <div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}><Building2 className="h-4 w-4" /> Organizações / UG</div>
          <h1 className="mt-2 text-4xl font-black">{source} · série {prefix}xxx</h1>
          <p className={`mt-2 text-sm ${ccol ? "text-slate-600" : "text-slate-400"}`}>A série 160xxx e a série 167xxx são exibidas em quadros separados. Nenhuma OM é descartada por limite arbitrário.</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-center ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}><div className="text-2xl font-black">{visibleRows.length}/{rows.length}</div><div className={`text-[10px] uppercase tracking-wider ${ccol ? "text-slate-500" : "text-slate-500"}`}>UG · quadro {safePage + 1}/{totalPages}</div></div>
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.ug} className={`mcl-broadcast-row grid grid-cols-[90px_1fr_150px_80px_80px] items-center gap-3 rounded-xl border px-4 py-3 text-sm ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.025]"}`} style={{ animationDelay: `${120 + (index % 12) * 45}ms` }}>
            <strong className="font-mono">{row.ug}</strong>
            <span className="truncate font-semibold" title={row.acronym || ""}>{row.acronym || "—"}</span>
            <strong className="text-right">{currency(row.total)}</strong>
            <div className="text-right"><div className="font-black"><AnimatedPercent value={row.primary} delay={120 + (rows.indexOf(row) % 12) * 35} /></div><div className={`text-[9px] uppercase ${ccol ? "text-slate-400" : "text-slate-500"}`}>{previous ? "liq." : "emp."}</div></div>
            <div className="text-right"><div className="font-black"><AnimatedPercent value={row.secondary} delay={180 + (rows.indexOf(row) % 12) * 35} /></div><div className={`text-[9px] uppercase ${ccol ? "text-slate-400" : "text-slate-500"}`}>{previous ? "canc." : "liq."}</div></div>
          </div>
        ))}
        {!rows.length ? <div className={`col-span-full rounded-2xl border border-dashed p-10 text-center ${ccol ? "border-slate-300 text-slate-500" : "border-white/10 text-slate-500"}`}>Nenhuma UG da série {prefix}xxx foi encontrada nesta fonte.</div> : null}
      </div>
    </div>
  );
}

function PiTable({ sag, layout, page, pageSize }: { sag: SagImportResult; layout: CcoLayoutId; page: number; pageSize: number }) {
  const ccol = layout === "ccol";
  const totalPages = Math.max(1, Math.ceil(sag.byPi.length / pageSize));
  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const rows = sag.byPi.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return (
    <div>
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}><ListTree className="h-4 w-4" /> Planos Internos · Exercício Corrente</div>
      <div className="flex items-end justify-between gap-4"><h1 className="mt-2 text-4xl font-black">Execução por PI</h1><div className={`rounded-lg border px-3 py-2 text-xs font-bold ${ccol ? "border-slate-300 bg-white text-slate-600" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>Quadro {safePage + 1}/{totalPages} · {rows.length}/{sag.byPi.length} PI</div></div>
      <div className={`mcl-broadcast-card mt-6 overflow-hidden rounded-2xl border ${ccol ? "border-slate-300 bg-white" : "border-white/10"}`} style={{ animationDelay: "180ms" }}>
        <table className="w-full text-left text-sm">
          <thead className={ccol ? "bg-sky-950 text-white" : "bg-white/[0.06] text-slate-300"}><tr><th className="px-4 py-3">PI</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Recebido</th><th className="px-4 py-3">% Emp.</th><th className="px-4 py-3">% Liq.</th></tr></thead>
          <tbody className={ccol ? "divide-y divide-slate-200" : "divide-y divide-white/10"}>{rows.map((item) => <tr key={item.pi}><td className="px-4 py-2.5 font-mono text-xs">{item.pi}</td><td className="max-w-[440px] truncate px-4 py-2.5" title={item.piName}>{item.piName || "—"}</td><td className="px-4 py-2.5 font-semibold">{currency(item.snapshot.total)}</td><td className="px-4 py-2.5 font-black">{percent(item.snapshot.committedPercent)}</td><td className="px-4 py-2.5 font-black">{percent(item.snapshot.liquidatedPercent)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value, ccol, delay = 0 }: { label: string; value: ReactNode; ccol: boolean; delay?: number }) {
  return <div className={`mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: `${delay}ms` }}><div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${ccol ? "text-slate-500" : "text-slate-500"}`}><CircleDollarSign className="h-4 w-4" /> {label}</div><div className="mt-3 break-words text-3xl font-black tracking-tight">{value}</div></div>;
}

function Donut({ value, secondary, title, secondaryLabel = "liquidado", ccol }: { value: number; secondary: number; title: string; secondaryLabel?: string; ccol: boolean }) {
  const primary = cap(useAnimatedValue(value, { duration: 1_450, delay: 120 }));
  return <div className={`mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "160ms" }}><div className="text-xs font-bold uppercase tracking-[0.14em]">{title}</div><div className="mt-3 flex items-center gap-4"><div className="mcl-donut-live relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${ccol ? "#075985" : "#38bdf8"} ${primary}%, ${ccol ? "#e2e8f0" : "#1e293b"} 0)` }}><div className={`absolute inset-3 flex items-center justify-center rounded-full text-lg font-black ${ccol ? "bg-white" : "bg-slate-950"}`}><AnimatedPercent value={value} duration={1_450} delay={120} /></div></div><div><div className={`text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>{secondaryLabel}</div><div className="mt-1 text-2xl font-black"><AnimatedPercent value={secondary} delay={240} /></div></div></div></div>;
}
