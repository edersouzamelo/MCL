"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCog, Presentation } from "lucide-react";
import { classifySagRows } from "@/modules/grupamento/classification";
import { GROUP_STORAGE_KEYS, type CcoScreenId } from "@/modules/grupamento/monitor";
import type { SagRuleSet } from "@/modules/grupamento/rules";
import type { SagImportResult, SagRow } from "@/modules/grupamento/sag";

function loadRules() {
  try {
    const raw = window.localStorage.getItem(GROUP_STORAGE_KEYS.rules);
    return raw ? (JSON.parse(raw) as SagRuleSet) : null;
  } catch {
    return null;
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function GrupamentoRuleMonitorScreen({ screen, sag }: { screen: CcoScreenId; sag: SagImportResult }) {
  const [rules, setRules] = useState<SagRuleSet | null>(null);

  useEffect(() => {
    const hydrate = () => setRules(loadRules());
    const frame = window.requestAnimationFrame(hydrate);
    window.addEventListener("storage", hydrate);
    window.addEventListener("mcl-grupamento-rules-updated", hydrate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", hydrate);
      window.removeEventListener("mcl-grupamento-rules-updated", hydrate);
    };
  }, []);

  const classification = useMemo(() => (rules ? classifySagRows(sag.rows, rules) : null), [rules, sag.rows]);

  if (!rules) {
    return <RuleMissing />;
  }
  if (screen === "briefing") {
    return <Briefing rules={rules} rows={sag.rows} />;
  }
  return <Classes rules={rules} classification={classification} />;
}

function Classes({ rules, classification }: { rules: SagRuleSet; classification: ReturnType<typeof classifySagRows> | null }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Execução orçamentária por Classe</div>
          <h1 className="mt-3 text-4xl font-black">Classificação pela matriz importada</h1>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{rules.groups.length} grupos de regra</div>
          <div>{rules.conflicts.length} conflito(s) de PI</div>
        </div>
      </div>

      {classification?.classes.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-3 2xl:grid-cols-4">
          {classification.classes.slice(0, 12).map((item) => (
            <article key={item.className} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Classe {item.className}</div>
              <div className="mt-3 text-4xl font-black">{percent(item.snapshot.committedPercent)}</div>
              <div className="mt-1 text-sm text-slate-400">empenhado</div>
              <div className="mt-5 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Total</span><strong>{currency(item.snapshot.total)}</strong></div>
                <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">Liquidado</span><strong>{percent(item.snapshot.liquidatedPercent)}</strong></div>
                <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">PI reconhecidos</span><strong>{item.matchedPis.length}</strong></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-8 text-center text-amber-100">
          A carga SAG não contém códigos PI compatíveis com a matriz importada. O MCL não classifica por `NOME_PI` por aproximação.
        </div>
      )}

      {classification?.warnings.length ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{classification.warnings.length} alerta(s) de regra/classificação estão registrados no cockpit. Totais de Classe deduplicam uma mesma linha quando o PI aparece em grupos conflitantes da própria Classe.</span>
        </div>
      ) : null}
    </div>
  );
}

function Briefing({ rules, rows }: { rules: SagRuleSet; rows: SagRow[] }) {
  const cards = useMemo(() => {
    return rules.briefingRules.slice(0, 12).map((rule) => {
      const matched = rows.filter((row) => {
        const pi = row.pi?.trim().toUpperCase();
        if (!pi) return false;
        return rule.piCodes.includes(pi) || (rule.includeAllEPrefix && pi.startsWith("E"));
      });
      const total = matched.reduce((sum, row) => sum + row.computed.total, 0);
      const committed = matched.reduce((sum, row) => sum + row.computed.committed, 0);
      const committedPercent = total > 0 ? (committed / total) * 100 : 0;
      return { rule, rowCount: matched.length, total, committedPercent };
    });
  }, [rules.briefingRules, rows]);

  return (
    <div>
      <div className="flex items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300"><Presentation className="h-4 w-4" /> Modo briefing</div>
          <h1 className="mt-3 text-4xl font-black">Quadros definidos pela planilha de regras</h1>
        </div>
        <div className="text-right text-xs text-slate-400">{rules.briefingRules.length} definição(ões) reconhecidas</div>
      </div>

      {cards.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {cards.map(({ rule, rowCount, total, committedPercent }) => (
            <article key={rule.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="font-mono text-xs font-bold text-violet-300">SLIDE {rule.slideNumber}</div>
              <div className="mt-2 line-clamp-2 min-h-12 text-base font-bold">{rule.title}</div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                <div><div className="text-xs text-slate-500">Execução</div><div className="mt-1 text-xl font-black">{rowCount ? percent(committedPercent) : "—"}</div></div>
                <div><div className="text-xs text-slate-500">Volume</div><div className="mt-1 text-xl font-black">{rowCount ? currency(total) : "—"}</div></div>
              </div>
              <div className="mt-3 text-xs text-slate-500">{rowCount} linha(s) SAG correspondentes</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">A matriz importada não contém definições iniciadas por “Slide N -”.</div>
      )}
    </div>
  );
}

function RuleMissing() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-xl text-center">
        <FileCog className="mx-auto h-10 w-10 text-slate-600" />
        <h1 className="mt-4 text-3xl font-black">Matriz de regras não carregada</h1>
        <p className="mt-3 leading-6 text-slate-400">Carregue no cockpit a planilha que contém a tabela Classes / PI. Esta saída não inventa vínculos entre PI e Classe.</p>
      </div>
    </div>
  );
}
