"use client";
import { useMemo, useState } from "react";
import type { TgSnapshot } from "@/modules/credits-tg/repository";

export function TgSourcePanel({ snapshot, onImported }: { snapshot: TgSnapshot | null; onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rows: number; ugs: string[]; warnings: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => (snapshot?.rows ?? []).filter(row => `${row.ug} ${row.pi ?? ""} ${row.ne ?? ""} ${row.nd ?? ""} ${row.supplier ?? ""}`.toLowerCase().includes(query.toLowerCase())), [snapshot, query]);
  const sourceUgs = useMemo(() => [...new Set((snapshot?.rows ?? []).map(row => row.ug))].sort(), [snapshot]);
  async function upload(confirm: boolean) {
    if (!file || busy) return;
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file); form.set("confirm", String(confirm));
      const response = await fetch("/api/creditos/importar", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Falha na importação.");
      if (body.preview) setPreview(body);
      else { setPreview(null); setMessage(`Relatório persistido: ${body.rowCount} registros.`); await onImported(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na importação."); }
    finally { setBusy(false); }
  }
  return <details className="credit-source-panel rounded-xl border border-sky-300 bg-white p-4 dark:bg-zinc-900">
    <summary className="cursor-pointer font-bold">Fonte e ingestão · relatório original do Tesouro Gerencial</summary>
    <p className="my-2 text-sm">Consulte os registros recebidos com a medida original. O relatório mestre, isoladamente, não identifica os saldos das dez visões abaixo.</p>
    <div className="my-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
      <p className="font-bold">Escopo definido automaticamente pela organização do usuário.</p>
      <p>Não é necessário informar ou vincular UASG nesta tela.{sourceUgs.length ? ` UG(s) presente(s) na fonte recebida: ${sourceUgs.join(", ")}.` : ""}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3 my-3">
      <input aria-label="Relatório mestre TG" type="file" accept=".xls,.xlsx" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(""); }} />
      <button disabled={!file || busy} onClick={() => void upload(false)} className="rounded bg-sky-700 px-3 py-2 text-white disabled:opacity-50">Validar arquivo TG</button>
      {preview && <button disabled={busy} onClick={() => void upload(true)} className="rounded bg-emerald-700 px-3 py-2 text-white">Confirmar importação</button>}
    </div>
    {preview && <div className="text-sm"><p>{preview.rows} registros; UGs: {preview.ugs.join(", ")}</p><ul>{preview.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
    <p role="status" className="text-sm">{busy ? "Processando relatório…" : message}</p>
    {snapshot ? <>
      <p className="my-2 text-sm">Arquivo: {snapshot.fileName} · Importado em {new Date(snapshot.importedAt).toLocaleString("pt-BR")} · Referência contábil: não informada</p>
      <p className="text-xs break-all">SHA-256: {snapshot.checksum}</p>
      <ul className="my-3 text-sm text-amber-800 dark:text-amber-300">{snapshot.warnings.map(w => <li key={w}>{w}</li>)}</ul>
      <input aria-label="Filtrar relatório TG" placeholder="Buscar UG, PI, NE, ND ou favorecido" className="my-2 w-full rounded border p-2 dark:bg-zinc-950" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
      <div className="overflow-auto max-h-96"><table className="w-full text-xs text-left"><thead><tr>{["UG", "PI", "NE", "ND", "Favorecido", snapshot.metric, "Aba / linha"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.slice(page * 100, (page + 1) * 100).map(row => <tr key={row.id} className="border-t"><td className="p-2">{row.ug}</td><td>{row.pi ?? "Não se aplica / ausente"}</td><td>{row.ne ?? "Não se aplica / ausente"}</td><td>{row.nd ?? "Não se aplica / ausente"}</td><td>{row.supplier ?? "—"}</td><td className="text-right whitespace-nowrap">{(row.movementCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="p-2">{row.sheet} / {row.sourceRow}</td></tr>)}</tbody></table></div>
      <div className="flex items-center gap-4 mt-3 text-sm"><button disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><span>{rows.length} registros · página {page + 1}</span><button disabled={(page + 1) * 100 >= rows.length} onClick={() => setPage(page + 1)}>Próxima</button></div>
    </> : <p className="text-sm">Nenhum relatório TG consultável nesta organização.</p>}
  </details>;
}
