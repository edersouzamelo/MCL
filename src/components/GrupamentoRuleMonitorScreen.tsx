"use client";

import { AlertTriangle, BarChart3, CircleDollarSign } from "lucide-react";
import {
  CCO_CLASS_SLIDES,
  CCO_RULE_SOURCE,
  buildCcoClassExecution,
  findUnmappedPis,
  type CcoClassExecution,
  type CcoClassId,
  type CcoLayoutId,
} from "@/modules/grupamento/cco";
import type { CcoScreenId } from "@/modules/grupamento/monitor";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function cap(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function GrupamentoRuleMonitorScreen({
  screen,
  sag,
  rpn,
  layout,
}: {
  screen: CcoScreenId;
  sag: SagImportResult;
  rpn: RpnImportResult;
  layout: CcoLayoutId;
}) {
  if (screen === "briefing") return <ClassBriefing sag={sag} rpn={rpn} layout={layout} />;
  const classId = screen as CcoClassId;
  const definition = CCO_CLASS_SLIDES.find((item) => item.id === classId);
  if (!definition) return null;
  return <ClassSlide classId={classId} sag={sag} rpn={rpn} layout={layout} />;
}

function ClassBriefing({ sag, rpn, layout }: { sag: SagImportResult; rpn: RpnImportResult; layout: CcoLayoutId }) {
  const ccol = layout === "ccol";
  const executions = CCO_CLASS_SLIDES.map((definition) => ({ definition, execution: buildCcoClassExecution(definition.id, sag.rows, rpn.rows) }));
  const unmappedCurrent = findUnmappedPis(sag.rows).length;
  const unmappedPrevious = findUnmappedPis(rpn.rows).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Execução orçamentária por Classe</div>
          <h1 className="mt-2 text-4xl font-black">Resumo das Classes</h1>
          <p className={`mt-2 text-sm ${ccol ? "text-slate-600" : "text-slate-400"}`}>Classificação por igualdade exata de PI conforme {CCO_RULE_SOURCE.fileName}.</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-right text-xs ${ccol ? "border-slate-300 bg-white text-slate-600" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>
          <div>{sag.rows.length} linhas · exercício</div>
          <div>{rpn.rows.length} linhas · créditos anteriores</div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {executions.map(({ definition, execution }) => (
          <article key={definition.id} className={`rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`}>
            <div className={`text-xs font-bold uppercase tracking-[0.15em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>{definition.label}</div>
            <div className="mt-2 text-lg font-black">{definition.subtitle}</div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniMetric label="Recebido" value={currency(execution.current.total)} ccol={ccol} />
              <MiniMetric label="Empenhado" value={percent(execution.current.committedPercent)} ccol={ccol} />
              <MiniMetric label="Liquidado" value={percent(execution.current.liquidatedPercent)} ccol={ccol} />
            </div>
            <div className={`mt-4 border-t pt-4 ${ccol ? "border-slate-200" : "border-white/10"}`}>
              <div className="flex items-center justify-between text-sm"><span className={ccol ? "text-slate-500" : "text-slate-400"}>Créditos do exercício anterior</span><strong>{percent(execution.previous.liquidatedPercent)} liquidados</strong></div>
              <ExecutionBar value={execution.previous.liquidatedPercent} ccol={ccol} />
            </div>
          </article>
        ))}
      </div>

      {unmappedCurrent || unmappedPrevious ? (
        <div className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${ccol ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>PI ainda não mapeados na matriz: {unmappedCurrent} no Exercício Corrente e {unmappedPrevious} nos créditos do exercício anterior. Eles não são atribuídos silenciosamente a nenhuma Classe.</span>
        </div>
      ) : null}
    </div>
  );
}

function ClassSlide({ classId, sag, rpn, layout }: { classId: CcoClassId; sag: SagImportResult; rpn: RpnImportResult; layout: CcoLayoutId }) {
  const ccol = layout === "ccol";
  const definition = CCO_CLASS_SLIDES.find((item) => item.id === classId)!;
  const execution = buildCcoClassExecution(classId, sag.rows, rpn.rows);
  const plannedText = execution.plannedComplete ? currency(execution.plannedKnownTotal) : `${currency(execution.plannedKnownTotal)} + pendente/EXTRA`;

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>Execução Orçamentária / CMO</div>
          <h1 className="mt-2 text-5xl font-black tracking-tight">{definition.title}</h1>
          <p className={`mt-2 text-lg ${ccol ? "text-slate-600" : "text-slate-400"}`}>{definition.subtitle}</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 text-right ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
          <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${ccol ? "text-slate-500" : "text-slate-500"}`}>Matriz de referência</div>
          <div className="mt-1 font-bold">{CCO_RULE_SOURCE.fileName}</div>
          <div className={`text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>{CCO_RULE_SOURCE.referenceDate}</div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Previsto" value={plannedText} ccol={ccol} />
            <Metric label="Recebido" value={currency(execution.current.total)} ccol={ccol} />
            <Metric label="Empenhado" value={percent(execution.current.committedPercent)} ccol={ccol} />
            <Metric label="Liquidado" value={percent(execution.current.liquidatedPercent)} ccol={ccol} />
          </div>

          <div className={`mt-5 overflow-hidden rounded-2xl border ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.02]"}`}>
            <table className="w-full text-left text-sm">
              <thead className={ccol ? "bg-sky-950 text-white" : "bg-white/[0.06] text-slate-300"}>
                <tr>
                  <th className="px-4 py-3">Finalidade</th>
                  <th className="px-4 py-3">Previsto</th>
                  <th className="px-4 py-3">Recebido</th>
                  <th className="px-4 py-3">Emp.</th>
                  <th className="px-4 py-3">Liq.</th>
                  <th className="px-4 py-3">Créd. ant.</th>
                  <th className="px-4 py-3">Liq. ant.</th>
                </tr>
              </thead>
              <tbody className={ccol ? "divide-y divide-slate-200" : "divide-y divide-white/10"}>
                {execution.groups.map(({ group, current, previous, matchedCurrentRows, matchedPreviousRows }) => (
                  <tr key={group.id} className={ccol ? "bg-white" : "bg-white/[0.01]"}>
                    <td className="px-4 py-3 font-bold"><div>{group.label}</div><div className={`mt-0.5 text-[10px] font-normal ${ccol ? "text-slate-400" : "text-slate-500"}`}>{matchedCurrentRows} linha(s) exercício · {matchedPreviousRows} anterior</div></td>
                    <td className="px-4 py-3">{group.planned !== undefined ? currency(group.planned) : group.plannedLabel ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">{currency(current.total)}</td>
                    <td className="px-4 py-3 font-black">{percent(current.committedPercent)}</td>
                    <td className="px-4 py-3 font-black">{percent(current.liquidatedPercent)}</td>
                    <td className="px-4 py-3">{currency(previous.inscribed)}</td>
                    <td className="px-4 py-3 font-black">{percent(previous.liquidatedPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Donut title="Exercício Corrente" value={execution.current.committedPercent} secondary={execution.current.liquidatedPercent} ccol={ccol} />
          <Donut title="Créditos do exercício anterior" value={execution.previous.liquidatedPercent} secondary={execution.previous.cancelledPercent} secondaryLabel="cancelado" ccol={ccol} />
          <div className={`rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><CircleDollarSign className="h-4 w-4" /> Saldo a aplicar</div>
            <div className="mt-3 text-3xl font-black">{currency(execution.current.available)}</div>
            <div className={`mt-1 text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>Disponível no Exercício Corrente</div>
            <div className={`mt-4 border-t pt-4 ${ccol ? "border-slate-200" : "border-white/10"}`}>
              <div className="flex justify-between text-sm"><span>A liquidar · anterior</span><strong>{currency(execution.previous.toLiquidate)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, ccol }: { label: string; value: string; ccol: boolean }) {
  return <div className={`rounded-2xl border p-4 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`}><div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${ccol ? "text-slate-500" : "text-slate-500"}`}>{label}</div><div className="mt-2 break-words text-2xl font-black">{value}</div></div>;
}

function MiniMetric({ label, value, ccol }: { label: string; value: string; ccol: boolean }) {
  return <div className={`rounded-xl p-3 ${ccol ? "bg-slate-100" : "bg-white/[0.04]"}`}><div className={`text-[9px] font-bold uppercase tracking-wider ${ccol ? "text-slate-500" : "text-slate-500"}`}>{label}</div><div className="mt-1 truncate text-sm font-black" title={value}>{value}</div></div>;
}

function ExecutionBar({ value, ccol }: { value: number; ccol: boolean }) {
  return <div className={`mt-2 h-2 overflow-hidden rounded-full ${ccol ? "bg-slate-200" : "bg-white/10"}`}><div className={ccol ? "h-full rounded-full bg-sky-800" : "h-full rounded-full bg-sky-400"} style={{ width: `${cap(value)}%` }} /></div>;
}

function Donut({ title, value, secondary, secondaryLabel = "liquidado", ccol }: { title: string; value: number; secondary: number; secondaryLabel?: string; ccol: boolean }) {
  const primary = cap(value);
  return (
    <div className={`rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> {title}</div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${ccol ? "#075985" : "#38bdf8"} ${primary}%, ${ccol ? "#e2e8f0" : "#1e293b"} 0)` }}>
          <div className={`absolute inset-4 flex items-center justify-center rounded-full text-xl font-black ${ccol ? "bg-white" : "bg-slate-950"}`}>{percent(value)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>Indicador principal</div>
          <div className="mt-1 text-2xl font-black">{percent(value)}</div>
          <div className={`mt-4 text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>{secondaryLabel}</div>
          <div className="mt-1 text-xl font-bold">{percent(secondary)}</div>
        </div>
      </div>
    </div>
  );
}
