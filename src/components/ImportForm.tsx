"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function ImportForm() {
  const [format, setFormat] = useState("csv");
  const [content, setContent] = useState("persistentCode,quantity,sourceSystem\nMCL-IMP-001,10,SIM-IMPORT");
  const [result, setResult] = useState("");

  async function submit() {
    setResult("");
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    setResult(JSON.stringify(body, null, 2));
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-800">
        Formato
        <select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Conteudo
        <textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-1 min-h-48 w-full rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 font-mono text-sm" />
      </label>
      <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800">
        <Upload aria-hidden className="h-4 w-4" />
        Validar importacao
      </button>
      {result ? <pre className="overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-50">{result}</pre> : null}
    </div>
  );
}
