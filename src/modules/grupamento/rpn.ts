import * as XLSX from "xlsx";

export type RpnFinancialValues = {
  toLiquidate: number;
  liquidated: number;
  cancelled: number;
};

export type RpnSnapshot = RpnFinancialValues & {
  inscribed: number;
  liquidatedPercent: number;
  cancelledPercent: number;
};

export type RpnRow = RpnFinancialValues & {
  sheet: string;
  ug?: string;
  acronym?: string;
  pi?: string;
  piName?: string;
  reportedInscribed?: number;
  reportedLiquidatedPercent?: number;
  reportedCancelledPercent?: number;
  computed: RpnSnapshot;
  valueDivergence: boolean;
};

export type RpnImportResult = {
  source: {
    fileName: string;
    importedAt: string;
    origin: "MANUAL_RPNP";
    nature: "DADO_IMPORTADO";
  };
  sheets: string[];
  rows: RpnRow[];
  totals: RpnSnapshot;
  byPi: Array<{
    pi: string;
    piName?: string;
    snapshot: RpnSnapshot;
    rowCount: number;
  }>;
  byUg: Array<{
    ug: string;
    acronym?: string;
    snapshot: RpnSnapshot;
    rowCount: number;
  }>;
  warnings: string[];
};

const HEADER_ALIASES = {
  ug: ["UG"],
  acronym: ["NOME_UG", "NOME UG", "SIGLA"],
  pi: ["PI"],
  piName: ["NOME_PI", "NOME PI"],
  inscribed: ["TOTAL_INSCRITO", "TOTAL INSCRITO"],
  toLiquidate: ["TOTAL_A_LIQUIDAR", "TOTAL A LIQUIDAR", "TOTAL_A_LIQUIDA R"],
  liquidated: ["TOTAL_LIQUIDADO", "TOTAL LIQUIDADO"],
  cancelled: ["CANC", "CANCELADO", "TOTAL_CANCELADO", "TOTAL CANCELADO"],
  liquidatedPercent: ["%LIQ", "% LIQ"],
  cancelledPercent: ["%CANC", "% CANC"],
} as const;

type CanonicalHeader = keyof typeof HEADER_ALIASES;
type RowRecord = Record<string, unknown>;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function canonicalHeader(value: unknown): CanonicalHeader | undefined {
  const normalized = normalizeText(value).replace(/_/g, " ");
  return (Object.entries(HEADER_ALIASES) as Array<[CanonicalHeader, readonly string[]]>).find(([, aliases]) =>
    aliases.some((alias) => normalizeText(alias).replace(/_/g, " ") === normalized),
  )?.[0];
}

export function parseRpnNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw
    .replace(/^Σ\s*Tela:\s*/i, "")
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .replace(/%$/, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(value: unknown): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = parseRpnNumber(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function computeRpnSnapshot(values: RpnFinancialValues): RpnSnapshot {
  const inscribed = values.toLiquidate + values.liquidated + values.cancelled;
  return {
    ...values,
    inscribed,
    liquidatedPercent: inscribed > 0 ? (values.liquidated / inscribed) * 100 : 0,
    cancelledPercent: inscribed > 0 ? (values.cancelled / inscribed) * 100 : 0,
  };
}

function sumRows(rows: RpnRow[]): RpnSnapshot {
  return computeRpnSnapshot(
    rows.reduce<RpnFinancialValues>(
      (acc, row) => ({
        toLiquidate: acc.toLiquidate + row.toLiquidate,
        liquidated: acc.liquidated + row.liquidated,
        cancelled: acc.cancelled + row.cancelled,
      }),
      { toLiquidate: 0, liquidated: 0, cancelled: 0 },
    ),
  );
}

function groupRows(rows: RpnRow[], key: "pi" | "ug") {
  const groups = new Map<string, RpnRow[]>();
  for (const row of rows) {
    const value = row[key]?.trim();
    if (!value) continue;
    const current = groups.get(value) ?? [];
    current.push(row);
    groups.set(value, current);
  }
  return groups;
}

function isFooterRow(values: unknown[]) {
  return values.some((value) => /^Σ\s*Tela:/i.test(String(value ?? "").trim())) ||
    values.slice(0, 4).some((value) => normalizeText(value) === "TODOS");
}

function findHeaderRow(matrix: unknown[][]) {
  return matrix.findIndex((row) => {
    const keys = new Set(row.map(canonicalHeader).filter(Boolean));
    return keys.has("inscribed") && keys.has("toLiquidate") && keys.has("liquidated") && keys.has("cancelled");
  });
}

function readSheet(sheetName: string, sheet: XLSX.WorkSheet, warnings: string[]): RpnRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = findHeaderRow(matrix);
  if (headerIndex < 0) {
    warnings.push(`Aba ${sheetName}: cabeçalho RPNP não reconhecido.`);
    return [];
  }

  const canonicalByIndex = matrix[headerIndex].map(canonicalHeader);
  const rows: RpnRow[] = [];

  for (const values of matrix.slice(headerIndex + 1)) {
    if (!values.some((value) => String(value ?? "").trim())) continue;
    if (isFooterRow(values)) continue;

    const record: RowRecord = {};
    canonicalByIndex.forEach((key, index) => {
      if (key) record[key] = values[index];
    });

    const financial: RpnFinancialValues = {
      toLiquidate: parseRpnNumber(record.toLiquidate),
      liquidated: parseRpnNumber(record.liquidated),
      cancelled: parseRpnNumber(record.cancelled),
    };
    const reportedInscribed = parseRpnNumber(record.inscribed);
    if (reportedInscribed === 0 && Object.values(financial).every((value) => value === 0)) continue;

    const computed = computeRpnSnapshot(financial);
    const reportedLiquidatedPercent = parsePercent(record.liquidatedPercent);
    const reportedCancelledPercent = parsePercent(record.cancelledPercent);
    const valueDivergence =
      Math.abs(reportedInscribed - computed.inscribed) > 0.02 ||
      (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2) ||
      (reportedCancelledPercent !== undefined && Math.abs(reportedCancelledPercent - computed.cancelledPercent) > 0.2);

    rows.push({
      sheet: sheetName,
      ug: String(record.ug ?? "").trim() || undefined,
      acronym: String(record.acronym ?? "").trim() || undefined,
      pi: String(record.pi ?? "").trim() || undefined,
      piName: String(record.piName ?? "").trim() || undefined,
      ...financial,
      reportedInscribed,
      reportedLiquidatedPercent,
      reportedCancelledPercent,
      computed,
      valueDivergence,
    });
  }

  return rows;
}

export function buildRpnImportResult(rows: RpnRow[], fileName: string, sheets: string[], warnings: string[]): RpnImportResult {
  const piGroups = groupRows(rows, "pi");
  const ugGroups = groupRows(rows, "ug");
  const divergenceCount = rows.filter((row) => row.valueDivergence).length;
  if (divergenceCount) warnings.push(`${divergenceCount} linha(s) RPNP divergem dos totais/percentuais reportados pela fonte.`);

  return {
    source: {
      fileName,
      importedAt: new Date().toISOString(),
      origin: "MANUAL_RPNP",
      nature: "DADO_IMPORTADO",
    },
    sheets,
    rows,
    totals: sumRows(rows),
    byPi: [...piGroups.entries()]
      .map(([pi, group]) => ({
        pi,
        piName: group.find((row) => row.piName)?.piName,
        snapshot: sumRows(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.inscribed - a.snapshot.inscribed),
    byUg: [...ugGroups.entries()]
      .map(([ug, group]) => ({
        ug,
        acronym: group.find((row) => row.acronym)?.acronym,
        snapshot: sumRows(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.inscribed - a.snapshot.inscribed),
    warnings,
  };
}

export function parseRpnWorkbook(buffer: ArrayBuffer, fileName: string): RpnImportResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];
  const rows = workbook.SheetNames.flatMap((sheetName) => readSheet(sheetName, workbook.Sheets[sheetName], warnings));
  if (!rows.length) warnings.push("Nenhuma linha RPNP válida foi encontrada. A carga não foi tratada como sucesso operacional.");
  return buildRpnImportResult(rows, fileName, workbook.SheetNames, warnings);
}
