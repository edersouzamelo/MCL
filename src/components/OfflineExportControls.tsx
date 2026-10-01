"use client";

import { buildOfflineHtml } from "@/modules/grupamento/monitor-offline-html";

import { useState } from "react";
import { MonitorCommandHelp } from "@/components/CcolMonitorCard";
import { Download, ExternalLink, Loader2, Presentation } from "lucide-react";

type CapturedHtmlFrame = {
  html: string;
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

async function waitForCaptureFrame(iframe: HTMLIFrameElement, frameIndex: number, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const root = iframe.contentDocument?.querySelector<HTMLElement>("[data-mcl-capture-root='1']");
    const ready = root?.dataset.mclCaptureReady === "1";
    const currentFrame = Number(root?.dataset.mclFrameIndex ?? "-1");
    if (root && ready && currentFrame === frameIndex) {
      await iframe.contentDocument!.fonts.ready;
      // Finish entry effects before copying dimensions; counters are disabled in capture mode.
      for (const animation of iframe.contentDocument!.getAnimations()) {
        if (animation.effect?.getTiming().iterations !== Infinity) { try { animation.finish(); } catch {} }
      }
      await wait(350);
      // Wait for measured table pagination, including record layouts, before
      // exporting. A ready scene is not necessarily a ready content measurement.
      if (Array.from(root.querySelectorAll<HTMLElement>("[data-monitor-document-table], [data-monitor-document-text]")).some(node => (node.dataset.tableReady ?? node.dataset.textReady) !== "1")) continue;
      return root;
    }
    await wait(150);
  }
  throw new Error(`Tempo esgotado aguardando o quadro ${frameIndex + 1}.`);
}

async function captureMonitorFrames(
  monitorId: number,
  onProgress: (message: string) => void,
  capture?: (root: HTMLElement, win: Window, label: string) => Promise<void>,
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
    for (let index = 0; index < frameCount; index += 1) {
      onProgress(`Capturando quadro ${index + 1}/${frameCount}...`);
      if (index > 0) {
        iframe.contentWindow?.postMessage({ type: "MCL_CAPTURE_FRAME", frameIndex: index }, window.location.origin);
      }
      const root = await waitForCaptureFrame(iframe, index);
      const label = root.dataset.mclFrameLabel ?? `Quadro ${index + 1}`;
      const table = Array.from(root.querySelectorAll<HTMLElement>("[data-monitor-document-table], [data-monitor-document-text]"))
        .sort((a, b) => Number(b.dataset.capturePageCount ?? "1") - Number(a.dataset.capturePageCount ?? "1"))[0];
      const viewport = root.querySelector<HTMLElement>("[data-monitor-viewport]");
      const paginated = Number(table?.dataset.capturePageCount ?? "1") > 1 ? table : viewport;
      const pageCount = Math.max(1, Number(paginated === table ? table?.dataset.capturePageCount ?? "1" : viewport?.dataset.pageCount ?? "1"));
      for (let page = 0; page < pageCount; page++) {
        if (page > 0) {
          iframe.contentWindow?.postMessage({ type: paginated === table ? table?.hasAttribute("data-monitor-document-text") ? "MCL_CAPTURE_TEXT_PAGE" : "MCL_CAPTURE_TABLE_PAGE" : "MCL_CAPTURE_VIEWPORT_PAGE", page }, window.location.origin);
          const deadline = Date.now() + 5000;
          while (Number(paginated?.dataset.capturePage) !== page && Date.now() < deadline) await wait(50);
          if (Number(paginated?.dataset.capturePage) !== page) throw new Error("Falha ao capturar página documental.");
          await wait(150);
        }
        const pageLabel = pageCount > 1 ? `${label} · página ${page + 1}/${pageCount}` : label;
        if (capture) await capture(root, iframe.contentWindow!, pageLabel);
        else htmlFrames.push({ html: await captureRootAsHtml(root, iframe.contentWindow!), label: pageLabel });
      }
    }
    return htmlFrames;
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


export function OfflineExportControls({
  monitorId,
  delaySeconds,
  beforeExport,
  commandGrid = false,
}: {
  commandGrid?: boolean;
  monitorId: number;
  delaySeconds: number;
  beforeExport?: () => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function exportOffline() {
    if (running) return;
    setRunning(true);
    setError("");
    setProgress("Preparando exibição offline...");
    try {
      await beforeExport?.();
      const baseName = `MCL-Monitor-${String(monitorId).padStart(2, "0")}`;
      const htmlFrames = await captureMonitorFrames(monitorId, setProgress);
      setProgress("Gerando HTML portátil...");
      const html = buildOfflineHtml(monitorId, htmlFrames, delaySeconds);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${baseName}-offline.html`);
      setProgress("HTML portátil gerado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao exportar monitor.");
      setProgress("");
    } finally {
      setRunning(false);
    }
  }

  async function exportForCorrection() {
    if (running) return;
    setRunning(true); setError(""); setProgress("Preparando PowerPoint para correção…");
    try {
      await beforeExport?.();
      const { createMonitorCorrectionPowerPoint, addMonitorCorrectionSlide } = await import("@/modules/grupamento/monitor-correction-export");
      const pptx = createMonitorCorrectionPowerPoint(monitorId);
      let slideCount = 0;
      await captureMonitorFrames(monitorId, setProgress, async (root, win, label) => {
        if (++slideCount > 80) throw new Error("Mais de 80 quadros selecionados. Reduza a seleção para exportar e reimportar sem perder conteúdo.");
        await addMonitorCorrectionSlide(pptx, root, win, label);
      });
      await pptx.writeFile({ fileName: `MCL-Monitor-${String(monitorId).padStart(2, "0")}-para-corrigir.pptx`, compression: true });
      setProgress("PPT gerado. Corrija no PowerPoint, importe neste monitor e revise antes de aprovar. Os dados ficam congelados até uma nova exportação.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao exportar para correção."); setProgress(""); }
    finally { setRunning(false); }
  }

  const controls = <>
    <MonitorCommandHelp text="Ajusta textos, imagens, posição, tamanho e cores dos gráficos dos documentos publicados, mantendo o padrão do MCL."><a href={`/grupamento/monitor-editor/${monitorId}`} target="_blank" rel="noreferrer" className="ccol-command ccol-command-outline"><Presentation className="h-4 w-4" /> Editar conteúdo online</a></MonitorCommandHelp>
    <MonitorCommandHelp text="Guarda a apresentação em PowerPoint. Textos e formas são editáveis; gráficos são imagens. Reimporte e aprove após corrigir."><button type="button" disabled={running} onClick={() => void exportForCorrection()} className="ccol-command ccol-command-outline disabled:opacity-50"><Download className="h-4 w-4" /> Guardar (extrair PPT)</button></MonitorCommandHelp>
    <MonitorCommandHelp text="Exporta a apresentação publicada como HTML portátil para exibição sem internet."><button type="button" disabled={running} onClick={() => void exportOffline()} className="ccol-command ccol-command-outline disabled:opacity-50">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar (extrair HTML)</button></MonitorCommandHelp>
    <MonitorCommandHelp className="col-span-3" text="Abre a apresentação deste monitor em outra aba. Use F11 para ocupar a tela."><a href={`/grupamento/monitor/${monitorId}`} target="_blank" rel="noreferrer" className="ccol-command ccol-command-open"><ExternalLink className="h-4 w-4" /> Exibir / Abrir</a></MonitorCommandHelp>
  </>;
  return <div className={commandGrid ? "grid grid-cols-3 gap-2" : "mt-3 grid grid-cols-3 gap-2 rounded-xl border border-sky-200 p-3"}>
    {controls}
    {progress ? <p role="status" className="col-span-3 mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">{progress}</p> : null}
    {error ? <p role="alert" className="col-span-3 mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
  </div>;
}
