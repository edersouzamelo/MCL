import { inflateRawSync } from "node:zlib";
import { posix } from "node:path";
import type {
  MonitorDocumentAssetDraft,
  MonitorDocumentChart,
  MonitorDocumentExtraction,
  MonitorDocumentSceneDraft,
  MonitorDocumentSeries,
  MonitorSlideElement,
  MonitorSlideTextElement,
} from "@/modules/grupamento/monitor-content/types";

const MAX_ENTRIES = 2000;
const MAX_EXPANDED = 48 * 1024 * 1024;
const MAX_ASSETS = 48;
const MAX_ASSET_BYTES = 18 * 1024 * 1024;

type Rel = { id: string; type: string; target: string };
type Theme = Record<string, string>;

function decode(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function clean(value: string) {
  return decode(value).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function zipEntries(input: Buffer) {
  const min = Math.max(0, input.length - 65557);
  let eocd = -1;
  for (let offset = input.length - 22; offset >= min; offset -= 1) {
    if (input.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("PowerPoint inválido: diretório ZIP não encontrado.");
  const count = input.readUInt16LE(eocd + 10);
  const central = input.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES) throw new Error("PowerPoint excede o limite seguro de entradas.");
  const entries = new Map<string, Buffer>();
  let cursor = central;
  let expanded = 0;
  for (let index = 0; index < count; index += 1) {
    if (input.readUInt32LE(cursor) !== 0x02014b50) throw new Error("PowerPoint corrompido.");
    const flags = input.readUInt16LE(cursor + 8);
    const compression = input.readUInt16LE(cursor + 10);
    const packedSize = input.readUInt32LE(cursor + 20);
    const size = input.readUInt32LE(cursor + 24);
    const nameLen = input.readUInt16LE(cursor + 28);
    const extraLen = input.readUInt16LE(cursor + 30);
    const commentLen = input.readUInt16LE(cursor + 32);
    const local = input.readUInt32LE(cursor + 42);
    const name = input.subarray(cursor + 46, cursor + 46 + nameLen).toString("utf8");
    if ((flags & 1) !== 0) throw new Error("PowerPoint criptografado não é suportado.");
    if (name.includes("..") || name.startsWith("/")) throw new Error("Entrada ZIP insegura rejeitada.");
    expanded += size;
    if (expanded > MAX_EXPANDED) throw new Error("PowerPoint excede o limite seguro de conteúdo expandido.");
    if (!name.endsWith("/")) {
      if (input.readUInt32LE(local) !== 0x04034b50) throw new Error("Cabeçalho ZIP inválido.");
      const localName = input.readUInt16LE(local + 26);
      const localExtra = input.readUInt16LE(local + 28);
      const start = local + 30 + localName + localExtra;
      const packed = input.subarray(start, start + packedSize);
      const data = compression === 0 ? Buffer.from(packed) : compression === 8 ? inflateRawSync(packed) : null;
      if (!data) throw new Error("Compressão ZIP não suportada.");
      entries.set(name, data);
    }
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function attribute(fragment: string, name: string) {
  const match = fragment.match(new RegExp("\\b" + name + "=\"([^\"]*)\"", "i"));
  return match ? decode(match[1]) : "";
}

function relationships(entries: Map<string, Buffer>, slidePath: string) {
  const relsPath = posix.dirname(slidePath) + "/_rels/" + posix.basename(slidePath) + ".rels";
  const xml = entries.get(relsPath)?.toString("utf8") ?? "";
  const base = posix.dirname(slidePath);
  const result = new Map<string, Rel>();
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const id = attribute(match[1], "Id");
    const type = attribute(match[1], "Type");
    const target = posix.normalize(posix.join(base, attribute(match[1], "Target")));
    if (id && target && !target.startsWith("../")) result.set(id, { id, type, target });
  }
  return result;
}

function textNodes(xml: string) {
  return [...xml.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1]));
}

function paragraphs(xml: string) {
  const items = [...xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)]
    .map((m) => clean(textNodes(m[1]).join(""))).filter(Boolean);
  if (items.length) return items;
  const fallback = clean(textNodes(xml).join(""));
  return fallback ? [fallback] : [];
}

function slideSize(entries: Map<string, Buffer>) {
  const xml = entries.get("ppt/presentation.xml")?.toString("utf8") ?? "";
  const m = xml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  return { width: Number(m?.[1] ?? 12192000), height: Number(m?.[2] ?? 6858000) };
}

function themeColors(entries: Map<string, Buffer>) {
  const found = [...entries.entries()].find(([name]) => /^ppt\/theme\/theme\d+\.xml$/.test(name));
  const xml = found?.[1]?.toString("utf8") ?? "";
  const theme: Theme = {};
  for (const key of ["dk1","lt1","dk2","lt2","accent1","accent2","accent3","accent4","accent5","accent6"]) {
    const block = xml.match(new RegExp("<a:" + key + "\\b[^>]*>([\\s\\S]*?)<\\/a:" + key + ">"))?.[1] ?? "";
    const rgb = block.match(/<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/)?.[1]
      ?? block.match(/<a:sysClr\b[^>]*\blastClr="([0-9A-Fa-f]{6})"/)?.[1];
    if (rgb) theme[key] = "#" + rgb.toUpperCase();
  }
  return theme;
}

function color(xml: string, theme: Theme) {
  const rgb = xml.match(/<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/)?.[1];
  if (rgb) return "#" + rgb.toUpperCase();
  const scheme = xml.match(/<a:schemeClr\b[^>]*\bval="([^"]+)"/)?.[1];
  return scheme ? theme[scheme] : undefined;
}

function fill(xml: string, theme: Theme) {
  const block = xml.match(/<a:solidFill\b[^>]*>([\s\S]*?)<\/a:solidFill>/)?.[1];
  return block ? color(block, theme) : undefined;
}

function line(xml: string, theme: Theme) {
  const block = xml.match(/<a:ln\b[^>]*>([\s\S]*?)<\/a:ln>/)?.[1];
  return block ? fill(block, theme) : undefined;
}

function box(xml: string, width: number, height: number) {
  const xfrm = xml.match(/<(?:a|p):xfrm\b[^>]*>([\s\S]*?)<\/(?:a|p):xfrm>/)?.[1] ?? "";
  const off = xfrm.match(/<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"/);
  const ext = xfrm.match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  if (!off || !ext) return null;
  return {
    x: Number(off[1]) / width, y: Number(off[2]) / height,
    w: Number(ext[1]) / width, h: Number(ext[2]) / height,
  };
}

function fontSize(xml: string) {
  const sizes = [...xml.matchAll(/<(?:a:rPr|a:defRPr|a:endParaRPr)\b[^>]*\bsz="(\d+)"/g)]
    .map((m) => Number(m[1]) / 100).filter((v) => Number.isFinite(v) && v > 0);
  return sizes.length ? Math.max(...sizes) : undefined;
}

function align(xml: string): "left" | "center" | "right" {
  const value = xml.match(/<a:pPr\b[^>]*\balgn="([^"]+)"/)?.[1];
  return value === "ctr" ? "center" : value === "r" ? "right" : "left";
}

function valign(xml: string): "top" | "middle" | "bottom" {
  const value = xml.match(/<a:bodyPr\b[^>]*\banchor="([^"]+)"/)?.[1];
  return value === "ctr" ? "middle" : value === "b" ? "bottom" : "top";
}

function role(text: string, size: number | undefined, y: number) {
  const s = size ?? 18;
  if ((/^R\$\s*[\d.,]+$/.test(text) || /^[\d.,]+\s*%$/.test(text)) && s >= 24) return "metric" as const;
  if (y < 0.3 && s >= 20) return "title" as const;
  return s <= 12 ? "label" as const : "body" as const;
}

function series(xml: string, theme: Theme): MonitorDocumentSeries[] {
  const result: MonitorDocumentSeries[] = [];
  for (const match of xml.matchAll(/<c:ser\b[^>]*>([\s\S]*?)<\/c:ser>/g)) {
    const block = match[1];
    const name = clean(block.match(/<c:tx\b[^>]*>[\s\S]*?<c:v>([\s\S]*?)<\/c:v>/)?.[1] ?? "Série " + (result.length + 1));
    const cat = block.match(/<c:cat\b[^>]*>([\s\S]*?)<\/c:cat>/)?.[1] ?? "";
    const val = block.match(/<c:val\b[^>]*>([\s\S]*?)<\/c:val>/)?.[1] ?? "";
    const categories = [...cat.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)].map((m) => clean(m[1]));
    const values = [...val.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)].map((m) => Number(m[1].replace(",", "."))).filter(Number.isFinite);
    const explicit = fill(block, theme);
    if (values.length) result.push({ name, categories, values, color: explicit ?? theme["accent" + Math.min(6, result.length + 1)] });
  }
  return result.slice(0, 8);
}

function axisTitle(axisXml: string) {
  const titleXml = axisXml.match(/<c:title\b[^>]*>([\s\S]*?)<\/c:title>/)?.[1] ?? "";
  const value = clean(textNodes(titleXml).join(" "));
  return value || undefined;
}

function chart(xml: string, theme: Theme) {
  const choices = [["barChart","bar"],["lineChart","line"],["pieChart","pie"],["doughnutChart","doughnut"],["areaChart","area"],["scatterChart","scatter"]] as const;
  const found = choices.find(([tag]) => new RegExp("<c:" + tag + "\\b").test(xml));
  const block = found ? xml.match(new RegExp("<c:" + found[0] + "\\b[^>]*>([\\s\\S]*?)<\\/c:" + found[0] + ">"))?.[1] ?? xml : xml;
  const dir = block.match(/<c:barDir\b[^>]*\bval="([^"]+)"/)?.[1];
  const rawGrouping = block.match(/<c:grouping\b[^>]*\bval="([^"]+)"/)?.[1];
  const grouping: MonitorDocumentChart["grouping"] = rawGrouping === "stacked" ? "stacked" : rawGrouping === "percentStacked" ? "percentStacked" : rawGrouping === "clustered" ? "clustered" : "standard";
  const overlap = Number(block.match(/<c:overlap\b[^>]*\bval="(-?\d+)"/)?.[1] ?? "0");
  const categoryAxis = xml.match(/<c:catAx\b[^>]*>([\s\S]*?)<\/c:catAx>/)?.[1] ?? "";
  const valueAxis = xml.match(/<c:valAx\b[^>]*>([\s\S]*?)<\/c:valAx>/)?.[1] ?? "";
  const categoryTitle = axisTitle(categoryAxis);
  const valueTitle = axisTitle(valueAxis);
  const format = decode(valueAxis.match(/<c:numFmt\b[^>]*\bformatCode="([^"]+)"/)?.[1] ?? "");
  const min = Number(valueAxis.match(/<c:min\b[^>]*\bval="([^"]+)"/)?.[1] ?? "NaN");
  const max = Number(valueAxis.match(/<c:max\b[^>]*\bval="([^"]+)"/)?.[1] ?? "NaN");
  const horizontalBar = found?.[1] === "bar" && dir === "bar";
  const xAxisTitle = horizontalBar ? valueTitle : categoryTitle;
  const yAxisTitle = horizontalBar ? categoryTitle : valueTitle;
  return {
    type: (found?.[1] ?? "unknown") as "bar"|"line"|"pie"|"doughnut"|"area"|"scatter"|"unknown",
    orientation: found?.[1] === "bar" ? (dir === "bar" ? "horizontal" as const : "vertical" as const) : undefined,
    grouping,
    overlap: Number.isFinite(overlap) ? overlap : 0,
    series: series(block, theme),
    valueFormat: format || undefined,
    axisMin: Number.isFinite(min) ? min : undefined,
    axisMax: Number.isFinite(max) ? max : undefined,
    xAxisTitle,
    yAxisTitle,
  };
}

function tableRows(xml: string) {
  const table = xml.match(/<a:tbl\b[^>]*>([\s\S]*?)<\/a:tbl>/)?.[1];
  if (!table) return [];
  return [...table.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g)].map((row) =>
    [...row[1].matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g)].map((cell) => paragraphs(cell[1]).join(" ")),
  ).filter((row) => row.some(Boolean));
}

function mime(name: string) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  return null;
}

function addAsset(entries: Map<string, Buffer>, path: string, assets: MonitorDocumentAssetDraft[], registry: Map<string,string>, warnings: string[]) {
  if (registry.has(path)) return registry.get(path)!;
  const data = entries.get(path);
  if (!data) return null;
  const used = assets.reduce((total, item) => total + item.data.length, 0);
  if (assets.length >= MAX_ASSETS || used + data.length > MAX_ASSET_BYTES) { warnings.push("Limite de figuras extraídas atingido."); return null; }
  const mimeType = mime(path);
  if (!mimeType) { warnings.push("Figura " + posix.basename(path) + " não renderizável diretamente."); return null; }
  const key = "asset-" + (assets.length + 1);
  assets.push({ key, fileName: posix.basename(path), mimeType, data });
  registry.set(path, key);
  return key;
}

function blocks(xml: string) {
  const result: Array<{kind:"shape"|"picture"|"frame"; xml:string; index:number}> = [];
  for (const spec of [{kind:"shape" as const,tag:"p:sp"},{kind:"picture" as const,tag:"p:pic"},{kind:"frame" as const,tag:"p:graphicFrame"}]) {
    const regex = new RegExp("<" + spec.tag + "\\b[\\s\\S]*?<\\/" + spec.tag + ">", "g");
    for (const match of xml.matchAll(regex)) result.push({ kind: spec.kind, xml: match[0], index: match.index ?? 0 });
  }
  return result.sort((a,b) => a.index-b.index);
}

function slideTitle(elements: MonitorSlideElement[], page: number) {
  const texts = elements.filter((item): item is MonitorSlideTextElement => item.kind === "text");
  const best = [...texts].filter((item) => item.y < 0.28).sort((a,b) => (b.fontSizePt ?? 0)-(a.fontSizePt ?? 0) || a.y-b.y)[0];
  const value = clean(best?.text.split("\n")[0] ?? "");
  return value ? value.slice(0,110) : "Slide " + page;
}

export function extractPptxLayout(buffer: Buffer): MonitorDocumentExtraction {
  const entries = zipEntries(buffer);
  const size = slideSize(entries);
  const theme = themeColors(entries);
  const assets: MonitorDocumentAssetDraft[] = [];
  const scenes: MonitorDocumentSceneDraft[] = [];
  const warnings: string[] = [];
  const registry = new Map<string,string>();
  const slides = [...entries.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a,b) => Number(a.match(/(\d+)/)?.[1])-Number(b.match(/(\d+)/)?.[1]));

  slides.forEach((slidePath,index) => {
    const page = index + 1;
    const xml = entries.get(slidePath)!.toString("utf8");
    const rels = relationships(entries, slidePath);
    let elements: MonitorSlideElement[] = [];
    const searchable: string[] = [];
    let z = 0;
    for (const item of blocks(xml)) {
      const b = box(item.xml,size.width,size.height);
      if (!b) continue;
      if (item.kind === "shape") {
        const text = clean(paragraphs(item.xml).join("\n"));
        const sp = item.xml.match(/<p:spPr\b[^>]*>([\s\S]*?)<\/p:spPr>/)?.[1] ?? "";
        const f = fill(sp,theme);
        const l = line(sp,theme);
        const geometry = item.xml.match(/<a:prstGeom\b[^>]*\bprst="([^"]+)"/)?.[1];
        if (f || l || geometry === "line") elements.push({kind:"shape",...b,fill:f,lineColor:l,radius:geometry==="roundRect"?0.018:0,z:z*10});
        if (text) {
          const fs = fontSize(item.xml);
          searchable.push(text);
          elements.push({kind:"text",...b,text,fontSizePt:fs,bold:/<a:rPr\b[^>]*\bb="(?:1|true)"/i.test(item.xml),align:align(item.xml),verticalAlign:valign(item.xml),color:color(item.xml,theme),role:role(text,fs,b.y),z:z*10+1});
        }
      } else if (item.kind === "picture") {
        const rid = item.xml.match(/<a:blip\b[^>]*\br:embed="([^"]+)"/)?.[1];
        const target = rid ? rels.get(rid)?.target : undefined;
        const assetKey = target ? addAsset(entries,target,assets,registry,warnings) : null;
        const meta = item.xml.match(/<p:cNvPr\b([^>]*)\/?\s*>/)?.[1] ?? "";
        const imageLabel = clean(attribute(meta, "descr") || attribute(meta, "title") || attribute(meta, "name"));
        if (imageLabel) searchable.push(imageLabel);
        if (assetKey) elements.push({kind:"image",...b,assetKey,z:z*10+1});
      } else {
        const rid = item.xml.match(/<c:chart\b[^>]*\br:id="([^"]+)"/)?.[1];
        const target = rid ? rels.get(rid)?.target : undefined;
        if (target) {
          const parsed = chart(entries.get(target)?.toString("utf8") ?? "",theme);
          if (parsed.series.length) {
            parsed.series.forEach((s) => searchable.push(s.name,...s.categories,...s.values.map(String)));
            if (parsed.xAxisTitle) searchable.push(parsed.xAxisTitle);
            if (parsed.yAxisTitle) searchable.push(parsed.yAxisTitle);
            elements.push({kind:"chart",...b,chart:parsed,z:z*10+1});
          }
        }
        const rows = tableRows(item.xml);
        if (rows.length) { searchable.push(...rows.flat()); elements.push({kind:"table",...b,columns:rows[0]??[],rows:rows.slice(1),z:z*10+1}); }
      }
      z += 1;
    }
    const chartBoxes = elements.filter((element) => element.kind === "chart");
    const neutralFills = new Set(["#FFFFFF", "#F8FAFC", "#F1F5F9", "#F9FAFB"]);
    elements = elements.filter((element) => {
      if (element.kind !== "shape" || !element.fill || !neutralFills.has(element.fill.toUpperCase())) return true;
      const area = element.w * element.h;
      if (area < 0.04) return true;
      const overlapsChart = chartBoxes.some((chartElement) => {
        const overlapW = Math.max(0, Math.min(element.x + element.w, chartElement.x + chartElement.w) - Math.max(element.x, chartElement.x));
        const overlapH = Math.max(0, Math.min(element.y + element.h, chartElement.y + chartElement.h) - Math.max(element.y, chartElement.y));
        const overlapArea = overlapW * overlapH;
        return overlapArea / Math.max(area, 0.0001) >= 0.25;
      });
      return !overlapsChart;
    });

    if (/p:grpSp\b/.test(xml)) warnings.push("Slide " + page + ": grupo de objetos detectado; revisar prévia.");
    scenes.push({
      sceneType:"TEXT",
      title:slideTitle(elements,page),
      sourcePage:page,
      payload:{
        layoutVersion:2,
        layout:{version:2,width:size.width,height:size.height,elements},
        searchableText:[...new Set(searchable.map(clean).filter(Boolean))],
        note:"Slide reconstruído preservando posição, escala, imagens e semântica do gráfico reconhecido."
      }
    });
  });
  if (!slides.length) throw new Error("PowerPoint sem slides XML reconhecíveis.");
  return {scenes:scenes.slice(0,80),assets,warnings};
}
