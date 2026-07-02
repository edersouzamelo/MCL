"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import type { Location, LogisticsUnit } from "@/modules/domain/types";
import { allowedCaptureEvents } from "@/modules/events/service";

export function EventCaptureForm({
  unit,
  locations,
}: {
  unit: LogisticsUnit;
  locations: Location[];
}) {
  const router = useRouter();
  const [eventType, setEventType] = useState("MATERIAL_ARMAZENADO");
  const [quantity, setQuantity] = useState(unit.quantity);
  const [locationId, setLocationId] = useState(unit.currentLocationId);
  const [condition, setCondition] = useState(unit.condition);
  const [note, setNote] = useState("");
  const [criticalConfirmation, setCriticalConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const isCritical = ["DIVERGENCIA_REGISTRADA", "EVENTO_CORRIGIDO", "MATERIAL_ENTREGUE"].includes(eventType);

  async function submit() {
    setMessage("");
    setError("");
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        logisticsUnitId: unit.id,
        quantity,
        unit: unit.unit,
        locationId,
        condition,
        note,
        idempotencyKey:
          idempotencyKeyRef.current ?? (idempotencyKeyRef.current = `ui-${unit.id}-${crypto.randomUUID()}`),
        criticalConfirmation,
      }),
    });
    const body = (await response.json()) as { error?: string; projection?: { state: string }; duplicate?: boolean };

    if (!response.ok) {
      setError(body.error ?? "Falha ao registrar evento.");
      return;
    }

    setMessage(body.duplicate ? "Evento repetido reconhecido por idempotencia." : `Evento registrado. Novo estado: ${body.projection?.state}`);
    if (!body.duplicate) {
      idempotencyKeyRef.current = null;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-zinc-800">
          Evento
          <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2">
            {allowedCaptureEvents.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Quantidade
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Localizacao
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2">
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Condicao
          <input value={condition} onChange={(event) => setCondition(event.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-800">
        Observacao
        <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24 w-full rounded border border-zinc-300 px-3 py-2" />
      </label>
      {isCritical ? (
        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={criticalConfirmation} onChange={(event) => setCriticalConfirmation(event.target.checked)} className="mt-1" />
          Confirmo que este evento critico foi revisado e permanecera auditavel.
        </label>
      ) : null}
      <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800">
        <Save aria-hidden className="h-4 w-4" />
        Registrar evento
      </button>
      {message ? (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
