"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Database, Monitor, ShieldCheck } from "lucide-react";
import type { SagImportResult, SagSnapshot } from "@/modules/grupamento/sag";
import {
  CCO_SCREEN_CATALOG,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
  type CcoScreenId,
} from "@/modules/grupamento/monitor";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function load<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function GrupamentoMonitorClient({ monitorId }: { monitorId: number }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setSag(load<SagImportResult>(GROUP_STORAGE_KEYS.sag));
    const stored = load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
    const selected = stored?.find((item) => item.id === monitorId);
    if (selected) setMonitor(selected);

    const onStorage = () => {
      setSag(load<SagImportResult>(GROUP_STORAGE_KEYS.sag));
      const refreshed = load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors)?.find((item) => item.id === monitorId);
      if (refreshed) setMonitor(refreshed);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setScreenIndex(0);
    if (monitor.mode !== "loop" || monitor.screens.length <= 1) return;
    const timer = window.setInterval(
      () => setScreenIndex((current) => (current + 1) % monitor.screens.length),
      Math.max(5, monitor.delaySeconds) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [monitor.mode, monitor.screens, monitor.delaySeconds]);

  const activeScreen = monitor.screens[Math.min(screenIndex, monitor.screens.length - 1)] ?? "overview";
  const screenLabel = CCO_SCREEN_CATALOG.find((item) => item.id === activeScreen)?.label ?? "Visão executiva";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex min-h-20 items-center justify-between gap-5 border-b border-white/10 bg-slate-950/90 px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10"><Monitor className="h-6 w-6 text-sky-300" /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">MCL · Escalão / Grupamento Logístico</div>
            <div className="mt-1 text-xl font-black">{monitor.label} · {screenLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <div className="text-lg font-mono font-bold">{now.toLocaleTimeString("pt-BR")}</div>
            <div className="text-xs text-slate-400">{now.toLocaleDateString("pt-BR")}</div>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${monitor.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
            {monitor.enabled ? "Saída ativa" : "Saída desativada"}
          </div>
        </div>
      </header>

      <section className="p-8">
        {!monitor.enabled ? (
          <Empty title="Monitor desativado" description="Ative esta saída na matriz do CCO para voltar a exibir conteúdo." />
        ) : !sag ? (
          <Empty title="Nenhuma carga SAG ativa" description="Esta tela não usa números sintéticos. Carregue um export SAG no cockpit do Grupamento." />
        ) : (
          <ScreenContent screen={activeScreen} sag={sag} />
        )}
      </section>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-slate-950/95 px-8 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> {sag ? `Fonte: ${sag.source.fileName}` : "Fonte: sem carga"}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> cálculo determinístico</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{monitor.mode === "loop" ? `loop · ${monitor.delaySeconds}s` : "tela fixa"}</span>
          <span>{screenIndex + 1}/{monitor.screens.length}</span>
        </div>
      </footer>
    </main>
  );
}

function ScreenContent({ screen, sag }: { screen: CcoScreenId; sag: SagImportResult }) {
  if (screen === "execution") return <Execution snapshot={sag.totals} />;
  if (screen === "pis") return <PiTable sag={sag} />;
  if (screen === "units") return <UnitTable sag={sag} />;
  if (screen === "provenance") return <Provenance sag={sag} />;
  return <Overview sag={sag} />;
}

function Overview({ sag }: { sag: SagImportResult }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Situação orçamentária</div>
        <h1 className="mt-3 text-5xl font-black tracking-tight">{percent(sag.totals.committedPercent)} empenhado</h1>
        <p className="mt-3 text-lg text-slate-400">{percent(sag.totals.liquidatedPercent)} liquidado · {sag.rows.length} registros financeiros válidos</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <BigMetric label="Total" value={currency(sag.totals.total)} />
          <BigMetric label="Disponível" value={currency(sag.totals.available)} />
          <BigMetric label="A liquidar" value={currency(sag.totals.toLiquidate)} />
          <BigMetric label="Pago" value={currency(sag.totals.paid)} />
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Maior volume por PI</div>
        <div className="mt-5 space-y-4">
          {sag.byPi.slice(0, 7).map((item) => (
            <div key={item.pi} className="border-b border-white/10 pb-3 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><div className="font-mono text-xs text-sky-300">{item.pi}</div><div className="mt-1 truncate text-sm font-semibold">{item.piName || "PI sem descrição"}</div></div>
                <div className="text-right"><div className="text-lg font-black">{percent(item.snapshot.committedPercent)}</div><div className="text-xs text-slate-500">empenhado</div></div>
              </div>
            </div>
          ))}
          {!sag.byPi.length ? <p className="text-sm text-slate-500">A carga não contém detalhamento por PI.</p> : null}
        </div>
      </div>
    </div>
  );
}

function Execution({ snapshot }: { snapshot: SagSnapshot }) {
  const items = [
    ["Disponível", snapshot.available],
    ["A liquidar", snapshot.toLiquidate],
    ["Em liquidação", snapshot.inLiquidation],
    ["Liquidado", snapshot.liquidated],
    ["Pago", snapshot.paid],
  ] as const;
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        <BigMetric label="Execução empenhada" value={percent(snapshot.committedPercent)} />
        <BigMetric label="Execução liquidada" value={percent(snapshot.liquidatedPercent)} />
        <BigMetric label="Total da carga" value={currency(snapshot.total)} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        {items.map(([label, value]) => <BigMetric key={label} label={label} value={currency(value)} compact />)}
      </div>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        Fórmula auditável: total = disponível + a liquidar + em liquidação + liquidado + pago; empenhado = total − disponível; execução liquidada = (liquidado + pago) ÷ total.
      </div>
    </div>
  );
}

function PiTable({ sag }: { sag: SagImportResult }) {
  return <DataTable title="Planos Internos" columns={["PI", "Descrição", "Total", "% Emp.", "% Liq."]} rows={sag.byPi.slice(0, 12).map((item) => [item.pi, item.piName || "—", currency(item.snapshot.total), percent(item.snapshot.committedPercent), percent(item.snapshot.liquidatedPercent)])} empty="A carga não contém PI." />;
}

function UnitTable({ sag }: { sag: SagImportResult }) {
  return <DataTable title="Organizações / UG" columns={["UG", "Sigla", "Total", "% Emp.", "% Liq."]} rows={sag.byUg.slice(0, 12).map((item) => [item.ug, item.acronym || "—", currency(item.snapshot.total), percent(item.snapshot.committedPercent), percent(item.snapshot.liquidatedPercent)])} empty="A carga não contém UG." />;
}

function Provenance({ sag }: { sag: SagImportResult }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Proveniência e confiança</div>
      <h1 className="mt-3 text-4xl font-black">Carga SAG manual rastreável</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <BigMetric label="Arquivo de origem" value={sag.source.fileName} compact />
        <BigMetric label="Última atualização" value={new Date(sag.source.importedAt).toLocaleString("pt-BR")} compact />
        <BigMetric label="Natureza" value="DADO IMPORTADO" compact />
        <BigMetric label="Persistência do bruto" value="NÃO" compact />
        <BigMetric label="Abas reconhecidas" value={String(sag.sheets.length)} compact />
        <BigMetric label="Linhas válidas" value={String(sag.rows.length)} compact />
      </div>
      {sag.warnings.length ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-200">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Alertas da carga</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{sag.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

function BigMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div><div className={`${compact ? "text-xl" : "text-3xl"} mt-2 break-words font-black tracking-tight`}>{value}</div></div>;
}

function DataTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: string[][]; empty: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">{title}</div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full table-fixed text-left">
          <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-slate-400"><tr>{columns.map((column) => <th key={column} className="px-4 py-4">{column}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10 text-sm">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="bg-white/[0.02]">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="truncate px-4 py-4 font-medium" title={cell}>{cell}</td>)}</tr>)}</tbody>
        </table>
        {!rows.length ? <div className="p-8 text-center text-sm text-slate-500">{empty}</div> : null}
      </div>
    </div>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-lg text-center"><Clock3 className="mx-auto h-10 w-10 text-slate-600" /><h1 className="mt-4 text-3xl font-black">{title}</h1><p className="mt-3 leading-6 text-slate-400">{description}</p></div></div>;
}
