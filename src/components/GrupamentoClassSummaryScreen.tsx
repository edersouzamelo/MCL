"use client";

import { AnimatedCurrency } from "@/components/MonitorAnimatedValue";
import { CCO_CLASS_SLIDES, type CcoClassId, type CcoLayoutId } from "@/modules/grupamento/cco";
import { buildCcoClassSummary, CCO_SUMMARY_ROWS_PER_PAGE } from "@/modules/grupamento/class-summary";
import type { SagImportResult } from "@/modules/grupamento/sag";

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "%";

export function GrupamentoClassSummaryScreen({ classId, sag, layout, page = 0 }: {
  classId: CcoClassId; sag: SagImportResult; layout: CcoLayoutId; page?: number;
}) {
  const definition = CCO_CLASS_SLIDES.find((item) => item.id === classId)!;
  const summary = buildCcoClassSummary(classId, sag.rows);
  const pageCount = Math.max(1, Math.ceil(summary.byPi.length / CCO_SUMMARY_ROWS_PER_PAGE));
  const safePage = Math.max(0, Math.min(pageCount - 1, page));
  const items = summary.byPi.slice(safePage * CCO_SUMMARY_ROWS_PER_PAGE, (safePage + 1) * CCO_SUMMARY_ROWS_PER_PAGE);
  const ccol = layout === "ccol";
  // Signed balances cannot be represented as a part/complement of a positive total.
  const complementary = summary.total > 0 && summary.byPi.every((item) => item.total >= 0);
  const max = Math.max(...summary.byPi.map((item) => Math.abs(item.total)), 1);
  return <div className="mcl-budget-scene mcl-budget-class-summary">
    <header className="mcl-budget-heading">
      <h1>{definition.label} - Resumido</h1>
      <p>Recursos recebidos no exercício corrente · por PI · todas as UGs da fonte importada</p>
    </header>
    <div className="mcl-class-summary-total">
      <div>Total recebido</div>
      <strong><AnimatedCurrency value={summary.total} /></strong>
    </div>
    <div className="mcl-class-summary-bars" style={{ gridTemplateRows: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
      {items.map((item) => <article key={item.pi} className="mcl-class-summary-row">
        <div className="mcl-class-summary-label">
          <strong className="font-mono">{item.pi}</strong>
          <span>{currency(item.total)} <span className="opacity-70">({percent(item.share)})</span></span>
        </div>
        <div role="img" aria-label={`${item.pi}: ${currency(item.total)}, ${percent(item.share)} do total da classe`} className={`mcl-class-summary-track ${ccol ? "bg-slate-200" : "bg-white/10"}`}>
          <div className={ccol ? "h-full bg-sky-800" : "h-full bg-sky-400"} style={{ width: `${complementary ? item.share : Math.abs(item.total) / max * 100}%` }} />
        </div>
      </article>)}
      {!items.length && <p className="self-center text-center">Nenhum PI desta classe foi encontrado na fonte SAG importada.</p>}
    </div>
    <footer className="mcl-class-summary-footer">
      <span>Quadro {safePage + 1}/{pageCount} · {summary.byPi.length} PIs encontrados · participação no total da classe</span>
      {summary.missingPiCodes.length > 0 && <span>{summary.missingPiCodes.length} PIs da matriz sem registros nesta carga.</span>}
      {summary.unmappedPurposes.length > 0 && <span>Sem PI definido na matriz: {summary.unmappedPurposes.join(", ")}.</span>}
    </footer>
  </div>;
}
