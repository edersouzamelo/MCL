import { BarChart3 } from "lucide-react";
import { CCO_CLASS_SLIDES, CCO_RULE_SOURCE, buildCcoClassExecution, type CcoClassId, type CcoLayoutId } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function GrupamentoClassMonitorScreen({ classId, sag, rpn, layout }: { classId: CcoClassId; sag: SagImportResult; rpn: RpnImportResult; layout: CcoLayoutId }) {
  const execution = buildCcoClassExecution(classId, sag.rows, rpn.rows);
  const definition = CCO_CLASS_SLIDES.find((item) => item.id === classId)!;
  const ccol = layout === "ccol";

  return (
    <div className={ccol ? "rounded-xl bg-white p-7 text-zinc-950 shadow-2xl" : "text-white"}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-current/10 pb-5">
        <div>
          <div className={ccol ? "text-xs font-bold uppercase tracking-[0.18em] text-emerald-700" : "text-xs font-bold uppercase tracking-[0.18em] text-sky-300"}>Execução orçamentária logística · {definition.label}</div>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{definition.title}</h1>
          <p className={ccol ? "mt-1 text-sm text-zinc-600" : "mt-1 text-sm text-slate-400"}>{definition.subtitle}</p>
        </div>
        <div className={ccol ? "text-right text-xs text-zinc-500" : "text-right text-xs text-slate-400"}>Regra: {CCO_RULE_SOURCE.fileName}<br />Ref.: {CCO_RULE_SOURCE.referenceDate}</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-6">
        <Metric label="Previsto" value={execution.plannedComplete ? currency(execution.plannedKnownTotal) : `${currency(execution.plannedKnownTotal)}*`} ccol={ccol} />
        <Metric label="Recebido" value={currency(execution.current.total)} ccol={ccol} />
        <Metric label="Empenhado" value={percent(execution.current.committedPercent)} ccol={ccol} />
        <Metric label="Liquidado" value={percent(execution.current.liquidatedPercent)} ccol={ccol} />
        <Metric label="Créd. exercício anterior" value={currency(execution.previous.inscribed)} ccol={ccol} />
        <Metric label="Anterior liquidado" value={percent(execution.previous.liquidatedPercent)} ccol={ccol} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.65fr_1.35fr]">
        <div className={ccol ? "rounded-2xl border border-zinc-200 bg-zinc-50 p-5" : "rounded-2xl border border-white/10 bg-white/[0.03] p-5"}>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4" /> Indicadores</div>
          <Donut label="Empenhado" value={execution.current.committedPercent} ccol={ccol} />
          <Donut label="Liquidado" value={execution.current.liquidatedPercent} ccol={ccol} />
        </div>

        <div className={ccol ? "rounded-2xl border border-zinc-200 bg-white p-5" : "rounded-2xl border border-white/10 bg-white/[0.03] p-5"}>
          <div className="mb-4 text-sm font-bold">Execução por finalidade / subgrupo</div>
          <div className="space-y-4">
            {execution.groups.map(({ group, current, previous }) => (
              <div key={group.id}>
                <div className="mb-1.5 flex items-end justify-between gap-3 text-sm"><strong>{group.label}</strong><span className="font-mono text-xs">{percent(current.committedPercent)} emp. · {percent(current.liquidatedPercent)} liq.</span></div>
                <Bar value={current.committedPercent} ccol={ccol} />
                <div className={ccol ? "mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-zinc-500" : "mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500"}>
                  <span>Recebido {currency(current.total)}</span><span>Créd. anterior {currency(previous.inscribed)}</span><span>{group.planned !== undefined ? `Previsto ${currency(group.planned)}` : group.plannedLabel ?? "Previsto pendente"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, ccol }: { label: string; value: string; ccol: boolean }) {
  return <div className={ccol ? "rounded-xl border border-zinc-200 bg-zinc-50 p-4" : "rounded-xl border border-white/10 bg-white/[0.03] p-4"}><div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</div><div className="mt-2 text-xl font-black tracking-tight">{value}</div></div>;
}

function Donut({ label, value, ccol }: { label: string; value: number; ccol: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className="mb-5 flex items-center gap-4"><div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#0ea5e9 ${clamped}%, ${ccol ? "#e4e4e7" : "#1e293b"} 0)` }}><div className={ccol ? "absolute inset-3 flex items-center justify-center rounded-full bg-white text-lg font-black" : "absolute inset-3 flex items-center justify-center rounded-full bg-slate-950 text-lg font-black"}>{percent(value)}</div></div><div><div className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</div><div className="mt-1 text-sm opacity-70">Percentual recalculado sobre os valores agregados.</div></div></div>;
}

function Bar({ value, ccol }: { value: number; ccol: boolean }) {
  const width = Math.max(0, Math.min(100, value));
  return <div className={ccol ? "h-2.5 overflow-hidden rounded-full bg-zinc-200" : "h-2.5 overflow-hidden rounded-full bg-slate-800"}><div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} /></div>;
}
