"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard, Square } from "lucide-react";

export function ScannerClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [manualCode, setManualCode] = useState("MCL:UL:ul-coturno-caixa-001");
  const [status, setStatus] = useState("Aguardando leitura.");
  const [error, setError] = useState("");

  async function resolve(code: string) {
    setError("");
    const response = await fetch("/api/qr/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json()) as { token?: string; error?: string };
    if (!response.ok || !body.token) {
      setError(body.error ?? "Codigo nao reconhecido.");
      return;
    }
    router.push(`/unidades/${body.token}`);
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera indisponivel neste navegador. Use a entrada manual.");
      return;
    }

    try {
      if (!videoRef.current) {
        setError("Elemento de video indisponivel. Use a entrada manual.");
        return;
      }
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      const backCamera =
        videoDevices.find((device) => /back|rear|environment|traseira/i.test(device.label)) ?? videoDevices.at(-1);
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(backCamera?.deviceId, videoRef.current, (result) => {
        if (result) {
          controlsRef.current?.stop();
          setStatus("Codigo lido. Resolvendo no servidor...");
          void resolve(result.getText());
        }
      });
      controlsRef.current = controls;
      setStatus("Camera ativa. Aponte para a etiqueta MCL.");
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "Permissao negada ou camera indisponivel.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("Camera pausada.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded border border-zinc-200 bg-zinc-950 p-3">
        <video ref={videoRef} className="aspect-video w-full rounded bg-zinc-900 object-cover" muted playsInline />
      </div>
      <div className="space-y-3 rounded border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">{status}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startCamera} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800">
            <Camera aria-hidden className="h-4 w-4" />
            Ativar camera
          </button>
          <button type="button" onClick={stopCamera} className="inline-flex items-center gap-2 rounded border border-zinc-300 px-3 py-2 font-semibold text-zinc-800 hover:bg-zinc-100">
            <Square aria-hidden className="h-4 w-4" />
            Parar
          </button>
        </div>
        <label className="block text-sm font-medium text-zinc-800">
          Entrada manual
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
        </label>
        <button type="button" onClick={() => resolve(manualCode)} className="inline-flex items-center gap-2 rounded bg-zinc-900 px-3 py-2 font-semibold text-white hover:bg-zinc-700">
          <Keyboard aria-hidden className="h-4 w-4" />
          Resolver codigo
        </button>
        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
