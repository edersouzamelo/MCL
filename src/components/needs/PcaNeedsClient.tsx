"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, Check, ChevronDown, Database, RefreshCw, Search } from "lucide-react";
import type { PcaItemView, PcaUnitOption } from "@/modules/pca/contracts";

type PcaPayload = {
  unit: { id: string; name: string; uasg: string | null; configured: boolean };
  userUnit: { id: string; name: string; uasg: string | null };
  units: PcaUnitOption[];
  year: number;
  items: PcaItemView[];
  lastSynchronizedAt: string | null;
  source: "PNCP";
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PcaNeedsClient() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [uasg, setUasg] = useState("");
  const [data, setData] = useState<PcaPayload | null>(null);
  const [query, setQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  async function load(selectedUasg = uasg, selectedYear = year) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ year: String(selectedYear) });
    if (selectedUasg) params.set("uasg", selectedUasg);
    try {
      const response = await fetch(`/api/necessidades/pca?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível consultar o PCA.");
      setData(payload);
      if (!selectedUasg && payload.unit.uasg) setUasg(payload.unit.uasg);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o PCA.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load("", year), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setUnitOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visibleUnits = useMemo(() => {
    const normalized = unitQuery.trim().toLocaleLowerCase("pt-BR");
    return (data?.units ?? []).filter((unit) => !normalized || `${unit.name} ${unit.uasg}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [data?.units, unitQuery]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return (data?.items ?? []).filter((item) => !normalized || `${item.description} ${item.catalogCode ?? ""} ${item.category ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [data?.items, query]);

  async function synchronize() {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/necessidades/pca", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uasg, year }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "A sincronização não foi concluída.");
      await load(uasg, year);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A sincronização não foi concluída.");
    } finally {
      setSyncing(false);
    }
  }

  const selectedUnit = data?.units.find((unit) => unit.uasg === uasg);

  return (
    <div className="space-y-5">
      <header className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <span className="mcl-page-kicker">PLANEJAMENTO DA DEMANDA</span>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">Necessidades</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Consulte o PCA da organização e registre demandas adicionais sem perder o vínculo com planejamento, estoque e atas.</p>
          </div>
          <button className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">Nova necessidade</button>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_150px_auto] lg:items-end">
          <div ref={pickerRef} className="relative">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Organização</label>
            <button onClick={() => setUnitOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 text-left text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-sky-600"/><span className="truncate">{selectedUnit?.name ?? data?.unit.name ?? "Unidade do usuário"}</span></span>
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500"/>
            </button>
            {unitOpen && (
              <div role="dialog" aria-label="Selecionar organização" className="absolute z-30 mt-2 w-full min-w-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 dark:bg-zinc-950"><Search className="h-4 w-4 text-zinc-500"/><input autoFocus value={unitQuery} onChange={(event) => setUnitQuery(event.target.value)} placeholder="Pesquisar OM ou UASG" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {visibleUnits.map((unit, index) => (
                    <div key={unit.uasg}>
                      {(index === 0 || visibleUnits[index - 1]?.reason !== unit.reason) && <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{unit.reason === "USER_ORGANIZATION" ? "Seu cadastro" : unit.reason === "SUBORDINATE" ? "Organizações subordinadas" : "Outras unidades"}</p>}
                      <button onClick={() => { setUasg(unit.uasg); setUnitOpen(false); void load(unit.uasg, year); }} className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sky-50 dark:hover:bg-sky-950/30">
                        <span><span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{unit.name}</span><span className="text-xs text-zinc-500">UASG {unit.uasg}</span></span>
                        {unit.uasg === uasg && <Check className="mt-1 h-4 w-4 text-sky-600"/>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">Exercício</label>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"><CalendarDays className="h-4 w-4 text-zinc-500"/><select value={year} onChange={(event) => { const next = Number(event.target.value); setYear(next); void load(uasg, next); }} className="w-full bg-transparent text-sm outline-none">{[year - 1, year, year + 1].map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
          </div>
          <button disabled={syncing || loading} onClick={synchronize} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-700 px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-400 dark:hover:bg-sky-950/30"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}/>{syncing ? "Sincronizando" : "Sincronizar PNCP"}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
          <span>Fonte oficial: PNCP</span>
          <span>{data?.lastSynchronizedAt ? `Atualizado em ${new Date(data.lastSynchronizedAt).toLocaleString("pt-BR")}` : "Ainda não sincronizado"}</span>
          {data && !data.unit.configured && <span className="font-semibold text-amber-700 dark:text-amber-400">UASG da organização pendente</span>}
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-zinc-950 dark:text-zinc-50">PCA da organização</h2><p className="text-xs text-zinc-500">{visibleItems.length} de {data?.items.length ?? 0} itens</p></div>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 dark:bg-zinc-950"><Search className="h-4 w-4 text-zinc-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar descrição ou CATMAT" className="h-10 w-full bg-transparent text-sm outline-none sm:w-72"/></div>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-500">Consultando o banco do PCA…</div>
        ) : visibleItems.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Código</th><th className="px-4 py-3 text-right">Quantidade</th><th className="px-4 py-3 text-right">Valor estimado</th><th className="px-4 py-3">Previsão</th></tr></thead><tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{visibleItems.map((item) => <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/40"><td className="px-4 py-3 text-zinc-500">{item.itemNumber ?? "—"}</td><td className="max-w-xl px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{item.description}</td><td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.catalogCode ?? "Não informado"}</td><td className="px-4 py-3 text-right">{item.estimatedQuantity ?? "—"} {item.unit}</td><td className="px-4 py-3 text-right">{item.estimatedTotalValue ? currency.format(Number(item.estimatedTotalValue)) : "—"}</td><td className="px-4 py-3">{item.expectedContractingDate ? new Date(item.expectedContractingDate).toLocaleDateString("pt-BR") : "—"}</td></tr>)}</tbody></table></div>
        ) : (
          <div className="flex flex-col items-center p-12 text-center"><Database className="h-9 w-9 text-zinc-400"/><h3 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">Nenhum item do PCA armazenado</h3><p className="mt-1 max-w-lg text-sm text-zinc-500">Sincronize esta UASG com o PNCP. Se a fonte não devolver registros, o MCL preservará a lacuna em vez de exibir dados demonstrativos como oficiais.</p></div>
        )}
      </section>
    </div>
  );
}
