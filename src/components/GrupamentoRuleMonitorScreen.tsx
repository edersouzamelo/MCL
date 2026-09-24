"use client";

import { type ReactNode } from "react";
import { AlertTriangle, BarChart3, CircleDollarSign } from "lucide-react";
import { AnimatedCurrency, AnimatedPercent, useAnimatedValue } from "@/components/MonitorAnimatedValue";
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
          <h1 className="mcl-broadcast-title mt-2 text-4xl font-black">Resumo das Classes</h1>
          <p className={`mt-2 text-sm ${ccol ? "text-slate-600" : "text-slate-400"}`}>Classificação por igualdade exata de PI conforme {CCO_RULE_SOURCE.fileName}.</p>
        </div>
        <div className={`mcl-broadcast-card rounded-xl border px-4 py-3 text-right text-xs ${ccol ? "border-slate-300 bg-white text-slate-600" : "border-white/10 bg-white/[0.03] text-slate-400"}`} style={{ animationDelay: "120ms" }}>
          <div>{sag.rows.length} linhas · exercício</div>
          <div>{rpn.rows.length} linhas · créditos anteriores</div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {executions.map(({ definition, execution }, index) => (
          <article key={definition.id} className={`mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: `${160 + index * 70}ms` }}>
            <div className={`text-xs font-bold uppercase tracking-[0.15em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>{definition.label}</div>
            <div className="mt-2 text-lg font-black">{definition.subtitle}</div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniMetric label="Recebido" value={<AnimatedCurrency value={execution.current.total} maximumFractionDigits={0} delay={180 + index * 40} />} ccol={ccol} />
              <MiniMetric label="Empenhado" value={<AnimatedPercent value={execution.current.committedPercent} delay={240 + index * 40} />} ccol={ccol} />
              <MiniMetric label="Liquidado" value={<AnimatedPercent value={execution.current.liquidatedPercent} delay={300 + index * 40} />} ccol={ccol} />
            </div>
            <div className={`mt-4 border-t pt-4 ${ccol ? "border-slate-200" : "border-white/10"}`}>
              <div className="flex items-center justify-between text-sm"><span className={ccol ? "text-slate-500" : "text-slate-400"}>Créditos do exercício anterior</span><strong><AnimatedPercent value={execution.previous.liquidatedPercent} delay={320 + index * 40} /> liquidados</strong></div>
              <ExecutionBar value={execution.previous.liquidatedPercent} ccol={ccol} />
            </div>
          </article>
        ))}
      </div>

      {unmappedCurrent || unmappedPrevious ? (
        <div className={`mcl-broadcast-card mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${ccol ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`} style={{ animationDelay: "620ms" }}>
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
          <h1 className="mcl-broadcast-title mt-2 text-5xl font-black tracking-tight">{definition.title}</h1>
          <p className={`mt-2 text-lg ${ccol ? "text-slate-600" : "text-slate-400"}`}>{definition.subtitle}</p>
        </div>
        <div className={`mcl-broadcast-card rounded-2xl border px-5 py-4 text-right ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "120ms" }}>
          <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${ccol ? "text-slate-500" : "text-slate-500"}`}>Matriz de referência</div>
          <div className="mt-1 font-bold">{CCO_RULE_SOURCE.fileName}</div>
          <div className={`text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>{CCO_RULE_SOURCE.referenceDate}</div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Previsto" value={plannedText} ccol={ccol} delay={140} />
            <Metric label="Recebido" value={<AnimatedCurrency value={execution.current.total} maximumFractionDigits={0} delay={180} />} ccol={ccol} delay={210} />
            <Metric label="Empenhado" value={<AnimatedPercent value={execution.current.committedPercent} delay={260} />} ccol={ccol} delay={280} />
            <Metric label="Liquidado" value={<AnimatedPercent value={execution.current.liquidatedPercent} delay={340} />} ccol={ccol} delay={350} />
          </div>

          <div className={`mcl-broadcast-card mt-5 overflow-hidden rounded-2xl border ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.02]"}`} style={{ animationDelay: "430ms" }}>
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
                {execution.groups.map(({ group, current, previous, matchedCurrentRows, matchedPreviousRows }, index) => (
                  <tr key={group.id} className={`mcl-broadcast-row ${ccol ? "bg-white" : "bg-white/[0.01]"}`} style={{ animationDelay: `${520 + index * 65}ms` }}>
                    <td className="px-4 py-3 font-bold"><div>{group.label}</div><div className={`mt-0.5 text-[10px] font-normal ${ccol ? "text-slate-400" : "text-slate-500"}`}>{matchedCurrentRows} linha(s) exercício · {matchedPreviousRows} anterior</div></td>
                    <td className="px-4 py-3">{group.planned !== undefined ? currency(group.planned) : group.plannedLabel ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold"><AnimatedCurrency value={current.total} maximumFractionDigits={0} delay={540 + index * 35} /></td>
                    <td className="px-4 py-3 font-black"><AnimatedPercent value={current.committedPercent} delay={580 + index * 35} /></td>
                    <td className="px-4 py-3 font-black"><AnimatedPercent value={current.liquidatedPercent} delay={620 + index * 35} /></td>
                    <td className="px-4 py-3"><AnimatedCurrency value={previous.inscribed} maximumFractionDigits={0} delay={660 + index * 35} /></td>
                    <td className="px-4 py-3 font-black"><AnimatedPercent value={previous.liquidatedPercent} delay={700 + index * 35} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Donut title="Exercício Corrente" value={execution.current.committedPercent} secondary={execution.current.liquidatedPercent} ccol={ccol} />
          <Donut title="Créditos do exercício anterior" value={execution.previous.liquidatedPercent} secondary={execution.previous.cancelledPercent} secondaryLabel="cancelado" ccol={ccol} />
          <div className={`mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "480ms" }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><CircleDollarSign className="h-4 w-4" /> Saldo a aplicar</div>
            <div className="mt-3 text-3xl font-black"><AnimatedCurrency value={execution.current.available} maximumFractionDigits={0} delay={520} /></div>
            <div className={`mt-1 text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>Disponível no Exercício Corrente</div>
            <div className={`mt-4 border-t pt-4 ${ccol ? "border-slate-200" : "border-white/10"}`}>
              <div className="flex justify-between text-sm"><span>A liquidar · anterior</span><strong><AnimatedCurrency value={execution.previous.toLiquidate} maximumFractionDigits={0} delay={620} /></strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, ccol, delay = 0 }: { label: string; value: ReactNode; ccol: boolean; delay?: number }) {
  return <div className={`mcl-broadcast-card rounded-2xl border p-4 ${ccol ? "border-slate-300 bg-white shadow-sm" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: `${delay}ms` }}><div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${ccol ? "text-slate-500" : "text-slate-500"}`}>{label}</div><div className="mt-2 break-words text-2xl font-black">{value}</div></div>;
}

function MiniMetric({ label, value, ccol }: { label: string; value: ReactNode; ccol: boolean }) {
  return <div className={`mcl-data-tile rounded-xl p-3 ${ccol ? "bg-slate-100" : "bg-white/[0.04]"}`}><div className={`text-[9px] font-bold uppercase tracking-wider ${ccol ? "text-slate-500" : "text-slate-500"}`}>{label}</div><div className="mt-1 truncate text-sm font-black">{value}</div></div>;
}

function ExecutionBar({ value, ccol }: { value: number; ccol: boolean }) {
  return <div className={`mt-2 h-2 overflow-hidden rounded-full ${ccol ? "bg-slate-200" : "bg-white/10"}`}><div className={ccol ? "mcl-broadcast-bar h-full rounded-full bg-sky-800" : "mcl-broadcast-bar h-full rounded-full bg-sky-400"} style={{ width: `${cap(value)}%` }} /></div>;
}

function Donut({ title, value, secondary, secondaryLabel = "liquidado", ccol }: { title: string; value: number; secondary: number; secondaryLabel?: string; ccol: boolean }) {
  const primary = cap(useAnimatedValue(value, { duration: 1_500, delay: 160 }));
  return (
    <div className={`mcl-broadcast-card rounded-2xl border p-5 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-white/[0.03]"}`} style={{ animationDelay: "420ms" }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><BarChart3 className="h-4 w-4" /> {title}</div>
      <div className="mt-4 flex items-center gap-5">
        <div className="mcl-donut-live relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${ccol ? "#075985" : "#38bdf8"} ${primary}%, ${ccol ? "#e2e8f0" : "#1e293b"} 0)` }}>
          <div className={`absolute inset-4 flex items-center justify-center rounded-full text-xl font-black ${ccol ? "bg-white" : "bg-slate-950"}`}><AnimatedPercent value={value} duration={1_500} delay={160} /></div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>Indicador principal</div>
          <div className="mt-1 text-2xl font-black"><AnimatedPercent value={value} duration={1_500} delay={160} /></div>
          <div className={`mt-4 text-xs ${ccol ? "text-slate-500" : "text-slate-400"}`}>{secondaryLabel}</div>
          <div className="mt-1 text-xl font-bold"><AnimatedPercent value={secondary} delay={280} /></div>
        </div>
      </div>
    </div>
  );
}
