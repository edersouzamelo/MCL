"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import type { FinancialSnapshotPair } from "@/modules/financial-snapshots/repository";

type SnapshotResponse = FinancialSnapshotPair & { complete: boolean; dataNature: "PERSISTED_IMPORTED" | "NONE" };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const percent = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function CreditManagementClient() {
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/grupamento/sag/latest", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao consultar a fonte financeira.");
      setSnapshot(payload as SnapshotResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao consultar a fonte financeira.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  if (loading) return <State title="Consultando fonte persistida" description="Nenhum valor será exibido antes da confirmação do servidor." loading />;
  if (error) return <State title="Fonte financeira indisponível" description={error} danger />;
  if (!snapshot?.current && !snapshot?.rpn) return <State title="Nenhuma carga financeira validada" description="O MCL não possui um snapshot SAG persistido para esta organização. Importe Exercício Corrente e RPNP no Centro de Coordenação Logística." danger />;

  const current = snapshot.current;
  const rpn = snapshot.rpn;
  const latest = [current?.persistedAt, rpn?.persistedAt].filter((value): value is string => Boolean(value)).sort().at(-1);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-sky-200 bg-gradient-to-br from-slate-950 to-sky-950 p-6 text-white shadow-xl dark:border-sky-900/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300"><Wallet className="h-4 w-4" /> Créditos orçamentários</div>
            <h1 className="mt-2 text-3xl font-black">Saldos contábeis importados do SAG</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Valores calculados deterministicamente a partir do último arquivo validado e persistido. Esta tela não contém dados demonstrativos nem sincronizações presumidas.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4" /> Atualizar leitura</button>
        </div>
      </header>

      {!snapshot.complete ? <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /> O snapshot está incompleto. Somente a fonte efetivamente persistida é exibida; a fonte ausente não foi estimada.</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Crédito recebido" value={current ? money(current.totals.total) : "Fonte ausente"} />
        <Metric label="Crédito disponível" value={current ? money(current.totals.available) : "Fonte ausente"} />
        <Metric label="A liquidar — exercício" value={current ? money(current.totals.toLiquidate) : "Fonte ausente"} />
        <Metric label="A liquidar — RPNP" value={rpn ? money(rpn.totals.toLiquidate) : "Fonte ausente"} />
      </section>

      {current ? <CurrentTable current={current} /> : null}
      {rpn ? <RpnTable rpn={rpn} /> : null}

      <footer className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-1.5"><Database className="h-4 w-4" /> Natureza: dado importado persistido</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Última persistência real: {latest ? new Date(latest).toLocaleString("pt-BR") : "não disponível"}</span></div>
        <div className="mt-2 break-all font-mono">Checksum exercício: {current?.checksum ?? "fonte ausente"}<br />Checksum RPNP: {rpn?.checksum ?? "fonte ausente"}</div>
      </footer>
    </div>
  );
}

function CurrentTable({ current }: { current: NonNullable<FinancialSnapshotPair["current"]> }) {
  return <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><h2 className="text-lg font-black">Exercício corrente por PI</h2><p className="mt-1 text-xs text-zinc-500">{current.rows.length} linhas válidas · {current.source.fileName}</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800"><tr><th className="p-2">PI</th><th className="p-2">Finalidade</th><th className="p-2 text-right">Recebido</th><th className="p-2 text-right">Disponível</th><th className="p-2 text-right">Empenhado</th><th className="p-2 text-right">Liquidado</th></tr></thead><tbody>{current.byPi.map((item) => <tr key={item.pi} className="border-b border-zinc-100 dark:border-zinc-900"><td className="p-2 font-mono font-bold">{item.pi}</td><td className="p-2">{item.piName || "Não informado pela fonte"}</td><td className="p-2 text-right">{money(item.snapshot.total)}</td><td className="p-2 text-right font-bold">{money(item.snapshot.available)}</td><td className="p-2 text-right">{percent(item.snapshot.committedPercent)}</td><td className="p-2 text-right">{percent(item.snapshot.liquidatedPercent)}</td></tr>)}</tbody></table></div></section>;
}

function RpnTable({ rpn }: { rpn: NonNullable<FinancialSnapshotPair["rpn"]> }) {
  return <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><h2 className="text-lg font-black">RPNP por PI</h2><p className="mt-1 text-xs text-zinc-500">{rpn.rows.length} linhas válidas · {rpn.source.fileName}</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800"><tr><th className="p-2">PI</th><th className="p-2">Finalidade</th><th className="p-2 text-right">Inscrito</th><th className="p-2 text-right">A liquidar</th><th className="p-2 text-right">Liquidado</th><th className="p-2 text-right">Cancelado</th></tr></thead><tbody>{rpn.byPi.map((item) => <tr key={item.pi} className="border-b border-zinc-100 dark:border-zinc-900"><td className="p-2 font-mono font-bold">{item.pi}</td><td className="p-2">{item.piName || "Não informado pela fonte"}</td><td className="p-2 text-right">{money(item.snapshot.inscribed)}</td><td className="p-2 text-right font-bold">{money(item.snapshot.toLiquidate)}</td><td className="p-2 text-right">{money(item.snapshot.liquidated)}</td><td className="p-2 text-right">{money(item.snapshot.cancelled)}</td></tr>)}</tbody></table></div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>; }
function State({ title, description, loading = false, danger = false }: { title: string; description: string; loading?: boolean; danger?: boolean }) { return <div className={`rounded-2xl border p-8 ${danger ? "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"}`}><div className="flex items-center gap-3">{loading ? <RefreshCw className="h-6 w-6 animate-spin" /> : <AlertTriangle className="h-6 w-6" />}<div><h1 className="text-xl font-black">{title}</h1><p className="mt-1 text-sm opacity-80">{description}</p></div></div></div>; }
