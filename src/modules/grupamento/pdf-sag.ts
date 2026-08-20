import { extractTextItems } from "unpdf";
import { computeSagSnapshot, parseSagNumber, type SagFinancialValues, type SagImportResult, type SagRow, type SagSnapshot } from "@/modules/grupamento/sag";
import { buildRpnImportResult, computeRpnSnapshot, parseRpnNumber, type RpnImportResult, type RpnRow } from "@/modules/grupamento/rpn";

export type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type PositionedPage = PositionedTextItem[];

type ColumnSpec = {
  key: string;
  aliases: string[];
};

type ColumnAnchor = ColumnSpec & { x: number; headerY: number };

const CURRENT_COLUMNS: ColumnSpec[] = [
  { key: "ug", aliases: ["UG"] },
  { key: "acronym", aliases: ["SIGLA"] },
  { key: "pi", aliases: ["PI"] },
  { key: "piName", aliases: ["NOME_PI", "NOME PI"] },
  { key: "available", aliases: ["DISPONIVEL", "DISPONÍVEL"] },
  { key: "toLiquidate", aliases: ["A_LIQUIDAR", "A LIQUIDAR"] },
  { key: "inLiquidation", aliases: ["EM_LIQUIDACAO", "EM LIQUIDACAO", "EM LIQUIDAÇÃO"] },
  { key: "liquidated", aliases: ["LIQUIDADO"] },
  { key: "paid", aliases: ["PAGO"] },
  { key: "committedPercent", aliases: ["%EMP", "%EMPENHADO"] },
  { key: "liquidatedPercent", aliases: ["%LIQ", "%LIQUIDADO"] },
];

const RPN_COLUMNS: ColumnSpec[] = [
  { key: "ug", aliases: ["UG"] },
  { key: "acronym", aliases: ["NOME_UG", "NOME UG"] },
  { key: "pi", aliases: ["PI"] },
  { key: "piName", aliases: ["NOME_PI", "NOME PI"] },
  { key: "inscribed", aliases: ["TOTAL_INSCRITO", "TOTAL INSCRITO"] },
  { key: "toLiquidate", aliases: ["TOTAL_A_LIQUIDAR", "TOTAL A LIQUIDAR", "TOTAL_A_LIQUIDA", "TOTAL A LIQUIDA"] },
  { key: "liquidated", aliases: ["TOTAL_LIQUIDADO", "TOTAL LIQUIDADO"] },
  { key: "cancelled", aliases: ["CANC", "CANCELADO"] },
  { key: "liquidatedPercent", aliases: ["%LIQ"] },
  { key: "cancelledPercent", aliases: ["%CANC"] },
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function headerMatches(item: PositionedTextItem, aliases: string[]) {
  const normalized = normalizeText(item.str).replace(/_/g, " ");
  return aliases.some((alias) => {
    const expected = normalizeText(alias).replace(/_/g, " ");
    return normalized === expected || (expected.endsWith("LIQUIDA") && normalized.startsWith(expected));
  });
}

function findAnchors(page: PositionedPage, specs: ColumnSpec[]): ColumnAnchor[] | null {
  const anchors: ColumnAnchor[] = [];
  let previousX = -Infinity;

  for (const spec of specs) {
    const candidates = page
      .filter((item) => headerMatches(item, spec.aliases) && item.x > previousX - 2)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const selected = candidates.find((candidate) => candidate.x > previousX + 1) ?? candidates[0];
    if (!selected) return null;
    anchors.push({ ...spec, x: selected.x, headerY: selected.y });
    previousX = selected.x;
  }

  if (!anchors.every((anchor, index) => index === 0 || anchor.x > anchors[index - 1].x)) return null;
  return anchors;
}

function columnIndexForX(x: number, anchors: ColumnAnchor[]) {
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const boundary = (anchors[index].x + anchors[index + 1].x) / 2;
    if (x < boundary) return index;
  }
  return anchors.length - 1;
}

function rowCells(page: PositionedPage, anchors: ColumnAnchor[]) {
  const headerY = Math.max(...anchors.map((anchor) => anchor.headerY));
  const ugX = anchors[0].x;
  const starts = page
    .filter((item) => /^\d{6}$/.test(item.str.trim()) && Math.abs(item.x - ugX) <= 30 && item.y < headerY - 1)
    .sort((a, b) => b.y - a.y);

  return starts.map((start, index) => {
    const nextY = starts[index + 1]?.y ?? -Infinity;
    const cells = Array.from({ length: anchors.length }, () => [] as PositionedTextItem[]);
    for (const item of page) {
      if (item.y > start.y + 3) continue;
      if (item.y <= nextY + 1) continue;
      const column = columnIndexForX(item.x, anchors);
      cells[column].push(item);
    }
    for (const cell of cells) cell.sort((a, b) => b.y - a.y || a.x - b.x);
    return cells;
  });
}

function textFromCell(items: PositionedTextItem[]) {
  return items
    .map((item) => item.str.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function codeFromCell(items: PositionedTextItem[]) {
  const tokens = textFromCell(items).toUpperCase().match(/[A-Z0-9]{6,}/g) ?? [];
  return tokens[0];
}

function moneyFromCell(items: PositionedTextItem[], parser: (value: unknown) => number) {
  const candidate = items
    .map((item) => item.str.trim())
    .find((value) => /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(value) || /^-?\d+,\d{2}$/.test(value));
  return parser(candidate ?? "0");
}

function percentFromCell(items: PositionedTextItem[], parser: (value: unknown) => number) {
  const candidate = items.map((item) => item.str.trim()).find((value) => /^-?\d+(?:[.,]\d+)?%$/.test(value));
  return candidate ? parser(candidate) : undefined;
}

function addSagSnapshots(rows: SagRow[]): SagSnapshot {
  return computeSagSnapshot(
    rows.reduce<SagFinancialValues>(
      (acc, row) => ({
        available: acc.available + row.available,
        toLiquidate: acc.toLiquidate + row.toLiquidate,
        inLiquidation: acc.inLiquidation + row.inLiquidation,
        liquidated: acc.liquidated + row.liquidated,
        paid: acc.paid + row.paid,
      }),
      { available: 0, toLiquidate: 0, inLiquidation: 0, liquidated: 0, paid: 0 },
    ),
  );
}

function buildSagPdfResult(rows: SagRow[], fileName: string, totalPages: number, warnings: string[]): SagImportResult {
  const byPiMap = new Map<string, SagRow[]>();
  const byUgMap = new Map<string, SagRow[]>();
  for (const row of rows) {
    if (row.pi) byPiMap.set(row.pi, [...(byPiMap.get(row.pi) ?? []), row]);
    if (row.ug) byUgMap.set(row.ug, [...(byUgMap.get(row.ug) ?? []), row]);
  }
  const divergenceCount = rows.filter((row) => row.percentDivergence).length;
  if (divergenceCount) warnings.push(`${divergenceCount} linha(s) divergem dos percentuais impressos no PDF; o MCL preserva o cálculo determinístico.`);

  return {
    source: { fileName, importedAt: new Date().toISOString(), origin: "MANUAL_SAG", nature: "DADO_IMPORTADO" },
    sheets: Array.from({ length: totalPages }, (_, index) => `PDF página ${index + 1}`),
    rows,
    totals: addSagSnapshots(rows),
    byPi: [...byPiMap.entries()]
      .map(([pi, group]) => ({ pi, piName: group.find((row) => row.piName)?.piName, snapshot: addSagSnapshots(group), rowCount: group.length }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    byUg: [...byUgMap.entries()]
      .map(([ug, group]) => ({ ug, acronym: group.find((row) => row.acronym)?.acronym, snapshot: addSagSnapshots(group), rowCount: group.length }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    warnings,
  };
}

export function parseCurrentSagPositionedPages(pages: PositionedPage[], fileName: string): SagImportResult {
  const warnings: string[] = [];
  const rows: SagRow[] = [];
  let recognizedPages = 0;

  pages.forEach((page, pageIndex) => {
    const anchors = findAnchors(page, CURRENT_COLUMNS);
    if (!anchors) {
      warnings.push(`PDF página ${pageIndex + 1}: cabeçalho de exercício corrente não reconhecido.`);
      return;
    }
    recognizedPages += 1;

    for (const cells of rowCells(page, anchors)) {
      const financial: SagFinancialValues = {
        available: moneyFromCell(cells[4], parseSagNumber),
        toLiquidate: moneyFromCell(cells[5], parseSagNumber),
        inLiquidation: moneyFromCell(cells[6], parseSagNumber),
        liquidated: moneyFromCell(cells[7], parseSagNumber),
        paid: moneyFromCell(cells[8], parseSagNumber),
      };
      if (Object.values(financial).every((value) => value === 0)) continue;

      const computed = computeSagSnapshot(financial);
      const reportedCommittedPercent = percentFromCell(cells[9], parseSagNumber);
      const reportedLiquidatedPercent = percentFromCell(cells[10], parseSagNumber);
      const percentDivergence =
        (reportedCommittedPercent !== undefined && Math.abs(reportedCommittedPercent - computed.committedPercent) > 0.2) ||
        (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2);

      rows.push({
        sheet: `PDF página ${pageIndex + 1}`,
        ug: /^\d{6}$/.test(textFromCell(cells[0])) ? textFromCell(cells[0]) : undefined,
        acronym: textFromCell(cells[1]) || undefined,
        pi: codeFromCell(cells[2]),
        piName: textFromCell(cells[3]) || undefined,
        ...financial,
        reportedCommittedPercent,
        reportedLiquidatedPercent,
        computed,
        percentDivergence,
      });
    }
  });

  if (!recognizedPages) warnings.push("O PDF não apresenta o contrato de Exercício Corrente esperado pelo MCL.");
  if (!rows.length) warnings.push("Nenhuma linha financeira válida de Exercício Corrente foi encontrada.");
  return buildSagPdfResult(rows, fileName, pages.length, warnings);
}

export function parseRpnPositionedPages(pages: PositionedPage[], fileName: string): RpnImportResult {
  const warnings: string[] = [];
  const rows: RpnRow[] = [];
  let recognizedPages = 0;

  pages.forEach((page, pageIndex) => {
    const anchors = findAnchors(page, RPN_COLUMNS);
    if (!anchors) {
      warnings.push(`PDF página ${pageIndex + 1}: cabeçalho RPNP não reconhecido.`);
      return;
    }
    recognizedPages += 1;

    for (const cells of rowCells(page, anchors)) {
      const toLiquidate = moneyFromCell(cells[5], parseRpnNumber);
      const liquidated = moneyFromCell(cells[6], parseRpnNumber);
      const cancelled = moneyFromCell(cells[7], parseRpnNumber);
      const reportedInscribed = moneyFromCell(cells[4], parseRpnNumber);
      if (reportedInscribed === 0 && toLiquidate === 0 && liquidated === 0 && cancelled === 0) continue;

      const computed = computeRpnSnapshot({ toLiquidate, liquidated, cancelled });
      const reportedLiquidatedPercent = percentFromCell(cells[8], parseRpnNumber);
      const reportedCancelledPercent = percentFromCell(cells[9], parseRpnNumber);
      const valueDivergence =
        Math.abs(reportedInscribed - computed.inscribed) > 0.02 ||
        (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2) ||
        (reportedCancelledPercent !== undefined && Math.abs(reportedCancelledPercent - computed.cancelledPercent) > 0.2);

      rows.push({
        sheet: `PDF página ${pageIndex + 1}`,
        ug: /^\d{6}$/.test(textFromCell(cells[0])) ? textFromCell(cells[0]) : undefined,
        acronym: textFromCell(cells[1]) || undefined,
        pi: codeFromCell(cells[2]),
        piName: textFromCell(cells[3]) || undefined,
        toLiquidate,
        liquidated,
        cancelled,
        reportedInscribed,
        reportedLiquidatedPercent,
        reportedCancelledPercent,
        computed,
        valueDivergence,
      });
    }
  });

  if (!recognizedPages) warnings.push("O PDF não apresenta o contrato RPNP esperado pelo MCL.");
  if (!rows.length) warnings.push("Nenhuma linha financeira válida de RPNP foi encontrada.");
  return buildRpnImportResult(rows, fileName, pages.map((_, index) => `PDF página ${index + 1}`), warnings);
}

async function extractPositionedPages(buffer: ArrayBuffer) {
  const { items } = await extractTextItems(new Uint8Array(buffer));
  return items.map((page) => page.map((item) => ({ str: item.str, x: item.x, y: item.y, width: item.width, height: item.height })));
}

export async function parseCurrentSagPdf(buffer: ArrayBuffer, fileName: string) {
  return parseCurrentSagPositionedPages(await extractPositionedPages(buffer), fileName);
}

export async function parseRpnPdf(buffer: ArrayBuffer, fileName: string) {
  return parseRpnPositionedPages(await extractPositionedPages(buffer), fileName);
}
