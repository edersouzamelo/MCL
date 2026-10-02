"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, FileText, Loader2, Presentation, Trash2, Upload, X } from "lucide-react";
import { AnimatedMonitorSection } from "@/components/CcolMonitorCard";
import { MonitorContentSceneThumbnail } from "@/components/MonitorContentSceneThumbnail";
import { MonitorDocumentScene } from "@/components/MonitorDocumentScene";
import { MonitorCompilerDiagnostics } from "@/components/MonitorCompilerDiagnostics";
import { compilerBlocked } from "@/modules/grupamento/monitor-content/compiler/contracts";
import type { MonitorDocumentSceneDto, MonitorDocumentScenePayload } from "@/modules/grupamento/monitor-content/types";

type ScenePreview = {
  id: string;
  sceneOrder: number;
  sceneType: MonitorDocumentSceneDto["sceneType"];
  title: string;
  sourcePage: number | null;
  payload?: MonitorDocumentScenePayload;
};

type ImportRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  status: "PREVIEW" | "APPROVED" | "ARCHIVED" | "REJECTED";
  sceneCount: number;
  warnings: string[];
  importedAt: string;
  importedByName: string | null;
  approvedAt: string | null;
  scenes: ScenePreview[];
};

const CHUNK_BYTES = 2.5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MonitorContentCockpit({
  monitorId,
  expanded,
  currentUserName,
  requiresOperatorIdentification = false,
}: {
  monitorId: number;
  expanded?: boolean;
  currentUserName?: string;
  requiresOperatorIdentification?: boolean;
}) {
  const [internalOpen, setOpen] = useState(false);
  const open = expanded ?? internalOpen;
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/grupamento/monitor-content?monitorId=${monitorId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao consultar os documentos.");
      setImports(payload.imports ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao consultar os documentos.");
    }
  }, [monitorId]);

  const reprocess = useCallback(async (importId: string, automatic = false) => {
    setBusy(true);
    setProgress(automatic ? "Validando automaticamente o original…" : "Reprocessando e validando o original…");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/grupamento/monitor-content/" + importId + "/reprocess", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao validar a fonte.");
      setNotice(automatic
        ? "Validação automática concluída. Revise a prévia e aprove para exibição."
        : "Original reprocessado e validado. Revise a nova prévia e clique em Aprovar para exibição.");
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Falha ao validar a fonte.";
      setError(automatic ? `Falha interna na validação automática: ${message} Não reenvie nem reprocesse o arquivo.` : message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [refresh]);

  const automaticRepairStarted = useRef(new Set<string>());

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => { void refresh(); });
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5 * 60_000);
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(poll); window.removeEventListener("focus", focus); };
  }, [open, refresh]);

  useEffect(() => {
    if (!open || busy) return;
    const candidate = imports.find((item) =>
      item.status === "PREVIEW" &&
      item.scenes.some((scene) => compilerBlocked(scene.payload ?? {}) &&
        scene.payload?.inputCompiler?.preflight.issues.some((issue) => issue.code === "NATIVE_UNAVAILABLE")),
    );
    if (!candidate || automaticRepairStarted.current.has(candidate.id)) return;
    const key = `mcl-native-auto-repair-v2:${candidate.id}`;
    if (window.sessionStorage.getItem(key) === "1") return;
    automaticRepairStarted.current.add(candidate.id);
    window.sessionStorage.setItem(key, "1");
    const timer = window.setTimeout(() => { void reprocess(candidate.id, true); }, 0);
    return () => window.clearTimeout(timer);
  }, [busy, imports, open, reprocess]);

  async function upload(file: File) {
    setError("");
    setNotice("");

    let operatorName = currentUserName?.trim() || "";
    if (requiresOperatorIdentification) {
      const informed = window.prompt("Identifique o responsável por este upload documental:", "");
      if (informed === null) return;
      operatorName = informed.trim();
      if (operatorName.length < 3) {
        setError("Informe o nome do responsável pelo upload documental.");
        return;
      }
    }
    const extension = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["pdf", "pptx", "docx", "txt"].includes(extension)) {
      setError("Use PDF, PPTX, DOCX ou TXT. Arquivos .ppt/.doc antigos devem ser salvos no formato atual.");
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
        body: JSON.stringify({ uploadId, operatorName }),
      });
      const payload = await finalize.json();
      if (!finalize.ok) throw new Error(payload.error ?? "Falha ao estruturar o documento.");
      const blocked = (payload.import.scenes ?? []).some((scene: ScenePreview) => compilerBlocked(scene.payload ?? {}));
      setNotice(blocked
        ? `${payload.import.sceneCount} cena(s) extraída(s). O MCL concluirá a validação automaticamente; não reenvie nem reprocesse o arquivo.`
        : `${payload.import.sceneCount} cena(s) gerada(s). Revise a prévia estrutural e aprove antes de publicar.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na importação documental.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function setStatus(importId: string, status: "APPROVED" | "ARCHIVED" | "REJECTED") {
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
      setNotice(status === "APPROVED" ? "Conteúdo aprovado e inserido no loop do monitor." : status === "REJECTED" ? "Arquivo rejeitado. Ele não será exibido." : "Conteúdo retirado do loop.");
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar publicação.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImport(importId: string, fileName: string) {
    if (!window.confirm(`Excluir definitivamente o arquivo “${fileName}” e suas cenas?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/grupamento/monitor-content/${importId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao excluir o arquivo.");
      setSelectedSceneId(null);
      setSelectedImportId(null);
      setNotice("Arquivo e cenas excluídos.");
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao excluir o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  const previews = imports.filter((item) => item.status === "PREVIEW");
  const preview = previews.find((item) => item.id === selectedImportId) ?? previews[0];
  const selectedScene = preview?.scenes.find((scene) => scene.id === selectedSceneId) ?? null;
  const selectedIndex = selectedScene && preview ? preview.scenes.findIndex((scene) => scene.id === selectedScene.id) : -1;

  function sceneDto(scene: ScenePreview): MonitorDocumentSceneDto {
    if (!preview) throw new Error("Prévia documental indisponível.");
    return {
      id: scene.id,
      importId: preview.id,
      monitorId,
      sceneOrder: scene.sceneOrder,
      sceneType: scene.sceneType,
      title: scene.title,
      payload: scene.payload ?? {},
      sourcePage: scene.sourcePage,
      sourceFileName: preview.fileName,
      sourceImportedAt: preview.importedAt,
      sourceImportedByName: preview.importedByName,
      approvedAt: null,
    };
  }

  function movePreview(direction: -1 | 1) {
    if (!preview?.scenes.length || selectedIndex < 0) return;
    const next = (selectedIndex + direction + preview.scenes.length) % preview.scenes.length;
    setSelectedSceneId(preview.scenes[next].id);
  }

  return (
    <div className={expanded === undefined ? "mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800" : ""}>
      {expanded === undefined ? <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
        <Presentation className="h-4 w-4" /> Conteúdo documental {imports.some((item) => item.status === "APPROVED") ? "· publicado" : ""}
      </button> : null}

      <AnimatedMonitorSection open={open}>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black">Cockpit de apresentação</div>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-500">PDF, PowerPoint (.pptx), Word (.docx) ou texto (.txt). O MCL preserva o original, extrai cenas e só coloca o conteúdo na TV depois da sua aprovação.</p>
            </div>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950 ${busy ? "pointer-events-none opacity-50" : ""}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? (progress || "Processando…") : "Importar documento"}
              <input type="file" className="sr-only" accept=".pdf,.pptx,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
            </label>
          </div>

          {error ? <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
          {notice ? <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div> : null}

          {previews.length > 1 ? <div className="mt-4 flex flex-wrap gap-2" aria-label="Arquivos aguardando avaliação">{previews.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedImportId(item.id); setSelectedSceneId(null); }} className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${preview?.id === item.id ? "border-amber-600 bg-amber-100 dark:bg-amber-950" : "border-zinc-300 dark:border-zinc-700"}`}>{item.fileName}</button>)}</div> : null}
          {preview?.scenes.some(scene => scene.payload?.correction?.preserveLayout) && <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950 dark:text-sky-200">PPT de correção reconhecido. Ao aprovar, o layout corrigido substitui a sequência deste monitor. Para voltar à sequência anterior, retire este arquivo da exposição.</p>}
          {preview ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Aguardando aprovação humana</div>
                  <div className="mt-1 text-sm font-bold">{preview.fileName}</div>
                  <div className="text-[11px] text-zinc-500">{size(preview.fileSize)} · {preview.sceneCount} cena(s) · input {new Date(preview.importedAt).toLocaleString("pt-BR")}{preview.importedByName ? ` · ${preview.importedByName}` : ""}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`/api/grupamento/monitor-content/${preview.id}/source`} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-[10px] font-bold dark:border-zinc-700 dark:bg-zinc-950"><Download className="h-3.5 w-3.5" /> Original</a>
                  <button type="button" title={preview.scenes.some(scene => compilerBlocked(scene.payload ?? {})) ? "A validação automática ainda está em andamento ou encontrou uma falha interna." : "Aprovar o conteúdo revisado para exibição no monitor"} disabled={busy || preview.scenes.some(scene => compilerBlocked(scene.payload ?? {}))} onClick={() => void setStatus(preview.id, "APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovar para exibição</button>
                  <button type="button" disabled={busy} onClick={() => void setStatus(preview.id, "REJECTED")} className="rounded-lg border border-amber-500 px-2.5 py-2 text-[10px] font-bold text-amber-800 disabled:opacity-50 dark:text-amber-300">Rejeitar</button>
                  <button type="button" disabled={busy} onClick={() => void deleteImport(preview.id, preview.fileName)} className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-2.5 py-2 text-[10px] font-bold text-red-700 disabled:opacity-50 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {preview.scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedSceneId(scene.id)}
                    className="group overflow-hidden rounded-xl border border-amber-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-amber-900/40 dark:bg-zinc-950"
                  >
                    <MonitorContentSceneThumbnail payload={scene.payload} title={scene.title} />
                    <div className="flex items-center justify-between gap-3 p-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500"><FileText className="h-3 w-3" /> Slide {scene.sourcePage ?? scene.sceneOrder + 1}</div>
                        <div className="mt-1 truncate text-[11px] font-bold" title={scene.title}>{scene.title}</div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-950 px-2 py-1.5 text-[9px] font-bold text-white dark:bg-white dark:text-zinc-950"><Eye className="h-3 w-3" /> Ver</span>
                    </div>
                  </button>
                ))}
              </div>
              {preview.warnings?.length ? <div className="mt-3 text-[10px] leading-4 text-amber-800 dark:text-amber-300">Lacunas declaradas: {preview.warnings.slice(0, 3).join(" · ")}</div> : null}
              {preview.scenes.some(scene => compilerBlocked(scene.payload ?? {})) && <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-300">Aprovação bloqueada enquanto o MCL conclui a validação automática. O operador não precisa reenviar nem reprocessar o arquivo; a sequência atual continua em exibição.</p>}
              {selectedScene && <MonitorCompilerDiagnostics importId={preview.id} sceneId={selectedScene.id} diagnostic={selectedScene.payload?.inputCompiler} onReview={() => void refresh()} />}
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {imports.filter((item) => item.status === "REJECTED").map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-950"><div><div className="text-[10px] font-black uppercase text-zinc-500">Rejeitado · fora do ar</div><div className="text-[11px] font-semibold">{item.fileName}</div></div><button type="button" disabled={busy} onClick={() => void deleteImport(item.id, item.fileName)} className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-2.5 py-2 text-[10px] font-bold text-red-700 disabled:opacity-50 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Excluir</button></div>)}
            {imports.filter((item) => item.status === "APPROVED").map((item) => {
              const chartLegacy = item.scenes.some((scene) => scene.payload?.layout?.elements.some((element) => element.kind === "chart" && element.chart.semanticVersion !== 5));
              const legacy = item.scenes.some((scene) => {
                const compiler = scene.payload?.inputCompiler;
                const nativeCurrent = compiler?.preflight.status === "PASS"
                  && ["NATIVE_FALLBACK", "NATIVE_IMAGE"].includes(compiler.strategy)
                  && Boolean(compiler.nativeReference?.assetId);
                return scene.payload?.layoutVersion !== 2 && !nativeCurrent;
              });
              return (
                <div key={item.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-2.5 dark:bg-zinc-950 " + (legacy ? "border-amber-300 dark:border-amber-900/50" : "border-emerald-200 dark:border-emerald-900/40")}>
                  <div>
                    <div className={"text-[10px] font-black uppercase tracking-wider " + (legacy ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
                      {legacy ? "Fora do ar · reconstrução v1 rejeitada" : "Em exibição"}
                    </div>
                    <div className="text-[11px] font-semibold">{item.fileName} · {item.sceneCount} cena(s)</div>
                    {chartLegacy && !legacy ? <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Gráfico com payload anterior: reprocessar e revisar a aprovação para recuperar rótulos internos, textos de células, grade e escala dos eixos. A versão atual continua em exibição.</div> : null}
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
      </AnimatedMonitorSection>

      {selectedScene && preview ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Prévia da cena documental">
          <div className="flex h-[92vh] w-[96vw] max-w-[1700px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-3 text-white">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">Prévia real antes da aprovação</div>
                <div className="mt-1 truncate text-sm font-bold">Slide {selectedScene.sourcePage ?? selectedScene.sceneOrder + 1} · {selectedScene.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => movePreview(-1)} className="rounded-lg border border-white/15 p-2 text-white hover:bg-white/10" title="Slide anterior"><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-14 text-center text-xs font-bold text-slate-400">{selectedIndex + 1}/{preview.scenes.length}</span>
                <button type="button" onClick={() => movePreview(1)} className="rounded-lg border border-white/15 p-2 text-white hover:bg-white/10" title="Próximo slide"><ChevronRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => setSelectedSceneId(null)} className="ml-2 rounded-lg border border-white/15 p-2 text-white hover:bg-white/10" title="Fechar prévia"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <MonitorDocumentScene scene={sceneDto(selectedScene)} ccol={false} />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 px-5 py-2.5 text-[10px] text-slate-400">
              <span>Esta é a mesma composição que será enviada ao loop do monitor.</span>
              <span>Fonte: {preview.fileName}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
