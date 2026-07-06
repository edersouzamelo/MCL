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
      setError(body.error ?? "Código não reconhecido.");
      return;
    }
    router.push(`/unidades/${body.token}`);
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Câmera indisponível neste navegador. Use a entrada manual.");
      return;
    }

    try {
      if (!videoRef.current) {
        setError("Elemento de vídeo indisponível. Use a entrada manual.");
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
          setStatus("Código lido. Resolvendo no servidor...");
          void resolve(result.getText());
        }
      });
      controlsRef.current = controls;
      setStatus("Câmera ativa. Aponte para a etiqueta MCL.");
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "Permissão negada ou câmera indisponível.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("Câmera pausada.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-3 shadow-md">
        <video ref={videoRef} className="aspect-video w-full rounded-lg bg-zinc-900 object-cover" muted playsInline />
      </div>
      <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-900/60 p-5 shadow-md">
        <p className="text-sm text-zinc-650 dark:text-zinc-300 font-medium">{status}</p>
        <div className="flex flex-wrap gap-2">
          <button 
            type="button" 
            onClick={startCamera} 
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 dark:bg-emerald-600 hover:bg-emerald-800 dark:hover:bg-emerald-700 px-3.5 py-2 font-semibold text-white transition-all shadow-sm hover:shadow"
          >
            <Camera aria-hidden className="h-4 w-4" />
            Ativar câmera
          </button>
          <button 
            type="button" 
            onClick={stopCamera} 
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 font-semibold text-zinc-750 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Square aria-hidden className="h-4 w-4" />
            Parar
          </button>
        </div>
        <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Entrada manual
          <input 
            value={manualCode} 
            onChange={(event) => setManualCode(event.target.value)} 
            className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-150 px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200" 
          />
        </label>
        <button 
          type="button" 
          onClick={() => resolve(manualCode)} 
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border dark:border-zinc-700 px-3.5 py-2 font-semibold text-white transition-all shadow-sm hover:shadow"
        >
          <Keyboard aria-hidden className="h-4 w-4" />
          Resolver código
        </button>
        {error ? <p className="text-sm font-semibold text-rose-650 dark:text-rose-400 mt-2">{error}</p> : null}
      </div>
    </div>
  );
}
