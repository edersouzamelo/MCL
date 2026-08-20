import { extractTextItems } from "unpdf";
import {
  computeSagSnapshot,
  parseSagNumber,
  type SagFinancialValues,
  type SagImportResult,
  type SagRow,
  type SagSnapshot,
} from "@/modules/grupamento/sag";
import {
  buildRpnImportResult,
  computeRpnSnapshot,
  parseRpnNumber,
  type RpnImportResult,
  type RpnRow,
} from "@/modules/grupamento/rpn";

export type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type PositionedPage = PositionedTextItem[];

type RowBlock = {
  start: PositionedTextItem;
  items: PositionedTextItem[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function compactText(value: unknown) {
  return normalizeText(value).replace(/[^A-Z0-9%]+/g, "");
}

function pageContractText(page: PositionedPage) {
  return compactText(page.map((item) => item.str).join(" "));
}

function hasCurrentContract(page: PositionedPage) {
  const text = pageContractText(page);
  return (
    text.includes("UG") &&
    text.includes("PI") &&
    text.includes("NOMEPI") &&
    text.includes("DISPONIVEL") &&
    text.includes("ALIQUIDAR") &&
    text.includes("EMLIQUIDACAO") &&
    text.includes("LIQUIDADO") &&
    text.includes("PAGO")
  );
}

function hasRpnContract(page: PositionedPage) {
  const text = pageContractText(page);
  return (
    text.includes("UG") &&
    text.includes("PI") &&
    text.includes("NOMEPI") &&
    text.includes("TOTALINSCRITO") &&
    text.includes("TOTALALIQUIDAR") &&
    text.includes("TOTALLIQUIDADO") &&
    text.includes("CANC")
  );
}

function readingOrder(items: PositionedTextItem[]) {
  return [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 1.5) return b.y - a.y;
    return a.x - b.x;
  });
}

function rowBlocks(page: PositionedPage): RowBlock[] {
  const ordered = readingOrder(page).filter((item) => item.str.trim());
  const starts = ordered
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => /^\d{6}$/.test(item.str.trim()));

  return starts.map(({ item: start, index }, position) => {
    const nextIndex = starts[position + 1]?.index ?? ordered.length;
    return {
      start,
      items: ordered.slice(index, nextIndex),
    };
  });
}

function isPiCode(value: string) {
  const text = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    text.length >= 6 &&
    text.length <= 24 &&
    /^[A-Z][A-Z0-9]+$/.test(text) &&
    /[A-Z]/.test(text) &&
    /\d/.test(text)
  );
}

function normalizedPi(value: string) {
  const text = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return isPiCode(text) ? text : undefined;
}

function isMoney(value: string) {
  const text = value.trim().replace(/R\$\s*/gi, "").replace(/\s/g, "");
  return /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(text) || /^-?\d+,\d{2}$/.test(text);
}

function isPercent(value: string) {
  return /^-?\d+(?:[.,]\d+)?%$/.test(value.trim());
}

function sameFinancialLine(item: PositionedTextItem, start: PositionedTextItem) {
  return Math.abs(item.y - start.y) <= 8;
}

function textFromItems(items: PositionedTextItem[]) {
  return readingOrder(items)
    .map((item) => item.str.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function locatePi(block: RowBlock) {
  return block.items.find(
    (item) =>
      item !== block.start &&
      item.x > block.start.x + 8 &&
      sameFinancialLine(item, block.start) &&
      isPiCode(item.str),
  );
}

function rowIdentity(block: RowBlock, expectedMoneyColumns: number) {
  const piItem = locatePi(block);
  if (!piItem) return null;

  const moneyItems = block.items
    .filter((item) => sameFinancialLine(item, block.start) && item.x > piItem.x && isMoney(item.str))
    .sort((a, b) => a.x - b.x);

  if (moneyItems.length < expectedMoneyColumns) return null;

  const financialStartX = moneyItems[0].x;
  const acronym = textFromItems(
    block.items.filter(
      (item) =>
        item !== block.start &&
        item !== piItem &&
        item.x > block.start.x + 1 &&
        item.x < piItem.x - 1 &&
        !isMoney(item.str) &&
        !isPercent(item.str),
    ),
  );
  const piName = textFromItems(
    block.items.filter(
      (item) =>
        item !== block.start &&
        item !== piItem &&
        item.x > piItem.x + 1 &&
        item.x < financialStartX - 1 &&
        !isMoney(item.str) &&
        !isPercent(item.str),
    ),
  );

  const percentItems = block.items
    .filter((item) => sameFinancialLine(item, block.start) && item.x > moneyItems[expectedMoneyColumns - 1].x && isPercent(item.str))
    .sort((a, b) => a.x - b.x);

  return {
    ug: block.start.str.trim(),
    acronym: acronym || undefined,
    pi: normalizedPi(piItem.str),
    piName: piName || undefined,
    moneyItems,
    percentItems,
  };
}

function money(item: PositionedTextItem | undefined, parser: (value: unknown) => number) {
  return parser(item?.str ?? "0");
}

function percent(item: PositionedTextItem | undefined, parser: (value: unknown) => number) {
  if (!item) return undefined;
  return parser(item.str);
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
  if (divergenceCount) {
    warnings.push(`${divergenceCount} linha(s) divergem dos percentuais impressos no PDF; o MCL preserva o cálculo determinístico.`);
  }

  return {
    source: { fileName, importedAt: new Date().toISOString(), origin: "MANUAL_SAG", nature: "DADO_IMPORTADO" },
    sheets: Array.from({ length: totalPages }, (_, index) => `PDF página ${index + 1}`),
    rows,
    totals: addSagSnapshots(rows),
    byPi: [...byPiMap.entries()]
      .map(([pi, group]) => ({
        pi,
        piName: group.find((row) => row.piName)?.piName,
        snapshot: addSagSnapshots(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    byUg: [...byUgMap.entries()]
      .map(([ug, group]) => ({
        ug,
        acronym: group.find((row) => row.acronym)?.acronym,
        snapshot: addSagSnapshots(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    warnings,
  };
}

export function parseCurrentSagPositionedPages(pages: PositionedPage[], fileName: string): SagImportResult {
  const warnings: string[] = [];
  const rows: SagRow[] = [];
  let recognizedPages = 0;

  pages.forEach((page, pageIndex) => {
    if (!hasCurrentContract(page)) {
      warnings.push(`PDF página ${pageIndex + 1}: contrato de exercício corrente não reconhecido.`);
      return;
    }
    recognizedPages += 1;

    for (const block of rowBlocks(page)) {
      const identity = rowIdentity(block, 5);
      if (!identity) continue;
      const [availableItem, toLiquidateItem, inLiquidationItem, liquidatedItem, paidItem] = identity.moneyItems;
      const financial: SagFinancialValues = {
        available: money(availableItem, parseSagNumber),
        toLiquidate: money(toLiquidateItem, parseSagNumber),
        inLiquidation: money(inLiquidationItem, parseSagNumber),
        liquidated: money(liquidatedItem, parseSagNumber),
        paid: money(paidItem, parseSagNumber),
      };
      if (Object.values(financial).every((value) => value === 0)) continue;

      const computed = computeSagSnapshot(financial);
      const reportedCommittedPercent = percent(identity.percentItems[0], parseSagNumber);
      const reportedLiquidatedPercent = percent(identity.percentItems[1], parseSagNumber);
      const percentDivergence =
        (reportedCommittedPercent !== undefined && Math.abs(reportedCommittedPercent - computed.committedPercent) > 0.2) ||
        (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2);

      rows.push({
        sheet: `PDF página ${pageIndex + 1}`,
        ug: identity.ug,
        acronym: identity.acronym,
        pi: identity.pi,
        piName: identity.piName,
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
    if (!hasRpnContract(page)) {
      warnings.push(`PDF página ${pageIndex + 1}: contrato RPNP não reconhecido.`);
      return;
    }
    recognizedPages += 1;

    for (const block of rowBlocks(page)) {
      const identity = rowIdentity(block, 4);
      if (!identity) continue;
      const [inscribedItem, toLiquidateItem, liquidatedItem, cancelledItem] = identity.moneyItems;
      const reportedInscribed = money(inscribedItem, parseRpnNumber);
      const toLiquidate = money(toLiquidateItem, parseRpnNumber);
      const liquidated = money(liquidatedItem, parseRpnNumber);
      const cancelled = money(cancelledItem, parseRpnNumber);
      if (reportedInscribed === 0 && toLiquidate === 0 && liquidated === 0 && cancelled === 0) continue;

      const computed = computeRpnSnapshot({ toLiquidate, liquidated, cancelled });
      const reportedLiquidatedPercent = percent(identity.percentItems[0], parseRpnNumber);
      const reportedCancelledPercent = percent(identity.percentItems[1], parseRpnNumber);
      const valueDivergence =
        Math.abs(reportedInscribed - computed.inscribed) > 0.02 ||
        (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2) ||
        (reportedCancelledPercent !== undefined && Math.abs(reportedCancelledPercent - computed.cancelledPercent) > 0.2);

      rows.push({
        sheet: `PDF página ${pageIndex + 1}`,
        ug: identity.ug,
        acronym: identity.acronym,
        pi: identity.pi,
        piName: identity.piName,
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
  return items.map((page) =>
    page.map((item) => ({
      str: item.str,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    })),
  );
}

export async function parseCurrentSagPdf(buffer: ArrayBuffer, fileName: string) {
  return parseCurrentSagPositionedPages(await extractPositionedPages(buffer), fileName);
}

export async function parseRpnPdf(buffer: ArrayBuffer, fileName: string) {
  return parseRpnPositionedPages(await extractPositionedPages(buffer), fileName);
}
