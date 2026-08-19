import * as XLSX from "xlsx";

export type SagFinancialValues = {
  available: number;
  toLiquidate: number;
  inLiquidation: number;
  liquidated: number;
  paid: number;
};

export type SagSnapshot = SagFinancialValues & {
  total: number;
  committed: number;
  liquidatedTotal: number;
  committedPercent: number;
  liquidatedPercent: number;
};

export type SagRow = SagFinancialValues & {
  sheet: string;
  ug?: string;
  acronym?: string;
  pi?: string;
  piName?: string;
  expenseNature?: string;
  expenseNatureName?: string;
  reportedCommittedPercent?: number;
  reportedLiquidatedPercent?: number;
  computed: SagSnapshot;
  percentDivergence: boolean;
};

export type SagImportResult = {
  source: {
    fileName: string;
    importedAt: string;
    origin: "MANUAL_SAG";
    nature: "DADO_IMPORTADO";
  };
  sheets: string[];
  rows: SagRow[];
  totals: SagSnapshot;
  byPi: Array<{
    pi: string;
    piName?: string;
    snapshot: SagSnapshot;
    rowCount: number;
  }>;
  byUg: Array<{
    ug: string;
    acronym?: string;
    snapshot: SagSnapshot;
    rowCount: number;
  }>;
  warnings: string[];
};

const HEADER_ALIASES = {
  ug: ["UG"],
  acronym: ["SIGLA", "T_SIGLA"],
  pi: ["PI"],
  piName: ["NOME_PI", "NOME PI"],
  expenseNature: ["ND"],
  expenseNatureName: ["NOME_ND", "NOME ND"],
  available: ["DISPONIVEL", "DISPONÍVEL"],
  toLiquidate: ["A_LIQUIDAR", "A LIQUIDAR"],
  inLiquidation: ["EM_LIQUIDACAO", "EM LIQUIDACAO", "EM LIQUIDAÇÃO"],
  liquidated: ["LIQUIDADO"],
  paid: ["PAGO"],
  committedPercent: ["%EMP", "%EMPENHADO", "% EMPENHADO"],
  liquidatedPercent: ["%LIQ", "%LIQUIDADO", "% LIQUIDADO"],
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

export function parseSagNumber(value: unknown): number {
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
  const parsed = parseSagNumber(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function computeSagSnapshot(values: SagFinancialValues): SagSnapshot {
  const total = values.available + values.toLiquidate + values.inLiquidation + values.liquidated + values.paid;
  const committed = Math.max(0, total - values.available);
  const liquidatedTotal = values.liquidated + values.paid;
  const committedPercent = total > 0 ? (committed / total) * 100 : 0;
  const liquidatedPercent = total > 0 ? (liquidatedTotal / total) * 100 : 0;

  return {
    ...values,
    total,
    committed,
    liquidatedTotal,
    committedPercent,
    liquidatedPercent,
  };
}

function addSnapshots(rows: SagRow[]): SagSnapshot {
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

function groupRows(rows: SagRow[], key: "pi" | "ug") {
  const groups = new Map<string, SagRow[]>();
  for (const row of rows) {
    const value = row[key]?.trim();
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(row);
    groups.set(value, group);
  }
  return groups;
}

function isFooterRow(values: unknown[]) {
  return values.some((value) => /^Σ\s*Tela:/i.test(String(value ?? "").trim())) ||
    values.slice(0, 5).some((value) => normalizeText(value) === "TODOS");
}

function findHeaderRow(matrix: unknown[][]) {
  return matrix.findIndex((row) => {
    const keys = new Set(row.map(canonicalHeader).filter(Boolean));
    return keys.has("available") && keys.has("toLiquidate") && keys.has("liquidated") && keys.has("paid");
  });
}

function readSheet(sheetName: string, sheet: XLSX.WorkSheet, warnings: string[]): SagRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = findHeaderRow(matrix);
  if (headerIndex < 0) {
    warnings.push(`Aba ${sheetName}: cabeçalho financeiro SAG não reconhecido.`);
    return [];
  }

  const canonicalByIndex = matrix[headerIndex].map(canonicalHeader);
  const rows: SagRow[] = [];

  for (const values of matrix.slice(headerIndex + 1)) {
    if (!values.some((value) => String(value ?? "").trim())) continue;
    if (isFooterRow(values)) continue;

    const record: RowRecord = {};
    canonicalByIndex.forEach((key, index) => {
      if (key) record[key] = values[index];
    });

    const financial: SagFinancialValues = {
      available: parseSagNumber(record.available),
      toLiquidate: parseSagNumber(record.toLiquidate),
      inLiquidation: parseSagNumber(record.inLiquidation),
      liquidated: parseSagNumber(record.liquidated),
      paid: parseSagNumber(record.paid),
    };

    if (Object.values(financial).every((value) => value === 0)) continue;

    const computed = computeSagSnapshot(financial);
    const reportedCommittedPercent = parsePercent(record.committedPercent);
    const reportedLiquidatedPercent = parsePercent(record.liquidatedPercent);
    const percentDivergence =
      (reportedCommittedPercent !== undefined && Math.abs(reportedCommittedPercent - computed.committedPercent) > 0.2) ||
      (reportedLiquidatedPercent !== undefined && Math.abs(reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2);

    rows.push({
      sheet: sheetName,
      ug: String(record.ug ?? "").trim() || undefined,
      acronym: String(record.acronym ?? "").trim() || undefined,
      pi: String(record.pi ?? "").trim() || undefined,
      piName: String(record.piName ?? "").trim() || undefined,
      expenseNature: String(record.expenseNature ?? "").trim() || undefined,
      expenseNatureName: String(record.expenseNatureName ?? "").trim() || undefined,
      ...financial,
      reportedCommittedPercent,
      reportedLiquidatedPercent,
      computed,
      percentDivergence,
    });
  }

  return rows;
}

export function parseSagWorkbook(buffer: ArrayBuffer, fileName: string): SagImportResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];
  const rows = workbook.SheetNames.flatMap((sheetName) => readSheet(sheetName, workbook.Sheets[sheetName], warnings));

  if (rows.length === 0) {
    warnings.push("Nenhuma linha financeira válida foi encontrada. A carga não foi tratada como sucesso operacional.");
  }

  const piGroups = groupRows(rows, "pi");
  const ugGroups = groupRows(rows, "ug");

  return {
    source: {
      fileName,
      importedAt: new Date().toISOString(),
      origin: "MANUAL_SAG",
      nature: "DADO_IMPORTADO",
    },
    sheets: workbook.SheetNames,
    rows,
    totals: addSnapshots(rows),
    byPi: [...piGroups.entries()]
      .map(([pi, group]) => ({
        pi,
        piName: group.find((row) => row.piName)?.piName,
        snapshot: addSnapshots(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    byUg: [...ugGroups.entries()]
      .map(([ug, group]) => ({
        ug,
        acronym: group.find((row) => row.acronym)?.acronym,
        snapshot: addSnapshots(group),
        rowCount: group.length,
      }))
      .sort((a, b) => b.snapshot.total - a.snapshot.total),
    warnings,
  };
}
