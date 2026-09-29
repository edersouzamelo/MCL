"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function BriefingExportButton({ ready, beforeExport }: { ready: boolean; beforeExport: () => Promise<void> }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  async function exportBriefing() {
    setRunning(true); setError("");
    try {
      await beforeExport();
      const response = await fetch("/api/grupamento/briefing-export", { method: "POST", cache: "no-store" });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error ?? "Falha ao exportar o briefing."); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "Briefing-Logistico.pptx";
      anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao exportar o briefing."); }
    finally { setRunning(false); }
  }
  return <div className="flex flex-col items-end gap-2">
    <button type="button" disabled={!ready || running} onClick={() => void exportBriefing()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {running ? "Gerando PowerPoint…" : "Exportar Briefing Logístico atual"}
    </button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
