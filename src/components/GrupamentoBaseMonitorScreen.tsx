"use client";

import { type CSSProperties, type ReactNode } from "react";
import { BarChart3, Building2, CircleDollarSign, ListTree } from "lucide-react";
import { AnimatedCurrency, AnimatedPercent } from "@/components/MonitorAnimatedValue";
import { MonitorBudgetDonut } from "@/components/MonitorBudgetDonut";
import { OmIdentity } from "@/components/OmIdentity";
import type { CcoLayoutId } from "@/modules/grupamento/cco";
import { CCO_PI_ROWS_PER_PAGE, CCO_UNIT_ROWS_PER_PAGE, type CcoScreenId } from "@/modules/grupamento/monitor";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult, SagSnapshot } from "@/modules/grupamento/sag";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
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
    <div className="mcl-budget-scene mcl-budget-overview">
      <div className="mcl-budget-heading flex items-end justify-between gap-6">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Situação orçamentária consolidada</div>
          <h1 className="mcl-broadcast-title mt-2 text-5xl font-black tracking-tight"><AnimatedPercent value={sag.totals.committedPercent} /> empenhado</h1>
          <p className={`mcl-broadcast-subtitle mt-2 text-lg ${ccol ? "text-slate-600" : "text-slate-400"}`}><AnimatedPercent value={sag.totals.liquidatedPercent} delay={180} /> liquidado no Exercício Corrente · <AnimatedPercent value={rpn.totals.liquidatedPercent} delay={260} /> dos créditos do exercício anterior liquidados</p>
        </div>
        <Donut value={sag.totals.committedPercent} secondary={sag.totals.liquidatedPercent} title="Exercício Corrente" ccol={ccol} />
      </div>

      <div className="mcl-budget-metrics grid grid-cols-4 gap-4">
        <Metric label="Crédito recebido" value={<AnimatedCurrency value={sag.totals.total} delay={120} />} ccol={ccol} delay={120} />
        <Metric label="Disponível" value={<AnimatedCurrency value={sag.totals.available} delay={200} />} ccol={ccol} delay={200} />
        <Metric label="Créditos anteriores inscritos" value={<AnimatedCurrency value={rpn.totals.inscribed} delay={280} />} ccol={ccol} delay={280} />
        <Metric label="Créditos anteriores a liquidar" value={<AnimatedCurrency value={rpn.totals.toLiquidate} delay={360} />} ccol={ccol} delay={360} />
      </div>

      <div className={`mcl-budget-ranking mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "420ms" }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> Maior volume recebido por OM · Exercício Corrente</div>
        <div className="mcl-budget-ranking-grid grid grid-cols-2 gap-x-8 gap-y-4" style={{ gridTemplateRows: `repeat(${Math.ceil(top.length / 2) || 1}, minmax(0, 1fr))` }}>
          {top.map((item, index) => (
            <div key={item.ug} className="mcl-broadcast-row" style={{ animationDelay: `${520 + index * 55}ms` }}>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="min-w-0 font-semibold"><OmIdentity name={item.acronym || item.ug} /> <span className={ccol ? "text-slate-400" : "text-slate-500"}>({item.ug})</span></span><strong>{currency(item.snapshot.total)}</strong></div>
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
    <div className="mcl-budget-scene mcl-budget-execution">
      <header className="mcl-budget-heading"><div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Exercício Corrente</div>
      <h1 className="mt-2 text-4xl font-black">Execução Orçamentária</h1></header>
      <div className="mcl-budget-metrics grid grid-cols-3 gap-5">
        <Metric label="Execução empenhada" value={<AnimatedPercent value={snapshot.committedPercent} />} ccol={ccol} delay={120} />
        <Metric label="Execução liquidada" value={<AnimatedPercent value={snapshot.liquidatedPercent} delay={180} />} ccol={ccol} delay={200} />
        <Metric label="Crédito recebido" value={<AnimatedCurrency value={snapshot.total} delay={240} />} ccol={ccol} delay={280} />
      </div>
      <div className={`mcl-budget-composition mcl-broadcast-card rounded-2xl border p-6 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "380ms" }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> Composição do crédito</div>
        <div className="mcl-budget-bar-grid">
          {items.map(([label, value], index) => (
            <div key={label} className="mcl-broadcast-row grid grid-cols-[1fr_4fr_1.5fr] items-center gap-4 text-sm" style={{ animationDelay: `${460 + index * 80}ms` }}>
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
  return (
    <div className="mcl-budget-scene mcl-budget-previous">
      <header className="mcl-budget-heading"><div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-violet-800" : "text-violet-300"}`}>Créditos do exercício anterior</div>
      <h1 className="mt-2 text-4xl font-black">Execução dos créditos do exercício anterior</h1></header>
      <div className="mcl-budget-previous-main grid grid-cols-[1fr_1fr_0.85fr] gap-5">
        <Metric label="Total inscrito" value={<AnimatedCurrency value={rpn.totals.inscribed} />} ccol={ccol} delay={120} />
        <Metric label="A liquidar" value={<AnimatedCurrency value={rpn.totals.toLiquidate} delay={180} />} ccol={ccol} delay={200} />
        <Donut value={rpn.totals.liquidatedPercent} secondary={rpn.totals.cancelledPercent} secondaryLabel="cancelado" title="Liquidação" ccol={ccol} />
      </div>
      <div className="mcl-budget-previous-secondary grid grid-cols-2 gap-4">
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
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const visibleRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className="mcl-budget-scene mcl-budget-units">
      <div className="mcl-budget-heading flex items-end justify-between gap-5">
        <div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}><Building2 className="h-4 w-4" /> Organizações / UG</div>
          <h1 className="mt-2 text-4xl font-black">{source} · série {prefix}xxx</h1>
          <p className={`mt-2 text-sm ${ccol ? "text-slate-600" : "text-slate-400"}`}>A série 160xxx e a série 167xxx são exibidas em quadros separados. Nenhuma OM é descartada.</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-center ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
          <div className="text-2xl font-black">{visibleRows.length}/{rows.length}</div>
          <div className={`text-[10px] uppercase tracking-wider ${ccol ? "text-slate-500" : "text-slate-500"}`}>UG · quadro {safePage + 1}/{totalPages}</div>
        </div>
      </div>

      <div className="mcl-budget-unit-grid grid gap-3" style={{ gridTemplateRows: `repeat(${Math.ceil(visibleRows.length / 2) || 1}, minmax(0, 1fr))` }}>
        {visibleRows.map((row, index) => (
          <div key={row.ug} className={`mcl-budget-unit mcl-broadcast-row flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.025]"}`} style={{ animationDelay: `${120 + index * 45}ms` }}>
            <div className="mcl-budget-unit-identity"><OmIdentity name={row.acronym || "—"} /><div className="font-mono opacity-60">UG {row.ug}</div></div>
            <div className="mcl-budget-unit-values"><strong>{currency(row.total)}</strong><div className="flex justify-end gap-6">
              <div><div className="font-black"><AnimatedPercent value={row.primary} delay={120 + index * 35} /></div><div className={`text-[9px] uppercase ${ccol ? "text-slate-400" : "text-slate-500"}`}>{previous ? "liq." : "emp."}</div></div>
              <div><div className="font-black"><AnimatedPercent value={row.secondary} delay={180 + index * 35} /></div><div className={`text-[9px] uppercase ${ccol ? "text-slate-400" : "text-slate-500"}`}>{previous ? "canc." : "liq."}</div></div>
            </div></div>
          </div>
        ))}
        {!rows.length ? <div className={`col-span-full rounded-2xl border border-dashed p-10 text-center ${ccol ? "border-slate-300 text-slate-500" : "border-white/10 text-slate-500"}`}>Nenhuma UG da série {prefix}xxx foi encontrada nesta fonte.</div> : null}
      </div>
    </div>
  );
}

function PiTable({ sag, layout, page, pageSize }: { sag: SagImportResult; layout: CcoLayoutId; page: number; pageSize: number }) {
  const ccol = layout === "ccol";
  const size = Math.max(1, Math.min(CCO_PI_ROWS_PER_PAGE, pageSize));
  const totalPages = Math.max(1, Math.ceil(sag.byPi.length / size));
  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const rows = sag.byPi.slice(safePage * size, (safePage + 1) * size);
  return <div className="mcl-budget-scene mcl-budget-pis">
    <header className="mcl-budget-heading">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}><ListTree className="h-4 w-4" /> Planos Internos · Exercício Corrente</div>
      <div className="flex items-end justify-between gap-4"><h1 className="mt-2 text-4xl font-black">Execução por PI</h1><div className="font-bold">Quadro {safePage + 1}/{totalPages} · {rows.length}/{sag.byPi.length} PI</div></div>
      <p className={ccol ? "text-slate-600" : "text-slate-400"}>Pizza: crédito empenhado (azul) / disponível (cinza). Liquidação indicada separadamente.</p>
    </header>
    <div className="mcl-budget-pi-grid" style={{ "--pi-rows-wide": Math.max(1, Math.ceil(rows.length / 5)), "--pi-rows-narrow": Math.max(1, Math.ceil(rows.length / 4)) } as CSSProperties}>
      {rows.map((item) => <article key={item.pi} className={`mcl-budget-pi mcl-broadcast-card rounded-xl border ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
        <strong className="font-mono">{item.pi}</strong>
        <div className="mcl-budget-pi-name" title={item.piName}>{item.piName || "Sem descrição na fonte"}</div>
        <div className="mcl-budget-pi-body"><MonitorBudgetDonut value={item.snapshot.committedPercent} ccol={ccol} label="Empenhado" /><div><small>Recebido</small><strong>{currency(item.snapshot.total)}</strong><small>Liquidado</small><strong>{percent(item.snapshot.liquidatedPercent)}</strong></div></div>
      </article>)}
      {!rows.length && <p>Nenhum PI encontrado nesta fonte.</p>}
    </div>
  </div>;
}

function Metric({ label, value, ccol, delay = 0 }: { label: string; value: ReactNode; ccol: boolean; delay?: number }) {
  return <div className={`mcl-budget-metric mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: `${delay}ms` }}><div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${ccol ? "text-slate-500" : "text-slate-400"}`}><CircleDollarSign className="h-4 w-4" /> {label}</div><div className="mt-3 break-words text-3xl font-black tracking-tight">{value}</div></div>;
}

function Donut({ value, secondary, title, secondaryLabel = "liquidado", ccol }: { value: number; secondary: number; title: string; secondaryLabel?: string; ccol: boolean }) {
  return <div className={`mcl-budget-donut mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}><div className="text-xs font-bold uppercase tracking-[0.14em]">{title}</div><div className="mcl-budget-donut-body"><MonitorBudgetDonut value={value} ccol={ccol} label={title} /><div><div className={ccol ? "text-slate-500" : "text-slate-400"}>{secondaryLabel}</div><div className="mt-1 text-2xl font-black"><AnimatedPercent value={secondary} /></div></div></div></div>;
}
