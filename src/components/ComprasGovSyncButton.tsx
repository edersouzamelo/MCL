"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SyncResult = {
  run?: {
    status: string;
    recordsRead: number;
    acceptedRecords: number;
    updatedRecords: number;
    duplicateRecords: number;
    rejectedRecords: number;
    quarantinedRecords: number;
    durationMs: number;
    message: string;
  };
  error?: string;
};

export function ComprasGovSyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function syncNow() {
    const confirmed = window.confirm("Executar exploracao tecnica do conector? O fluxo principal deve partir de uma necessidade com CATMAT confirmado.");
    if (!confirmed) {
      return;
    }

    setPending(true);
    setMessage("Sincronizando...");
    try {
      const response = await fetch("/api/connectors/compras-gov/sync", { method: "POST" });
      const result = (await response.json()) as SyncResult;
      if (!response.ok || result.error) {
        setMessage(result.error ?? "Falha na sincronizacao.");
        return;
      }
      const run = result.run;
      setMessage(
        run
          ? run.status === "SKIPPED"
            ? run.message
            : `${run.recordsRead} lidos, ${run.acceptedRecords} aceitos, ${run.updatedRecords} atualizados, ${run.duplicateRecords} duplicados, ${run.quarantinedRecords} em quarentena.`
          : "Sincronizacao concluida.",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={syncNow}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        <RefreshCw aria-hidden className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pending ? "Verificando" : "Exploracao tecnica"}
      </button>
      {message ? <p className="text-sm text-zinc-600" aria-live="polite">{message}</p> : null}
    </div>
  );
}
