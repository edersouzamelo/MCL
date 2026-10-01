"use client";
import { useState } from "react";
import type { CompilerDiagnostic, Archetype } from "@/modules/grupamento/monitor-content/compiler/contracts";

/** Scoped admin actions are enforced server-side. Diagnostic payloads are never
 * exposed on anonymous monitor/device routes beyond their existing scene data. */
export function MonitorCompilerDiagnostics({ importId, sceneId, diagnostic, onReview }: { importId: string; sceneId: string; diagnostic?: CompilerDiagnostic; onReview?: () => void }) {
  const [open, setOpen] = useState(false), [message, setMessage] = useState("");
  const [archetype, setArchetype] = useState<Archetype | "">("");
  if (!diagnostic) return null;
  async function review(outcome: "CORRECT" | "NEEDS_CORRECTION") {
    const response = await fetch(`/api/grupamento/monitor-content/${importId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sceneId, outcome, archetype: archetype || undefined }) });
    const value = await response.json(); setMessage(response.ok ? "Revisão registrada." : value.error ?? "Falha na revisão.");
    if (response.ok) onReview?.();
  }
  return <div className="mt-3 rounded-lg border border-zinc-300 p-3 text-xs dark:border-zinc-700">
    <button type="button" onClick={() => setOpen(!open)} className="font-bold">{open ? "Fechar diagnóstico" : "Diagnóstico e revisão"}</button>
    {open && <div className="mt-3 space-y-3">
      <p>{diagnostic.interpretedContent.archetype} · {diagnostic.strategy} · Preflight {diagnostic.preflight.status} · Score heurístico {diagnostic.interpretedContent.confidence.toFixed(2)}</p>
      <p>{diagnostic.parsedInput.nodes.length} objetos · {diagnostic.interpretedContent.atomicBlocks.length} blocos atômicos · {diagnostic.llm.calls} chamadas semânticas · Cache {diagnostic.llm.cache}</p>
      {diagnostic.fallbackReason && <p>Preservação nativa: {diagnostic.fallbackReason}</p>}
      <ul className="space-y-1">{diagnostic.preflight.issues.map((issue, i) => <li key={i}>{issue.code}: {issue.message}</li>)}</ul>
      {diagnostic.nativeReference?.assetId && <a href={"/api/grupamento/monitor-content/assets/" + diagnostic.nativeReference.assetId} target="_blank" rel="noreferrer" className="block underline">Ver referência visual original</a>}
      <div className="flex flex-wrap gap-2">
        <select value={archetype || diagnostic.interpretedContent.archetype} onChange={event => setArchetype(event.target.value as Archetype)} aria-label="Classificação revisada" className="rounded border bg-white px-2 py-1 text-black">{["COVER", "CHART_CENTRIC", "TABLE_CENTRIC", "DOCUMENT_LIKE", "IMAGE_FULLFRAME", "TEXT_CENTRIC", "MIXED", "UNKNOWN"].map(value => <option key={value}>{value}</option>)}</select>
        <button type="button" disabled={diagnostic.preflight.status === "BLOCKED"} onClick={() => void review("CORRECT")} className="rounded border px-2 py-1 disabled:opacity-40">Confirmar fidelidade</button>
        <button type="button" onClick={() => void review("NEEDS_CORRECTION")} className="rounded border px-2 py-1">Registrar correção necessária</button>
      </div>
      {message && <p>{message}</p>}
      <details><summary className="cursor-pointer">Scene Graph, relações e transformações</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(diagnostic, null, 2)}</pre></details>
      <a href={`/api/grupamento/monitor-content/${importId}/diagnostics`} target="_blank" rel="noreferrer" className="block underline">Histórico e métricas da importação</a>
    </div>}
  </div>;
}
