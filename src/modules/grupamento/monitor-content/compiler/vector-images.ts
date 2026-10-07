import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import sharp from "sharp";
import { zipEntries } from "../pptx-layout";
import { renderNativeDocument, type NativeRenderer } from "./native-renderer";

async function chartPng(data: Buffer) {
  const decoded = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: pixels, info } = decoded;
  const seen = new Uint8Array(info.width * info.height);
  const queue: number[] = [];
  const white = (offset: number) => pixels[offset] > 245 && pixels[offset + 1] > 245 && pixels[offset + 2] > 245 && pixels[offset + 3] > 0;
  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const index = y * info.width + x;
    if (seen[index]) return;
    const offset = index * info.channels;
    if (!white(offset)) return;
    seen[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < info.width; x++) { enqueue(x, 0); enqueue(x, info.height - 1); }
  for (let y = 0; y < info.height; y++) { enqueue(0, y); enqueue(info.width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], x = index % info.width, y = Math.floor(index / info.width);
    const offset = index * info.channels;
    pixels[offset + 3] = 0;
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }
  for (let index = 0; index < info.width * info.height; index++) {
    const offset = index * info.channels;
    if (pixels[offset + 3] && pixels[offset] < 50 && pixels[offset + 1] < 50 && pixels[offset + 2] < 50) {
      pixels[offset] = 255; pixels[offset + 1] = 255; pixels[offset + 2] = 255;
    }
  }
  return sharp(pixels, { raw: info }).png().toBuffer();
}

/** Rasterize only unsupported vector pictures, never the surrounding editable slide.
 * Conversion still runs in the existing isolated Office renderer. No OCR/invented data. */
export async function convertVectorImages(buffer: Buffer, renderer: NativeRenderer = renderNativeDocument) {
  const entries = zipEntries(buffer);
  const vectors = [...entries].filter(([path]) => /^ppt\/media\/.+\.(emf|wmf)$/i.test(path));
  const converted = new Map<string, Buffer>();
  if (!vectors.length) return converted;
  if (vectors.length > 48) throw new Error("Mais de 48 figuras vetoriais; conversão por componente excede o limite.");
  const deck = new pptxgen(); deck.layout = "LAYOUT_WIDE";
  for (const _ of vectors) { void _; deck.addSlide(); }
  const zip = await JSZip.loadAsync(await deck.write({ outputType: "nodebuffer" }) as Buffer);
  const width = 12192000, height = 6858000;
  const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (const [index, [path, data]] of vectors.entries()) {
    // EMF bounds define the picture's own aspect ratio, independent of slide placement.
    let ratio = 16 / 9;
    if (/\.emf$/i.test(path) && data.length >= 40) {
      const w = data.readInt32LE(32) - data.readInt32LE(24);
      const h = data.readInt32LE(36) - data.readInt32LE(28);
      if (w > 0 && h > 0) ratio = w / h;
    } else {
      // Placeable WMF header, in device-independent units.
      if (data.length >= 22 && data.readUInt32LE(0) === 0x9ac6cdd7) {
        const w = data.readInt16LE(10) - data.readInt16LE(6), h = data.readInt16LE(12) - data.readInt16LE(8);
        if (w > 0 && h > 0) ratio = w / h;
      } else throw new Error("WMF sem dimensões confiáveis; manter contingência integral.");
    }
    if (!Number.isFinite(ratio) || ratio < .05 || ratio > 20) throw new Error("Dimensões vetoriais fora do contrato.");
    const w = Math.round(Math.min(width, height * ratio)), h = Math.round(w / ratio);
    const x = Math.floor((width - w) / 2), y = Math.floor((height - h) / 2);
    boxes.push({ x: x / width, y: y / height, w: w / width, h: h / height });
    const page = index + 1, extension = path.split(".").pop()!.toLowerCase();
    zip.file(`ppt/media/vector${page}.${extension}`, data);
    zip.file(`ppt/slides/slide${page}.xml`, `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" showMasterSp="0"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Vector component"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdVector"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`);
    const relPath = `ppt/slides/_rels/slide${page}.xml.rels`;
    const rels = await zip.file(relPath)!.async("string");
    zip.file(relPath, rels.replace("</Relationships>", `<Relationship Id="rIdVector" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/vector${page}.${extension}"/></Relationships>`));
  }
  const contentTypes = await zip.file("[Content_Types].xml")!.async("string");
  zip.file("[Content_Types].xml", contentTypes.replace("</Types>", [...new Set(vectors.map(([path]) => path.split(".").pop()!.toLowerCase()))].map(ext => `<Default Extension="${ext}" ContentType="image/x-${ext}"/>`).join("") + "</Types>"));
  const pages = await renderer(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), "pptx");
  if (pages.length !== vectors.length) throw new Error("Conversão vetorial incompleta; manter o original.");
  let bytes = 0;
  for (const [index, [path]] of vectors.entries()) {
    const page = pages[index], box = boxes[index];
    if (page.page !== index + 1 || !page.asset.width || !page.asset.height) throw new Error("Página vetorial inválida.");
    const left = Math.round(box.x * page.asset.width), top = Math.round(box.y * page.asset.height);
    const width = Math.min(page.asset.width - left, Math.round(box.w * page.asset.width));
    const height = Math.min(page.asset.height - top, Math.round(box.h * page.asset.height));
    const cropped = await sharp(page.asset.data).extract({ left, top, width, height }).png().toBuffer();
    const data = await chartPng(cropped);
    bytes += data.length;
    if (bytes > 18 * 1024 * 1024) throw new Error("Figuras convertidas excedem o limite seguro.");
    converted.set(path, data);
  }
  return converted;
}
