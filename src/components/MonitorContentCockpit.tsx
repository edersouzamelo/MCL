/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, Download, FileText, Loader2, Presentation, Upload } from "lucide-react";

type ScenePreview = {
  id: string;
  sceneOrder: number;
  sceneType: string;
  title: string;
  sourcePage: number | null;
  payload?: {
    layoutVersion?: number;
    bullets?: string[];
    rows?: string[][];
    columns?: string[];
    series?: Array<{ name: string; categories: string[]; values: number[] }>;
    assetIds?: string[];
    note?: string;
  };
};

type ImportRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  status: "PREVIEW" | "APPROVED" | "ARCHIVED";
  sceneCount: number;
  warnings: string[];
  importedAt: string;
  approvedAt: string | null;
  scenes: ScenePreview[];
};

const CHUNK_BYTES = 2.5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MonitorContentCockpit({ monitorId }: { monitorId: number }) {
  const [open, setOpen] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/grupamento/monitor-content?monitorId=${monitorId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setImports(payload.imports ?? []);
  }, [monitorId]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => { void refresh(); });
    return () => window.cancelAnimationFrame(frame);
  }, [open, refresh]);

  async function upload(file: File) {
    setError("");
    setNotice("");
    const extension = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["pdf", "pptx", "docx"].includes(extension)) {
      setError("Use PDF, PPTX ou DOCX. Arquivos .ppt/.doc antigos devem ser salvos no formato atual.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("O arquivo excede 25 MB. Reduza imagens ou exporte uma versão operacional antes de importar.");
      return;
    }

    setBusy(true);
    const uploadId = crypto.randomUUID();
    const chunkCount = Math.ceil(file.size / CHUNK_BYTES);
    try {
      for (let index = 0; index < chunkCount; index += 1) {
        setProgress(`Enviando ${index + 1}/${chunkCount}…`);
        const start = index * CHUNK_BYTES;
        const end = Math.min(file.size, start + CHUNK_BYTES);
        const form = new FormData();
        form.set("uploadId", uploadId);
        form.set("monitorId", String(monitorId));
        form.set("chunkIndex", String(index));
        form.set("chunkCount", String(chunkCount));
        form.set("fileName", file.name);
        form.set("mimeType", file.type || "application/octet-stream");
        form.set("totalSize", String(file.size));
        form.set("chunk", file.slice(start, end), `chunk-${index}.bin`);
        const response = await fetch("/api/grupamento/monitor-content/chunk", { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Falha no envio do documento.");
      }

      setProgress("Extraindo dados, tabelas e figuras…");
      const finalize = await fetch("/api/grupamento/monitor-content/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
      const payload = await finalize.json();
      if (!finalize.ok) throw new Error(payload.error ?? "Falha ao estruturar o documento.");
      setNotice(`${payload.import.sceneCount} cena(s) gerada(s). Revise a prévia estrutural e aprove antes de publicar.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na importação documental.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function reprocess(importId: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/grupamento/monitor-content/" + importId + "/reprocess", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao reprocessar a fonte.");
      setNotice("Fonte reprocessada com reconstrução espacial. Revise a nova prévia antes de recolocar no ar.");
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao reprocessar a fonte.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(importId: string, status: "APPROVED" | "ARCHIVED") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/grupamento/monitor-content/${importId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao atualizar publicação.");
      setNotice(status === "APPROVED" ? "Conteúdo aprovado e inserido no loop do monitor." : "Conteúdo retirado do loop.");
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar publicação.");
    } finally {
      setBusy(false);
    }
  }

  const preview = imports.find((item) => item.status === "PREVIEW");

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
        <Presentation className="h-4 w-4" /> Conteúdo documental {imports.some((item) => item.status === "APPROVED") ? "· publicado" : ""}
      </button>

      {open ? (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black">Cockpit de apresentação</div>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-500">PDF, PowerPoint (.pptx) ou Word (.docx). O MCL preserva o original, extrai cenas e só coloca o conteúdo na TV depois da sua aprovação.</p>
            </div>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950 ${busy ? "pointer-events-none opacity-50" : ""}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? (progress || "Processando…") : "Importar documento"}
              <input type="file" className="sr-only" accept=".pdf,.pptx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
            </label>
          </div>

          {error ? <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
          {notice ? <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div> : null}

          {preview ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Aguardando aprovação humana</div>
                  <div className="mt-1 text-sm font-bold">{preview.fileName}</div>
                  <div className="text-[11px] text-zinc-500">{size(preview.fileSize)} · {preview.sceneCount} cena(s)</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/grupamento/monitor-content/${preview.id}/source`} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-[10px] font-bold dark:border-zinc-700 dark:bg-zinc-950"><Download className="h-3.5 w-3.5" /> Original</a>
                  <button type="button" disabled={busy} onClick={() => void setStatus(preview.id, "APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovar para exibição</button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {preview.scenes.slice(0, 8).map((scene) => {
                  const assetId = scene.payload?.assetIds?.[0];
                  const excerpt = scene.sceneType === "TEXT"
                    ? scene.payload?.bullets?.slice(0, 2).join(" · ")
                    : scene.sceneType === "TABLE"
                      ? scene.payload?.rows?.slice(0, 2).flat().join(" · ")
                      : scene.sceneType === "CHART"
                        ? scene.payload?.series?.map((series) => `${series.name}: ${series.values.slice(0, 3).join(", ")}`).join(" · ")
                        : "Figura extraída do documento original";
                  return (
                    <div key={scene.id} className="rounded-lg border border-amber-200 bg-white/80 p-2.5 dark:border-amber-900/40 dark:bg-zinc-950">
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500"><FileText className="h-3 w-3" /> {scene.sceneType}{scene.sourcePage ? ` · ${scene.sourcePage}` : ""}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] font-semibold">{scene.title}</div>
                      {excerpt ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">{excerpt}</div> : null}
                      {assetId ? <img src={`/api/grupamento/monitor-content/assets/${assetId}`} alt="" className="mt-2 h-16 w-full rounded-md bg-zinc-100 object-contain dark:bg-zinc-900" /> : null}
                    </div>
                  );
                })}
              </div>
              {preview.sceneCount > 8 ? <div className="mt-2 text-[10px] text-zinc-500">+ {preview.sceneCount - 8} cena(s) adicionais.</div> : null}
              {preview.warnings?.length ? <div className="mt-3 text-[10px] leading-4 text-amber-800 dark:text-amber-300">Lacunas declaradas: {preview.warnings.slice(0, 3).join(" · ")}</div> : null}
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {imports.filter((item) => item.status === "APPROVED").map((item) => {
              const legacy = item.scenes.some((scene) => scene.payload?.layoutVersion !== 2);
              return (
                <div key={item.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-2.5 dark:bg-zinc-950 " + (legacy ? "border-amber-300 dark:border-amber-900/50" : "border-emerald-200 dark:border-emerald-900/40")}>
                  <div>
                    <div className={"text-[10px] font-black uppercase tracking-wider " + (legacy ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
                      {legacy ? "Fora do ar · reconstrução v1 rejeitada" : "Em exibição"}
                    </div>
                    <div className="text-[11px] font-semibold">{item.fileName} · {item.sceneCount} cena(s)</div>
                    {legacy ? <div className="mt-1 text-[10px] text-zinc-500">O original está preservado. Reprocesse para reconstruir posição, imagens e tipo de gráfico antes de aprovar novamente.</div> : null}
                  </div>
                  <div className="flex gap-2">
                    <a href={"/api/grupamento/monitor-content/" + item.id + "/source"} className="rounded-lg border border-zinc-300 p-2 dark:border-zinc-700" title="Baixar fonte"><Download className="h-3.5 w-3.5" /></a>
                    {legacy ? (
                      <button type="button" disabled={busy} onClick={() => void reprocess(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50"><Loader2 className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} /> Reprocessar layout</button>
                    ) : (
                      <>
                        <button type="button" disabled={busy} onClick={() => void reprocess(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-sky-300 px-2.5 py-2 text-[10px] font-bold text-sky-800 dark:border-sky-900 dark:text-sky-300">Reprocessar</button>
                        <button type="button" disabled={busy} onClick={() => void setStatus(item.id, "ARCHIVED")} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-[10px] font-bold dark:border-zinc-700"><Archive className="h-3.5 w-3.5" /> Retirar</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!imports.length ? <div className="py-3 text-center text-[11px] text-zinc-500">Nenhum documento importado para este monitor.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
