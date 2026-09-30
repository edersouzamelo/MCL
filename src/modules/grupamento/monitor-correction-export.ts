import PptxGenJS from "pptxgenjs";
import { MONITOR_CORRECTION_MARKER } from "./monitor-content/correction";

const PX_PER_INCH = 144;

function rgb(value: string) {
  const match = value.match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:[, /]+\s*([\d.]+))?\)/);
  if (!match) return null;
  return { color: match.slice(1, 4).map(v => Number(v).toString(16).padStart(2, "0")).join(""), transparency: Math.round((1 - Number(match[4] ?? 1)) * 100) };
}

async function blobData(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler recurso da exibição.")); reader.readAsDataURL(blob);
  });
}

async function embeddedImage(url: string) {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Imagem indisponível. Exportação interrompida para preservar o conteúdo.");
  return blobData(await response.blob());
}

async function svgImage(source: SVGSVGElement, win: Window, width: number, height: number) {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const from = [source, ...Array.from(source.querySelectorAll("*"))];
  const to = [clone, ...Array.from(clone.querySelectorAll("*"))];
  from.forEach((node, index) => {
    const style = win.getComputedStyle(node);
    ["fill", "stroke", "stroke-width", "font-size", "font-family", "font-weight", "opacity", "color"].forEach(key => (to[index] as SVGElement).style.setProperty(key, style.getPropertyValue(key)));
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width)); clone.setAttribute("height", String(height));
  for (const image of Array.from(clone.querySelectorAll("image"))) {
    const href = image.getAttribute("href") ?? image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href || href.startsWith("#")) continue;
    image.setAttribute("href", await embeddedImage(new URL(href, win.location.href).href));
    image.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
  }
  const data = await blobData(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  const img = new Image(); img.src = data; await img.decode();
  const canvas = document.createElement("canvas"); canvas.width = Math.ceil(width * 2); canvas.height = Math.ceil(height * 2);
  const context = canvas.getContext("2d"); if (!context) throw new Error("Navegador sem suporte à exportação de gráficos.");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function createMonitorCorrectionPowerPoint(monitorId: number) {
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";
  pptx.subject = MONITOR_CORRECTION_MARKER; pptx.title = `MCL Monitor ${monitorId} para correção`; pptx.author = "CCOL / MCL";
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
  return pptx;
}

// Geometry comes from the currently rendered monitor, rather than a briefing
// template. Text and cards are native objects; SVG charts remain movable figures.
export async function addMonitorCorrectionSlide(pptx: PptxGenJS, root: HTMLElement, win: Window, label: string) {
  const slide = pptx.addSlide();
  slide.background = { color: rgb(win.getComputedStyle(root).backgroundColor)?.color ?? "020617" };
  slide.addNotes(`${MONITOR_CORRECTION_MARKER}. ${label}. Exibição congelada na exportação. Textos e formas são editáveis; gráficos e imagens são figuras. Reimporte e revise antes de aprovar.`);
  const origin = root.getBoundingClientRect();
  const box = (r: DOMRect) => ({ x: (r.left - origin.left) / PX_PER_INCH, y: (r.top - origin.top) / PX_PER_INCH, w: r.width / PX_PER_INCH, h: r.height / PX_PER_INCH });
  const visible = (r: DOMRect) => r.width > .5 && r.height > .5 && r.right > origin.left && r.bottom > origin.top && r.left < origin.right && r.top < origin.bottom;
  async function visit(element: Element) {
    const style = win.getComputedStyle(element), rect = element.getBoundingClientRect();
    let scale = 1;
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const css = win.getComputedStyle(ancestor);
      const matrix = css.transform.match(/^matrix\(([^)]+)\)/)?.[1].split(",").map(Number);
      if (matrix) scale *= Math.hypot(matrix[0], matrix[1]);
      if (ancestor !== element && /hidden|clip|scroll|auto/.test(css.overflow)) {
        const clip = ancestor.getBoundingClientRect();
        if (rect.right <= clip.left || rect.left >= clip.right || rect.bottom <= clip.top || rect.top >= clip.bottom) return;
      }
    }
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0 || !visible(rect)) return;
    if (element.tagName.toLowerCase() === "svg") {
      slide.addImage({ data: await svgImage(element as SVGSVGElement, win, rect.width, rect.height), ...box(rect) }); return;
    }
    if (element.tagName === "IMG") {
      const image = element as HTMLImageElement;
      slide.addImage({ data: await embeddedImage(image.currentSrc || image.src), ...box(rect), sizing: { type: "contain", ...box(rect) } }); return;
    }
    const bg = rgb(style.backgroundColor), border = rgb(style.borderTopColor);
    if (bg && bg.transparency < 100 || parseFloat(style.borderTopWidth) > 0 && border) {
      slide.addShape(parseFloat(style.borderRadius) > 0 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { ...box(rect),
        fill: bg ?? { color: "FFFFFF", transparency: 100 },
        line: border && parseFloat(style.borderTopWidth) > 0 ? { ...border, width: parseFloat(style.borderTopWidth) * .5 } : { transparency: 100 },
      });
    }
    const backgroundImage = style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    if (backgroundImage) slide.addImage({ data: await embeddedImage(new URL(backgroundImage, win.location.href).href), ...box(rect) });
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === 3 && node.textContent?.trim()) {
        const range = element.ownerDocument.createRange(); range.selectNodeContents(node);
        const bounds = range.getBoundingClientRect(); if (!visible(bounds)) continue;
        const textColor = rgb(style.color)?.color ?? "FFFFFF";
        slide.addText(node.textContent.trim(), { ...box(bounds), h: Math.max(box(bounds).h, parseFloat(style.fontSize) / PX_PER_INCH * 1.25),
          fontFace: style.fontFamily.split(",")[0].replace(/["']/g, ""), fontSize: parseFloat(style.fontSize) * .5 * scale,
          bold: Number(style.fontWeight) >= 600, italic: style.fontStyle === "italic", color: textColor,
          margin: 0, valign: "top", breakLine: false, fit: "shrink", align: style.textAlign === "center" ? "center" : style.textAlign === "right" ? "right" : "left",
        });
      } else if (node.nodeType === 1) await visit(node as Element);
    }
  }
  await visit(root);
}
