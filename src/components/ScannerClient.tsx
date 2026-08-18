"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Keyboard, QrCode, ScanLine, ShieldCheck, Square } from "lucide-react";

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
    <div className="scanner-workspace">
      <section className="scanner-camera-card" aria-label="Leitor de QR Code">
        <header>
          <div><ScanLine aria-hidden /><span>Leitura óptica</span></div>
          <strong><i /> {status}</strong>
        </header>

        <div className="scanner-viewport">
          <video ref={videoRef} muted playsInline />
          <div className="scanner-reticle" aria-hidden="true">
            <i /><i /><i /><i />
            <span />
            <QrCode />
          </div>
          <div className="scanner-camera-hint">
            <Camera aria-hidden />
            <span>Posicione a etiqueta no centro do quadro</span>
          </div>
        </div>

        <footer>
          <span><ShieldCheck aria-hidden /> O identificador não contém dados sensíveis</span>
          <b>LEITOR MCL · V0.9</b>
        </footer>
      </section>

      <aside className="scanner-control-card">
        <section className="scanner-control-section">
          <div className="scanner-section-title"><span>01</span><div><strong>Câmera</strong><small>Leitura automática da etiqueta</small></div></div>
          <div className="scanner-camera-actions">
            <button type="button" className="primary" onClick={startCamera}>
              <Camera aria-hidden />
              Ativar câmera
            </button>
            <button type="button" onClick={stopCamera}>
              <Square aria-hidden />
              Parar
            </button>
          </div>
        </section>

        <div className="scanner-or"><span>ou</span></div>

        <section className="scanner-control-section">
          <div className="scanner-section-title"><span>02</span><div><strong>Entrada manual</strong><small>Fallback para leitura indisponível</small></div></div>
          <label htmlFor="scanner-manual-code">Identificador da unidade</label>
          <div className="scanner-manual-field">
            <Keyboard aria-hidden />
            <input id="scanner-manual-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} />
          </div>
          <button type="button" className="scanner-resolve" onClick={() => resolve(manualCode)}>
            <span>Resolver código</span>
            <ArrowRight aria-hidden />
          </button>
        </section>

        {error ? <p className="scanner-error" role="alert">{error}</p> : null}

        <footer className="scanner-control-footer">
          <span>Próxima etapa</span>
          <strong>Passaporte da unidade logística</strong>
          <small>Estado, lote, origem e trajetória auditável.</small>
        </footer>
      </aside>
    </div>
  );
}
