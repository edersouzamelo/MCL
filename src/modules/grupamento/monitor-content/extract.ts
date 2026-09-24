import { inflateRawSync, deflateSync } from "node:zlib";
import { posix } from "node:path";
import { extractImages, extractTextItems, getDocumentProxy } from "unpdf";
import { extractPptxLayout } from "@/modules/grupamento/monitor-content/pptx-layout";
import type {
  MonitorDocumentAssetDraft,
  MonitorDocumentExtraction,
  MonitorDocumentSceneDraft,
  MonitorDocumentSeries,
} from "@/modules/grupamento/monitor-content/types";

const MAX_ZIP_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_BYTES = 48 * 1024 * 1024;
const MAX_PDF_PAGES = 80;
const MAX_PDF_IMAGES = 20;
const MAX_IMAGE_PIXELS = 4_000_000;
const MAX_OFFICE_ASSETS = 24;
const MAX_OFFICE_ASSET_BYTES = 12 * 1024 * 1024;

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function cleanText(value: string) {
  return decodeXml(value).replace(/\s+/g, " ").trim();
}

function shortTitle(value: string, fallback: string) {
  const text = cleanText(value);
  if (!text) return fallback;
  return text.length > 110 ? `${text.slice(0, 107)}…` : text;
}

function uniqueText(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const clean = cleanText(value);
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  }).map(cleanText);
}

function textNodes(xml: string) {
  return uniqueText([...xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?t>/g)].map((match) => match[1]));
}

function attr(fragment: string, name: string) {
  const match = fragment.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function readZipEntries(input: Buffer) {
  const min = Math.max(0, input.length - 65_557);
  let eocd = -1;
  for (let offset = input.length - 22; offset >= min; offset -= 1) {
    if (input.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo Office inválido: diretório ZIP não encontrado.");

  const entryCount = input.readUInt16LE(eocd + 10);
  const centralOffset = input.readUInt32LE(eocd + 16);
  if (entryCount > MAX_ZIP_ENTRIES) throw new Error("Documento Office excede o limite seguro de entradas.");

  const entries = new Map<string, Buffer>();
  let cursor = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (input.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Arquivo Office corrompido no diretório central.");
    const flags = input.readUInt16LE(cursor + 8);
    const compression = input.readUInt16LE(cursor + 10);
    const compressedSize = input.readUInt32LE(cursor + 20);
    const uncompressedSize = input.readUInt32LE(cursor + 24);
    const nameLength = input.readUInt16LE(cursor + 28);
    const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32);
    const localOffset = input.readUInt32LE(cursor + 42);
    const name = input.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if ((flags & 1) !== 0) throw new Error("Documentos Office criptografados não são suportados.");
    if (name.includes("..") || name.startsWith("/")) throw new Error("Entrada ZIP insegura rejeitada.");
    if (uncompressedSize > 12 * 1024 * 1024) throw new Error(`Entrada Office muito grande: ${name}.`);

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error("Documento Office excede o limite seguro de conteúdo expandido.");

    if (!name.endsWith("/")) {
      if (input.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Cabeçalho ZIP local inválido.");
      const localNameLength = input.readUInt16LE(localOffset + 26);
      const localExtraLength = input.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const packed = input.subarray(dataStart, dataStart + compressedSize);
      let data: Buffer;
      if (compression === 0) data = Buffer.from(packed);
      else if (compression === 8) data = inflateRawSync(packed);
      else throw new Error(`Compressão ZIP não suportada (${compression}) em ${name}.`);
      entries.set(name, data);
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function relationshipTargets(entries: Map<string, Buffer>, basePath: string, relsPath: string) {
  const xml = entries.get(relsPath)?.toString("utf8") ?? "";
  const baseDir = posix.dirname(basePath);
  return [...xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map((match) => {
    const id = attr(match[1], "Id");
    const type = attr(match[1], "Type");
    const target = attr(match[1], "Target");
    const resolved = posix.normalize(posix.join(baseDir, target));
    return { id, type, target: resolved };
  }).filter((rel) => rel.id && rel.target && !rel.target.startsWith("../"));
}

function mimeFromName(name: string) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  return null;
}

function imageDimensions(data: Buffer, mimeType: string) {
  try {
    if (mimeType === "image/png" && data.length > 24) return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    if (mimeType === "image/gif" && data.length > 10) return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
  } catch {
    // Dimensões são informativas; falha não invalida o ativo.
  }
  return {};
}

function registerAsset(
  entries: Map<string, Buffer>,
  path: string,
  assets: MonitorDocumentAssetDraft[],
  registry: Map<string, string>,
  warnings: string[],
) {
  if (registry.has(path)) return registry.get(path)!;
  const data = entries.get(path);
  if (!data) return null;
  if (assets.length >= MAX_OFFICE_ASSETS || assets.reduce((total, asset) => total + asset.data.length, 0) + data.length > MAX_OFFICE_ASSET_BYTES) {
    warnings.push("Limite de figuras extraídas atingido; o arquivo original foi preservado integralmente para conferência.");
    return null;
  }
  const mimeType = mimeFromName(path);
  if (!mimeType) {
    warnings.push(`Figura ${posix.basename(path)} preservada no arquivo original, mas o formato não é exibível diretamente no navegador.`);
    return null;
  }
  const key = `asset-${assets.length + 1}`;
  const dimensions = imageDimensions(data, mimeType);
  assets.push({ key, fileName: posix.basename(path), mimeType, data, ...dimensions });
  registry.set(path, key);
  return key;
}

function chartSeries(xml: string): MonitorDocumentSeries[] {
  const series: MonitorDocumentSeries[] = [];
  for (const match of xml.matchAll(/<c:ser\b[^>]*>([\s\S]*?)<\/c:ser>/g)) {
    const block = match[1];
    const name = cleanText((block.match(/<c:tx\b[^>]*>[\s\S]*?<c:v>([\s\S]*?)<\/c:v>/)?.[1] ?? `Série ${series.length + 1}`));
    const catBlock = block.match(/<c:cat\b[^>]*>([\s\S]*?)<\/c:cat>/)?.[1] ?? "";
    const valBlock = block.match(/<c:val\b[^>]*>([\s\S]*?)<\/c:val>/)?.[1] ?? "";
    const categories = [...catBlock.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)].map((item) => cleanText(item[1]));
    const values = [...valBlock.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)]
      .map((item) => Number(String(item[1]).replace(",", ".")))
      .filter(Number.isFinite);
    if (values.length) series.push({ name, categories, values });
  }
  return series.slice(0, 4);
}

function pptTables(xml: string) {
  return [...xml.matchAll(/<a:tbl\b[^>]*>([\s\S]*?)<\/a:tbl>/g)].map((table) => {
    const rows = [...table[1].matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g)].map((row) =>
      [...row[1].matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g)].map((cell) => textNodes(cell[1]).join(" ")),
    ).filter((row) => row.some(Boolean));
    return rows;
  }).filter((rows) => rows.length);
}

function extractPptx(buffer: Buffer): MonitorDocumentExtraction {
  const entries = readZipEntries(buffer);
  const assets: MonitorDocumentAssetDraft[] = [];
  const scenes: MonitorDocumentSceneDraft[] = [];
  const warnings: string[] = [];
  const registry = new Map<string, string>();

  const slides = [...entries.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)/)?.[1]) - Number(b.match(/(\d+)/)?.[1]));

  slides.forEach((slidePath, index) => {
    const slideNumber = index + 1;
    const xml = entries.get(slidePath)!.toString("utf8");
    const texts = textNodes(xml);
    const title = shortTitle(texts[0] ?? "", `Slide ${slideNumber}`);
    const body = texts.slice(1).filter((item) => item !== title).slice(0, 9);
    const relsPath = `${posix.dirname(slidePath)}/_rels/${posix.basename(slidePath)}.rels`;
    const rels = relationshipTargets(entries, slidePath, relsPath);
    const imageKeys = rels
      .filter((rel) => rel.type.endsWith("/image"))
      .map((rel) => registerAsset(entries, rel.target, assets, registry, warnings))
      .filter((key): key is string => Boolean(key))
      .slice(0, 3);

    if (texts.length || imageKeys.length) {
      scenes.push({
        sceneType: texts.length ? "TEXT" : "FIGURE",
        title,
        sourcePage: slideNumber,
        payload: texts.length
          ? { bullets: body, assetKeys: imageKeys, note: "Conteúdo extraído deterministicamente do slide original." }
          : { assetKeys: imageKeys },
      });
    }

    for (const [tableIndex, rows] of pptTables(xml).entries()) {
      scenes.push({
        sceneType: "TABLE",
        title: `${title} · tabela ${tableIndex + 1}`,
        sourcePage: slideNumber,
        payload: { columns: rows[0] ?? [], rows: rows.slice(1, 9) },
      });
    }

    for (const rel of rels.filter((item) => item.type.endsWith("/chart"))) {
      const chartXml = entries.get(rel.target)?.toString("utf8") ?? "";
      const series = chartSeries(chartXml);
      if (series.length) {
        scenes.push({
          sceneType: "CHART",
          title: `${title} · gráfico`,
          sourcePage: slideNumber,
          payload: { series, note: "Séries reconstruídas a partir do cache de dados do gráfico do PowerPoint." },
        });
      } else {
        warnings.push(`Slide ${slideNumber}: gráfico encontrado, mas sem série numérica reutilizável.`);
      }
    }
  });

  if (!slides.length) throw new Error("PowerPoint sem slides XML reconhecíveis.");
  if (!scenes.length) warnings.push("Nenhuma cena estruturada pôde ser extraída do PowerPoint.");
  return { scenes: scenes.slice(0, 80), assets, warnings };
}

function extractDocx(buffer: Buffer): MonitorDocumentExtraction {
  const entries = readZipEntries(buffer);
  const xml = entries.get("word/document.xml")?.toString("utf8");
  if (!xml) throw new Error("Word sem document.xml reconhecível.");

  const assets: MonitorDocumentAssetDraft[] = [];
  const scenes: MonitorDocumentSceneDraft[] = [];
  const warnings: string[] = [];
  const registry = new Map<string, string>();

  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)]
    .map((match) => textNodes(match[1]).join(" "))
    .map(cleanText)
    .filter(Boolean);

  for (let index = 0; index < paragraphs.length; index += 6) {
    const group = paragraphs.slice(index, index + 6);
    const candidate = group[0] ?? "";
    const title = candidate.length <= 120 ? candidate : `Documento · trecho ${Math.floor(index / 6) + 1}`;
    const bullets = candidate === title ? group.slice(1) : group;
    scenes.push({ sceneType: "TEXT", title, sourcePage: Math.floor(index / 6) + 1, payload: { layoutVersion: 2, bullets: bullets.slice(0, 7), searchableText: group } });
  }

  const tables = [...xml.matchAll(/<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g)].map((table) =>
    [...table[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((row) =>
      [...row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((cell) => textNodes(cell[1]).join(" ")),
    ).filter((row) => row.some(Boolean)),
  ).filter((rows) => rows.length);

  tables.forEach((rows, index) => scenes.push({
    sceneType: "TABLE",
    title: `Tabela ${index + 1} do documento`,
    sourcePage: index + 1,
    payload: { layoutVersion: 2, columns: rows[0] ?? [], rows: rows.slice(1, 10), searchableText: rows.flat() },
  }));

  const media = [...entries.keys()].filter((name) => name.startsWith("word/media/"));
  const imageKeys = media
    .map((path) => registerAsset(entries, path, assets, registry, warnings))
    .filter((key): key is string => Boolean(key));

  for (let index = 0; index < imageKeys.length; index += 2) {
    scenes.push({
      sceneType: "FIGURE",
      title: `Figura do documento · ${Math.floor(index / 2) + 1}`,
      payload: { layoutVersion: 2, assetKeys: imageKeys.slice(index, index + 2) },
    });
  }

  if (!scenes.length) warnings.push("Nenhuma cena estruturada pôde ser extraída do Word.");
  return { scenes: scenes.slice(0, 80), assets, warnings };
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function rawImageToPng(data: Uint8ClampedArray, width: number, height: number, channels: 1 | 3 | 4) {
  const colorType = channels === 4 ? 6 : channels === 3 ? 2 : 0;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (stride + 1);
    raw[target] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, target + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

function pageText(items: Array<{ str: string; x: number; y: number }>) {
  const ordered = [...items].sort((a, b) => Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x);
  const lines: string[] = [];
  let currentY: number | null = null;
  let line: string[] = [];
  for (const item of ordered) {
    if (currentY === null || Math.abs(item.y - currentY) <= 2) {
      line.push(item.str);
      currentY ??= item.y;
    } else {
      const text = cleanText(line.join(" "));
      if (text) lines.push(text);
      line = [item.str];
      currentY = item.y;
    }
  }
  const last = cleanText(line.join(" "));
  if (last) lines.push(last);
  return uniqueText(lines);
}

async function extractPdf(buffer: Buffer): Promise<MonitorDocumentExtraction> {
  const warnings: string[] = [
    "PDF: gráficos vetoriais e elementos desenhados podem não ser decompostos como figura isolada; o arquivo original permanece preservado para conferência.",
  ];
  const scenes: MonitorDocumentSceneDraft[] = [];
  const assets: MonitorDocumentAssetDraft[] = [];

  const pdf = await getDocumentProxy(new Uint8Array(buffer.slice(0)), { maxImageSize: 16_777_216 });
  if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`PDF com ${pdf.numPages} páginas excede o limite operacional de ${MAX_PDF_PAGES}.`);
  const { items } = await extractTextItems(pdf);

  let imageCount = 0;
  for (let index = 0; index < items.length; index += 1) {
    const pageNumber = index + 1;
    const lines = pageText(items[index] as Array<{ str: string; x: number; y: number }>);
    const title = shortTitle(lines[0] ?? "", `Página ${pageNumber}`);
    const assetKeys: string[] = [];

    if (imageCount < MAX_PDF_IMAGES) {
      try {
        const images = await extractImages(pdf, pageNumber);
        for (const image of images) {
          if (imageCount >= MAX_PDF_IMAGES) break;
          if (image.width < 180 || image.height < 100 || image.width * image.height > MAX_IMAGE_PIXELS) continue;
          const key = `asset-${assets.length + 1}`;
          assets.push({
            key,
            fileName: `pagina-${pageNumber}-figura-${assetKeys.length + 1}.png`,
            mimeType: "image/png",
            width: image.width,
            height: image.height,
            data: rawImageToPng(image.data, image.width, image.height, image.channels),
          });
          assetKeys.push(key);
          imageCount += 1;
          if (assetKeys.length >= 2) break;
        }
      } catch {
        warnings.push(`Página ${pageNumber}: figuras não puderam ser decompostas; o texto permaneceu disponível.`);
      }
    }

    scenes.push({
      sceneType: lines.length ? "TEXT" : "FIGURE",
      title,
      sourcePage: pageNumber,
      payload: lines.length
        ? { layoutVersion: 2, bullets: lines.slice(1, 9), assetKeys, searchableText: lines, note: "Página do PDF reinterpretada como cena MCL; o arquivo original permanece preservado." }
        : { layoutVersion: 2, assetKeys },
    });
  }

  if (!items.length) warnings.push("PDF sem camada textual reconhecível.");
  return { scenes, assets, warnings };
}

export async function extractMonitorDocument(buffer: Buffer, fileName: string): Promise<MonitorDocumentExtraction> {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "pptx") return extractPptxLayout(buffer);
  if (extension === "docx") return extractDocx(buffer);
  if (extension === "pdf") return extractPdf(buffer);
  if (extension === "ppt" || extension === "doc") {
    throw new Error("Formato legado .ppt/.doc não suportado. Salve como .pptx/.docx ou PDF antes da importação.");
  }
  throw new Error("Formato não suportado. Use PDF, PPTX ou DOCX.");
}
