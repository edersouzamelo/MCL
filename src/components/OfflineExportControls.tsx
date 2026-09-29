"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type ExportMode = "html" | "mp4" | "both";

type CapturedHtmlFrame = {
  html: string;
  label: string;
};

type CapturedVideoFrame = {
  dataUrl: string;
  label: string;
};

const WIDTH = 1920;
const HEIGHT = 1080;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao converter recurso."));
    reader.readAsDataURL(blob);
  });
}
function transparentPixelDataUrl() {
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
}

async function resourceToDataUrl(value: string, sourceWindow: Window) {
  if (!value) return transparentPixelDataUrl();
  if (value.startsWith("data:")) return value;
  try {
    const absolute = new URL(value, sourceWindow.location.href).toString();
    const response = await fetch(absolute, { credentials: "include", cache: "no-store" });
    if (!response.ok) return transparentPixelDataUrl();
    return await blobToDataUrl(await response.blob());
  } catch {
    return transparentPixelDataUrl();
  }
}

async function inlineCssUrls(value: string, sourceWindow: Window) {
  const matches = [...value.matchAll(/url\((['"]?)(.*?)\1\)/g)];
  if (!matches.length) return value;
  let next = value;
  for (const match of matches) {
    const original = match[0];
    const raw = match[2];
    const dataUrl = await resourceToDataUrl(raw, sourceWindow);
    next = next.replace(original, `url("${dataUrl}")`);
  }
  return next;
}

async function inlineComputedStyles(source: Element, clone: Element, sourceWindow: Window) {
  const sourceElement = source as HTMLElement;
  const cloneElement = clone as HTMLElement;
  const computed = sourceWindow.getComputedStyle(sourceElement);
  for (const property of Array.from(computed)) {
    try {
      const rawValue = computed.getPropertyValue(property);
      const value = rawValue.includes("url(") ? await inlineCssUrls(rawValue, sourceWindow) : rawValue;
      cloneElement.style.setProperty(property, value, computed.getPropertyPriority(property));
    } catch {
      // Algumas propriedades calculadas são somente leitura no clone. Elas podem ser ignoradas.
    }
  }

  if (sourceElement.tagName === "IMG" && cloneElement.tagName === "IMG") {
    const image = sourceElement as HTMLImageElement;
    const target = cloneElement as HTMLImageElement;
    const src = image.currentSrc || image.src;
    if (src) target.src = await resourceToDataUrl(src, sourceWindow);
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
  }
  if (sourceElement.tagName.toLowerCase() === "image" && cloneElement.tagName.toLowerCase() === "image") {
    const href = sourceElement.getAttribute("href") ?? sourceElement.getAttribute("xlink:href");
    if (href) {
      const dataUrl = await resourceToDataUrl(href, sourceWindow);
      cloneElement.setAttribute("href", dataUrl);
      cloneElement.setAttribute("xlink:href", dataUrl);
    }
  }

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (cloneChildren[index]) await inlineComputedStyles(sourceChildren[index], cloneChildren[index], sourceWindow);
  }
}

async function cloneCaptureRoot(root: HTMLElement, sourceWindow: Window) {
  const clone = root.cloneNode(true) as HTMLElement;
  await inlineComputedStyles(root, clone, sourceWindow);

  clone.style.width = `${WIDTH}px`;
  clone.style.height = `${HEIGHT}px`;
  clone.style.position = "relative";
  clone.style.inset = "auto";
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.overflow = "hidden";
  clone.removeAttribute("data-mcl-capture-root");
  clone.removeAttribute("data-mcl-capture-ready");
  clone.removeAttribute("data-mcl-playlist-count");
  clone.removeAttribute("data-mcl-frame-index");
  clone.removeAttribute("data-mcl-frame-label");
  return clone;
}

async function captureRootAsHtml(root: HTMLElement, sourceWindow: Window) {
  const clone = await cloneCaptureRoot(root, sourceWindow);
  return new XMLSerializer().serializeToString(clone);
}

async function captureRootAsJpeg(root: HTMLElement, sourceWindow: Window) {
  const clone = await cloneCaptureRoot(root, sourceWindow);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;margin:0;">${serialized}</div>
    </foreignObject>
  </svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível neste navegador.");
    context.drawImage(image, 0, 0, WIDTH, HEIGHT);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function waitForCaptureFrame(iframe: HTMLIFrameElement, frameIndex: number, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const root = iframe.contentDocument?.querySelector<HTMLElement>("[data-mcl-capture-root='1']");
    const ready = root?.dataset.mclCaptureReady === "1";
    const currentFrame = Number(root?.dataset.mclFrameIndex ?? "-1");
    if (root && ready && currentFrame === frameIndex) {
      await wait(500);
      return root;
    }
    await wait(150);
  }
  throw new Error(`Tempo esgotado aguardando o quadro ${frameIndex + 1}.`);
}

async function captureMonitorFrames(
  monitorId: number,
  onProgress: (message: string) => void,
  format: "html" | "video",
) {
  const iframe = document.createElement("iframe");
  iframe.width = String(WIDTH);
  iframe.height = String(HEIGHT);
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-20000px",
    top: "0",
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    border: "0",
    visibility: "visible",
    pointerEvents: "none",
    zIndex: "-1",
  });
  iframe.src = `/grupamento/monitor-capture/${monitorId}?export=${Date.now()}`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Tempo esgotado abrindo o monitor para exportação.")), 25_000);
      iframe.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });

    const firstRoot = await waitForCaptureFrame(iframe, 0);
    const frameCount = Number(firstRoot.dataset.mclPlaylistCount ?? "0");
    if (!Number.isInteger(frameCount) || frameCount < 1) {
      throw new Error("Este monitor não possui conteúdo ativo para exportar.");
    }

    const htmlFrames: CapturedHtmlFrame[] = [];
    const videoFrames: CapturedVideoFrame[] = [];
    for (let index = 0; index < frameCount; index += 1) {
      onProgress(`Capturando quadro ${index + 1}/${frameCount}...`);
      if (index > 0) {
        iframe.contentWindow?.postMessage({ type: "MCL_CAPTURE_FRAME", frameIndex: index }, window.location.origin);
      }
      const root = await waitForCaptureFrame(iframe, index);
      const label = root.dataset.mclFrameLabel ?? `Quadro ${index + 1}`;
      if (format === "html") {
        htmlFrames.push({
          html: await captureRootAsHtml(root, iframe.contentWindow!),
          label,
        });
      } else {
        videoFrames.push({
          dataUrl: await captureRootAsJpeg(root, iframe.contentWindow!),
          label,
        });
      }
    }
    return { htmlFrames, videoFrames };
  } finally {
    iframe.remove();
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function buildOfflineHtml(monitorId: number, frames: CapturedHtmlFrame[], delaySeconds: number) {
  const generatedAt = new Date().toISOString();
  const safeFrames = JSON.stringify(frames).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>MCL Monitor ${String(monitorId).padStart(2, "0")} Offline</title>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020617}
body{font-family:Arial,sans-serif}
#stage{position:fixed;inset:0;overflow:hidden;background:#020617}
#surface{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:center center;opacity:1;transition:opacity 320ms cubic-bezier(.22,1,.36,1);will-change:transform,opacity}
#surface>main{width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}
@keyframes mclMonitorBarReveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}
#surface .mcl-broadcast-bar{animation:mclMonitorBarReveal 1.2s cubic-bezier(.16,1,.3,1) both}
#controls{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:8px;z-index:12;padding:6px 8px;border:1px solid rgba(125,211,252,.18);border-radius:999px;background:rgba(2,6,23,.72);backdrop-filter:blur(8px)}
#controls button{width:38px;height:32px;border:0;border-radius:999px;background:rgba(255,255,255,.06);color:#dbeafe;font:700 14px Arial,sans-serif;cursor:pointer}
#controls button:hover{background:rgba(56,189,248,.14)}
#badge{position:fixed;right:10px;bottom:8px;padding:4px 7px;border-radius:5px;background:rgba(2,6,23,.68);color:rgba(255,255,255,.72);font:10px Arial,sans-serif;letter-spacing:.05em;z-index:10}
</style>
</head>
<body>
<div id="stage" aria-label="Exibição offline do MCL"><div id="surface"></div></div>
<div id="controls" aria-label="Controles da apresentação">
  <button id="prev" type="button" title="Quadro anterior">◀</button>
  <button id="toggle" type="button" title="Pausar apresentação">Ⅱ</button>
  <button id="nextBtn" type="button" title="Próximo quadro">▶</button>
</div>
<div id="badge">MCL OFFLINE · Monitor ${String(monitorId).padStart(2, "0")} · gerado ${generatedAt}</div>
<script>
const frames=${safeFrames};
const delay=${Math.max(5, delaySeconds) * 1000};
const stage=document.getElementById("stage");
const surface=document.getElementById("surface");
const prevButton=document.getElementById("prev");
const toggleButton=document.getElementById("toggle");
const nextButton=document.getElementById("nextBtn");
let index=0;
let playing=true;
let timer=null;
function fit(){
  const scale=Math.min(window.innerWidth/1920,window.innerHeight/1080);
  surface.style.transform="translate(-50%,-50%) scale("+scale+")";
}
function mount(frame){
  surface.innerHTML=frame.html;
  stage.setAttribute("aria-label",frame.label||"MCL");
}
function show(target){
  if(!frames.length)return;
  surface.style.opacity="0";
  setTimeout(()=>{
    index=(target+frames.length)%frames.length;
    mount(frames[index]);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{surface.style.opacity="1"}));
  },320);
}
function schedule(){
  if(timer)clearInterval(timer);
  if(playing&&frames.length>1)timer=setInterval(()=>show(index+1),delay);
}
prevButton.addEventListener("click",()=>{show(index-1);schedule()});
nextButton.addEventListener("click",()=>{show(index+1);schedule()});
toggleButton.addEventListener("click",()=>{
  playing=!playing;
  toggleButton.textContent=playing?"Ⅱ":"▶";
  toggleButton.title=playing?"Pausar apresentação":"Retomar apresentação";
  schedule();
});
mount(frames[0]);
fit();
window.addEventListener("resize",fit);
schedule();
</script>
</body>
</html>`;
}

function supportedMp4Mime() {
  if (typeof MediaRecorder === "undefined") return null;
  return [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=avc1",
    "video/mp4",
  ].find((mime) => MediaRecorder.isTypeSupported(mime)) ?? null;
}

async function renderMp4(
  frames: CapturedVideoFrame[],
  delaySeconds: number,
  onProgress: (message: string) => void,
) {
  const mimeType = supportedMp4Mime();
  if (!mimeType) {
    throw new Error("Este navegador não oferece gravação MP4 pelo MediaRecorder. Faça a exportação MP4 em um Chrome/Edge atual ou use o HTML offline.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível neste navegador.");

  const images = await Promise.all(frames.map(async (frame) => {
    const image = new Image();
    image.src = frame.dataUrl;
    await image.decode();
    return image;
  }));

  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Falha durante a codificação MP4."));
  });

  recorder.start(1000);
  const frameDuration = Math.max(5, delaySeconds) * 1000;
  try {
    for (let index = 0; index < images.length; index += 1) {
      onProgress(`Codificando MP4 ${index + 1}/${images.length}. Mantenha esta aba aberta...`);
      context.fillStyle = "#020617";
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(images[index], 0, 0, WIDTH, HEIGHT);
      await wait(frameDuration);
    }
  } finally {
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }
  await stopped;
  return new Blob(chunks, { type: mimeType });
}

export function OfflineExportControls({
  monitorId,
  delaySeconds,
}: {
  monitorId: number;
  delaySeconds: number;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function exportOffline(mode: ExportMode) {
    if (running) return;
    setRunning(true);
    setError("");
    setProgress("Preparando exibição offline...");
    try {
      const baseName = `MCL-Monitor-${String(monitorId).padStart(2, "0")}`;
      let htmlCreated = false;

      if (mode === "html" || mode === "both") {
        const { htmlFrames } = await captureMonitorFrames(monitorId, setProgress, "html");
        setProgress("Gerando HTML offline...");
        const html = buildOfflineHtml(monitorId, htmlFrames, delaySeconds);
        downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${baseName}-offline.html`);
        htmlCreated = true;
      }

      if (mode === "mp4" || mode === "both") {
        try {
          const { videoFrames } = await captureMonitorFrames(monitorId, setProgress, "video");
          setProgress("Iniciando codificação MP4...");
          const mp4 = await renderMp4(videoFrames, delaySeconds, setProgress);
          downloadBlob(mp4, `${baseName}-offline.mp4`);
        } catch (mp4Error) {
          if (htmlCreated) {
            setError(`HTML gerado com sucesso. MP4 não pôde ser gerado: ${mp4Error instanceof Error ? mp4Error.message : "falha de captura de vídeo"}`);
            setProgress("");
            return;
          }
          throw mp4Error;
        }
      }

      setProgress("Exportação concluída.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao exportar monitor.");
      setProgress("");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/40 p-3 dark:border-sky-900/60 dark:bg-sky-950/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-sky-900 dark:text-sky-200">Exportação offline experimental</div>
          <div className="mt-0.5 text-[10px] leading-4 text-zinc-500">
            Gera uma cópia visual do conteúdo atualmente publicado neste monitor. O HTML é serializado sem canvas, preserva o enquadramento 16:9 e aplica fade entre quadros. O MP4 permanece experimental e tenta incorporar todos os recursos antes da codificação.
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={running} onClick={() => void exportOffline("html")} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-sky-800 disabled:opacity-50 dark:border-sky-900 dark:bg-zinc-950 dark:text-sky-300">
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} HTML
          </button>
          <button type="button" disabled={running} onClick={() => void exportOffline("mp4")} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-sky-800 disabled:opacity-50 dark:border-sky-900 dark:bg-zinc-950 dark:text-sky-300">
            <Download className="h-3 w-3" /> MP4
          </button>
          <button type="button" disabled={running} onClick={() => void exportOffline("both")} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
            <Download className="h-3 w-3" /> Ambos
          </button>
        </div>
      </div>
      {progress ? <p className="mt-2 text-[10px] font-semibold text-sky-700 dark:text-sky-300">{progress}</p> : null}
      {error ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-[10px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
