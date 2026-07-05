"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";

type Option = {
  id: string;
  label: string;
};

type LinkResponse = {
  duplicate?: boolean;
  error?: string;
};

export function AcquisitionLinkForm({
  needs,
  instruments,
}: {
  needs: Option[];
  instruments: Option[];
}) {
  const router = useRouter();
  const [needId, setNeedId] = useState(needs[0]?.id ?? "");
  const [acquisitionInstrumentId, setAcquisitionInstrumentId] = useState(instruments[0]?.id ?? "");
  const [justification, setJustification] = useState("");
  const [confidence, setConfidence] = useState(0.6);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const disabled = pending || !needId || !acquisitionInstrumentId || justification.trim().length < 12;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("Registrando vinculo...");
    try {
      const response = await fetch("/api/aquisicoes/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ needId, acquisitionInstrumentId, justification, confidence }),
      });
      const result = (await response.json()) as LinkResponse;
      if (!response.ok || result.error) {
        setMessage(result.error ?? "Falha ao registrar vinculo.");
        return;
      }
      setMessage(result.duplicate ? "Vinculo ja existia." : "Vinculo manual registrado.");
      setJustification("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!instruments.length) {
    return <p className="text-sm text-zinc-600">Sincronize o Compras.gov.br para habilitar vinculos com instrumentos publicos.</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700">Necessidade</span>
        <select value={needId} onChange={(event) => setNeedId(event.target.value)} className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2">
          {needs.map((need) => (
            <option key={need.id} value={need.id}>{need.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700">Instrumento publico</span>
        <select
          value={acquisitionInstrumentId}
          onChange={(event) => setAcquisitionInstrumentId(event.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        >
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        <span className="font-medium text-zinc-700">Justificativa humana</span>
        <textarea
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          className="min-h-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          placeholder="Ex.: item publico parece aderente ao CATMAT e precisa de avaliacao humana antes de uso operacional."
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700">Confianca do vinculo: {Math.round(confidence * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={confidence}
          onChange={(event) => setConfidence(Number(event.target.value))}
        />
      </label>
      <div className="flex flex-col items-start justify-end gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          <Link2 aria-hidden className="h-4 w-4" />
          Vincular
        </button>
        {message ? <p className="text-sm text-zinc-600" aria-live="polite">{message}</p> : null}
      </div>
    </form>
  );
}
