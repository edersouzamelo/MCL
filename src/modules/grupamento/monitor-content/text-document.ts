import type { MonitorDocumentSceneDraft, MonitorSlideElement } from "./types";

export const TEXT_DOCUMENT_VERSION = 1;
export type DocumentBlock = { page?: number } & (
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "figure"; assetKeys: string[] }
);
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Conservative subject boundaries. Field labels and prose stay in the body. */
export function isDocumentHeading(text: string) {
  const value = clean(text);
  if (!value || value.length > 130 || /[.!?;]$/.test(value)) return false;
  if (/^(?:finalidade|per[ií]odo|rotas?|paradas|vtr|viaturas|carga|retorno|ida|observa[çc][õo]es)\s*[:/]/i.test(value)) return false;
  return /^(?:\d+(?:\.\d+)*[.)]?\s+)?(?:miss[ãa]o|transportes? executados|recursos recebidos|situa[çc][ãa]o|planejamento|execu[çc][ãa]o|conclus[ãa]o|objetivos?|classe\s+[IVX]+|se[çc][ãa]o)\b/i.test(value)
    || (/\p{L}/u.test(value) && value === value.toLocaleUpperCase("pt-BR") && !/:\s*\S/.test(value));
}

/** Split at sentences or words, never summarize, deduplicate or discard content. */
export function splitDocumentParagraph(text: string, limit = 420) {
  let rest = clean(text);
  const chunks: string[] = [];
  while (rest.length > limit) {
    const prefix = rest.slice(0, limit + 1);
    const boundaries = [...prefix.matchAll(/[.!?;]\s+/g)].map(match => match.index! + 1);
    let end = boundaries.filter(index => index >= limit * .5).at(-1) ?? prefix.lastIndexOf(" ");
    if (end < limit * .4) end = limit;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function layout(title: string, paragraphs: string[]): MonitorSlideElement[] {
  const weights = paragraphs.map(text => Math.max(1, Math.ceil(text.length / 74)) + 1);
  const total = weights.reduce((a,b) => a+b, 0) || 1;
  let y = .17;
  return [{ kind: "text", text: title, role: "title", x: .03, y: .02, w: .94, h: .12, z: 0, fontSizePt: 30, bold: true }, ...paragraphs.map((text, index): MonitorSlideElement => {
    const h = .79 * weights[index] / total;
    const element: MonitorSlideElement = { kind: "text", text, role: "body", x: .04, y, w: .92, h: h - .012, z: index+1, fontSizePt: 24 };
    y += h;
    return element;
  })];
}

export function composeTextDocument(blocks: DocumentBlock[], fallback = "Documento", maxUnits = 17): MonitorDocumentSceneDraft[] {
  const scenes: MonitorDocumentSceneDraft[] = [];
  let title = fallback, body: string[] = [], units = 0, page: number | undefined, part = 0;
  let pendingHeading = false;
  const flush = () => {
    if (!body.length && !pendingHeading) return;
    const sceneTitle = part ? `${title} · continuação ${part + 1}` : title;
    scenes.push({ sceneType: "TEXT", title: sceneTitle, sourcePage: page, payload: {
      textDocument: { version: TEXT_DOCUMENT_VERSION }, layoutVersion: 2,
      bullets: body, searchableText: [title, ...body],
      layout: { version: 2, width: 12192000, height: 6858000, elements: layout(sceneTitle, body) },
    } });
    body = []; units = 0; part++; pendingHeading = false;
  };
  for (const block of blocks) {
    if (block.page !== undefined && page !== undefined && page !== block.page) flush();
    page = block.page ?? page;
    if (block.kind === "heading") {
      flush(); title = clean(block.text); part = 0; pendingHeading = true;
    } else if (block.kind === "paragraph") {
      for (const text of splitDocumentParagraph(block.text)) {
        const cost = Math.max(1, Math.ceil(text.length / 74)) + 1.5;
        if (body.length && units + cost > maxUnits) flush();
        body.push(text); units += cost;
      }
    } else {
      // A heading belongs to the table/figure that follows, rather than an empty slide.
      if (body.length) flush();
      pendingHeading = false;
      if (block.kind === "table") {
        const rows = block.rows.filter(row => row.some(Boolean));
        if (rows.length) scenes.push({ sceneType: "TABLE", title, sourcePage: page, payload: {
          textDocument: { version: TEXT_DOCUMENT_VERSION }, layoutVersion: 2,
          columns: rows[0], rows: rows.slice(1), searchableText: rows.flat(),
          layout: { version: 2, width: 12192000, height: 6858000, elements: [
            { kind: "text", text: title, role: "title", x: .03, y: .02, w: .94, h: .12, z: 0 },
            { kind: "table", columns: rows[0], rows: rows.slice(1), x: .03, y: .17, w: .94, h: .79, z: 1 },
          ] },
        } });
      } else scenes.push({ sceneType: "FIGURE", title, sourcePage: page, payload: { textDocument: { version: TEXT_DOCUMENT_VERSION }, layoutVersion: 2, assetKeys: block.assetKeys } });
    }
    if (scenes.length > 80) throw new Error("O documento gera mais de 80 telas. Divida o arquivo em partes; nenhum conteúdo foi publicado parcialmente.");
  }
  flush();
  if (scenes.length > 80) throw new Error("O documento gera mais de 80 telas. Divida o arquivo em partes; nenhum conteúdo foi publicado parcialmente.");
  return scenes;
}

export function plainTextBlocks(text: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  text.replace(/\r\n?/g, "\n").split("\f").forEach((page, index) => {
    for (const paragraph of page.split(/\n\s*\n/)) {
      let prose = "";
      const flush = () => { if (prose.trim()) blocks.push({ kind: "paragraph", text: clean(prose), page: index + 1 }); prose = ""; };
      for (const line of paragraph.split("\n")) {
        const value = clean(line); if (!value) continue;
        if (isDocumentHeading(value)) { flush(); blocks.push({ kind: "heading", text: value, page: index + 1 }); }
        else if (/^(?:[-•*]|\d+[.)])\s|^[^:]{2,32}:/.test(value)) { flush(); blocks.push({ kind: "paragraph", text: value, page: index + 1 }); }
        else prose += (prose ? " " : "") + value;
      }
      flush();
    }
  });
  return blocks;
}

type PdfItem = { str: string; x: number; y: number; width: number; fontSize: number };
/** Rebuild paragraphs by geometry, retaining repeated lines and all table cells. */
export function pdfTextBlocks(items: PdfItem[], page: number): DocumentBlock[] {
  const ordered = [...items].filter(item => item.str.trim()).sort((a,b) => Math.abs(a.y-b.y) > 2 ? b.y-a.y : a.x-b.x);
  const lines: Array<{ y: number; font: number; cells: string[]; xs: number[] }> = [];
  let right = 0;
  for (const item of ordered) {
    let line = lines.at(-1);
    if (!line || Math.abs(line.y - item.y) > 2) { line = { y: item.y, font: item.fontSize, cells: [], xs: [] }; lines.push(line); right = item.x; }
    line.font = Math.max(line.font, item.fontSize);
    if (!line.cells.length || item.x-right > Math.max(14, item.fontSize*2)) { line.cells.push(item.str); line.xs.push(item.x); }
    else line.cells[line.cells.length-1] += (item.x-right > 1 ? " " : "") + item.str;
    right = item.x + item.width;
  }
  const fonts = items.map(item => item.fontSize).sort((a,b) => a-b), base = fonts[Math.floor(fonts.length / 2)] ?? 12;
  const blocks: DocumentBlock[] = [];
  let paragraph = "", previousY: number | undefined;
  const flush = () => { if (paragraph) blocks.push({ kind: "paragraph", text: clean(paragraph), page }); paragraph = ""; };
  for (let index=0; index<lines.length; index++) {
    const line = lines[index], value = clean(line.cells.join(" "));
    const aligned = (other: typeof line) => other.cells.length === line.cells.length && other.xs.every((x,i) => Math.abs(x-line.xs[i]) < 8);
    const group = [line];
    while (index + group.length < lines.length && aligned(lines[index+group.length]) && group.at(-1)!.y-lines[index+group.length].y < base * 3) group.push(lines[index+group.length]);
    if (line.cells.length >= 2 && group.length >= 3 && group.slice(1).some(row => row.cells.some(cell => /\d/.test(cell)))) {
      flush(); blocks.push({ kind: "table", rows: group.map(row => row.cells.map(clean)), page }); index += group.length-1; previousY = undefined; continue;
    }
    const heading = isDocumentHeading(value) || (line.font > base * 1.18 && value.length <= 130 && !/[.!?;]$/.test(value));
    if (heading) { flush(); blocks.push({ kind: "heading", text: value, page }); }
    else {
      if (previousY !== undefined && previousY-line.y > base * 1.7 || /^(?:[-•*]|\d+[.)])\s|^[^:]{2,32}:/.test(value)) flush();
      paragraph += (paragraph ? " " : "") + value;
    }
    previousY = line.y;
  }
  flush(); return blocks;
}
