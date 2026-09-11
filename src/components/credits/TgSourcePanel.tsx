"use client";
import { useState } from "react";
import type { TgSnapshotMetadata } from "@/modules/credits-tg/repository";

export function TgSourcePanel({ snapshot, onImported }: { snapshot: TgSnapshotMetadata | null; onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rows: number; ugs: string[]; warnings: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
  return <details className="rounded-xl border border-sky-300 bg-white p-4 dark:bg-zinc-900" open>
    <summary className="cursor-pointer font-bold">Relatório original do Tesouro Gerencial</summary>
    <p className="my-2 text-sm">O arquivo original fica preservado para auditoria; a tela recebe somente projeções consolidadas para evitar transferir dezenas de milhares de linhas ao navegador.</p>
    <div className="my-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
      <p className="font-bold">Escopo definido automaticamente pela organização do usuário.</p>
      <p>Não é necessário informar ou vincular UASG nesta tela. A visão macro considera todas as UGs presentes no arquivo.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3 my-3">
      <input aria-label="Relatório mestre TG" type="file" accept=".xls,.xlsx" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(""); }} />
      <button disabled={!file || busy} onClick={() => void upload(false)} className="rounded bg-sky-700 px-3 py-2 text-white disabled:opacity-50">Validar arquivo TG</button>
      {preview && <button disabled={busy} onClick={() => void upload(true)} className="rounded bg-emerald-700 px-3 py-2 text-white">Confirmar importação</button>}
    </div>
    {preview && <div className="text-sm"><p>{preview.rows} registros; UGs: {preview.ugs.join(", ")}</p><ul>{preview.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
    <p role="status" className="text-sm">{busy ? "Processando relatório…" : message}</p>
    {snapshot ? <>
      <p className="my-2 text-sm">Arquivo: {snapshot.fileName} · {snapshot.rowCount.toLocaleString("pt-BR")} linhas · Importado em {new Date(snapshot.importedAt).toLocaleString("pt-BR")} · Referência contábil: não informada</p>
      <p className="text-xs break-all">SHA-256: {snapshot.checksum}</p>
      <ul className="my-3 text-sm text-amber-800 dark:text-amber-300">{snapshot.warnings.map(w => <li key={w}>{w}</li>)}</ul>
    </> : <p className="text-sm">Nenhum relatório TG consultável nesta organização.</p>}
  </details>;
}
