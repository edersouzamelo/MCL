"use client";

import { useEffect, useState } from "react";

type Revision = { id: string; source: string; version: number; kind: string; observedAt: string; recordedAt: string;
  item: { itemNumber: number | null; description: string; catalogCode: string | null; active: boolean } };
type Payload = Record<string, unknown>;
const display = (value: unknown) => value == null ? "Não informado" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
const stamp = (value: string) => new Date(value).toLocaleString("pt-BR");

function VersionContent({ revision, params }: { revision: Revision; params: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/necessidades/pca?${params}&revisionId=${encodeURIComponent(revision.id)}`, { signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); if (!controller.signal.aborted) setPayload(result.revision.payload); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message ?? "Falha ao consultar versão."); });
    return () => controller.abort();
  }, [params, revision.id]);
  if (error) return <p role="alert">{error}</p>;
  if (!payload) return <p role="status">Carregando versão preservada…</p>;
  const fields = revision.source === "PNCP" ? [
    ["description", "Descrição preservada"], ["catalogCode", "Código do catálogo"], ["unit", "Unidade"],
    ["estimatedQuantity", "Quantidade"], ["estimatedUnitValue", "Valor unitário (R$)"], ["estimatedTotalValue", "Valor total (R$)"],
    ["pncpControlNumber", "Identificador do plano"], ["sourceUrl", "Referência da fonte"],
  ] : [];
  const records = Array.isArray(payload.records) ? payload.records as Payload[] : [];
  return <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
    {fields.length > 0 && <dl className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label]) => <div key={key}><dt className="text-xs text-zinc-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{display(payload[key])}</dd></div>)}</dl>}
    {revision.source === "PGC" && (records.length ? records.map((record, index) => <div key={index} className="space-y-1 text-sm"><strong>DFD {display(record.descricaoArtefato)}</strong><p>{display(record.descricaoObjetoDfd)}</p><p>{display(record.descricaoItemCatalogo)}</p><p>Quantidade: {display(record.quantidadeItem)} · Unidade: {display(record.nomeUnidadeFornecimento)}</p></div>) : <p className="text-sm">Nenhum vínculo seguro com DFD foi registrado nesta versão.</p>)}
    <details><summary className="cursor-pointer text-sm font-semibold text-sky-700 dark:text-sky-400">Conteúdo completo preservado</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-950">{JSON.stringify(payload, null, 2)}</pre></details>
  </div>;
}

export function PcaHistory({ itemId, uasg, year }: { itemId?: string; uasg?: string; year: number }) {
  const [selectedYear, setSelectedYear] = useState(year);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [source, setSource] = useState("");
  const [cursor, setCursor] = useState("");
  const [result, setResult] = useState<{ revisions: Revision[]; nextCursor: string | null; unitName: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const params = new URLSearchParams({ history: "1", year: String(itemId ? year : selectedYear), ...(itemId ? { itemId } : {}), ...(uasg ? { uasg } : {}), ...(source ? { source } : {}), ...(appliedQuery ? { q: appliedQuery } : {}), ...(cursor ? { cursor } : {}) }).toString();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/necessidades/pca?${params}`, { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (!controller.signal.aborted) { setResult(data); setError(""); setLoading(false); }
    }).catch(cause => { if (!controller.signal.aborted) { setError(cause.message ?? "Falha ao consultar histórico."); setLoading(false); } });
    return () => controller.abort();
  }, [params, refresh]);
  function reset() { setRefresh(value => value + 1); setCursor(""); setExpanded(null); setLoading(true); }
  return <section aria-label="Histórico preservado do PCA" className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
    <h3 className="font-bold">Histórico do PCA e dos DFDs</h3>
    {result?.unitName && <p className="mt-1 text-sm font-semibold">{result.unitName} · {itemId ? year : selectedYear}</p>}
    <p className="mt-1 text-xs text-zinc-500">Versões observadas pelo MCL. A base inicial preserva a cópia existente; alterações anteriores não podem ser reconstruídas. Consultas sem mudança de conteúdo não criam versões.</p>
    <form className="my-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); reset(); setAppliedQuery(query.trim()); }}>
      {!itemId && <><input aria-label="Pesquisar histórico" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} placeholder="Descrição, código ou número do item" className="min-w-64 rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"/><button className="rounded border px-3 py-2 text-sm">Pesquisar</button></>}
      {!itemId && <select aria-label="Exercício do histórico" value={selectedYear} onChange={event => { reset(); setSelectedYear(Number(event.target.value)); }} className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">{Array.from({length: year - 2021 + 3}, (_, i) => 2021 + i).map(value => <option key={value}>{value}</option>)}</select>}
      <select aria-label="Fonte do histórico" value={source} onChange={event => { reset(); setSource(event.target.value); }} className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"><option value="">PNCP e PGC</option><option value="PNCP">PCA · PNCP</option><option value="PGC">DFDs · PGC</option></select>
    </form>
    {error ? <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">{error}</p> : loading ? <p role="status">Consultando histórico…</p> : <div className="space-y-3">{result?.revisions.length ? result.revisions.map(revision => <article key={revision.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <button type="button" aria-expanded={expanded === revision.id} onClick={() => setExpanded(expanded === revision.id ? null : revision.id)} className="w-full text-left">
        <span className="block text-sm font-bold text-sky-800 dark:text-sky-300">{revision.source} · versão {revision.version} · {revision.kind === "BASELINE" ? "Base inicial" : "Conteúdo observado"} · item {revision.item.itemNumber ?? "sem número"}</span>
        {!itemId && <span className="mt-1 block line-clamp-2 text-sm">{revision.item.description}</span>}
        <span className="mt-1 block text-xs text-zinc-500">Consulta de origem: {stamp(revision.observedAt)} · Preservado em: {stamp(revision.recordedAt)}{!revision.item.active && " · Item fora do PCA atual"}</span>
        <span className="mt-1 block text-xs font-semibold">{expanded === revision.id ? "Recolher versão" : "Visualizar esta versão"}</span>
      </button>
      {expanded === revision.id && <VersionContent key={revision.id} revision={revision} params={params}/>}
    </article>) : <p className="text-sm">Nenhuma versão encontrada para este recorte.</p>}</div>}
    <div className="mt-3 flex gap-3 text-sm">{cursor && <button disabled={loading} onClick={reset} className="font-semibold text-sky-700 dark:text-sky-400">Voltar ao início</button>}{result?.nextCursor && !loading && !error && <button onClick={() => { setLoading(true); setExpanded(null); setCursor(result.nextCursor!); }} className="font-semibold text-sky-700 dark:text-sky-400">Próximas versões</button>}</div>
  </section>;
}
