import * as XLSX from "xlsx";

export type TgRow = {
  id: string; sheet: string; sourceRow: number; ug: string; om: string;
  pi: string | null; piDescription: string | null;
  action: string | null; actionDescription: string | null;
  fundingSource: string | null; fundingSourceDescription: string | null;
  responsibleUg: string | null; responsibleUgDescription: string | null;
  ptres: string | null; itemCode: string | null; itemDescription: string | null;
  nd: string | null; ndDescription: string | null;
  ne: string | null; year: string | null; supplier: string | null;
  neDescription: string | null; neAdditionalInformation: string | null;
  biddingModality: string | null; processNumber: string | null; neType: string | null;
  neDay: string | null; neMonth: string | null;
  nc: string | null; ncDescription: string | null; ncOperation: string | null;
  ncStatus: string | null; ncDecentralizationType: string | null; ncTransfer: string | null;
  ncYear: string | null; ncDay: string | null; ncMonth: string | null;
  ro: string | null; roAdditionalInformation: string | null;
  roWebDocumentType: string | null; roWebDocument: string | null;
  document: string | null; documentObservation: string | null;
  documentType: string | null; documentTypeDescription: string | null;
  documentValueCents: number | null; documentYear: string | null;
  documentDay: string | null; documentMonth: string | null;
  movementCents: number;
  level: "PI_SUMMARY" | "NE_DETAIL" | "NC_DETAIL" | "RPNP_DETAIL";
  piExplicit: boolean; neExplicit: boolean;
};

export type TgReport = {
  schema: "TG_MASTER_V1" | "TG_MASTER_V2";
  fileName: string; sourceDate: null; parserVersion: 3;
  metric: string; rows: TgRow[]; warnings: string[];
};

const METRIC = "Movim. Líquido - R$ (Item Informação)";
const clean = (value: unknown) => String(value ?? "").trim();
const nullable = (value: unknown) => {
  const text = clean(value);
  return !text || /^'?\-9$/.test(text) || text === "NAO SE APLICA" || text === "SEM INFORMACAO" ? null : text;
};
const moneyCents = (value: unknown, sheet: string, row: number, optional = false) => {
  if (optional && (value == null || value === "")) return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(numeric)) throw new Error(`Aba ${sheet}, linha ${row}: valor monetário inválido.`);
  const result = Math.round(numeric * 100);
  if (!Number.isSafeInteger(result)) throw new Error("Valor TG fora da precisão monetária suportada.");
  return result;
};

function blankRow(base: Pick<TgRow, "id" | "sheet" | "sourceRow" | "ug" | "om" | "movementCents">): TgRow {
  return {
    ...base,
    pi: null, piDescription: null, action: null, actionDescription: null,
    fundingSource: null, fundingSourceDescription: null, responsibleUg: null,
    responsibleUgDescription: null, ptres: null, itemCode: null, itemDescription: null,
    nd: null, ndDescription: null, ne: null, year: null, supplier: null,
    neDescription: null, neAdditionalInformation: null, biddingModality: null,
    processNumber: null, neType: null, neDay: null, neMonth: null, nc: null,
    ncDescription: null, ncOperation: null, ncStatus: null,
    ncDecentralizationType: null, ncTransfer: null, ncYear: null, ncDay: null,
    ncMonth: null, ro: null, roAdditionalInformation: null, roWebDocumentType: null,
    roWebDocument: null, document: null, documentObservation: null, documentType: null,
    documentTypeDescription: null, documentValueCents: null, documentYear: null,
    documentDay: null, documentMonth: null, level: "PI_SUMMARY", piExplicit: false,
    neExplicit: false,
  };
}

function parseV2(matrix: unknown[][], sheetName: string, header: number): TgRow[] {
  const rows: TgRow[] = [];
  const prior: Record<number, string | null> = {};
  const inherited = (source: unknown[], column: number) => {
    const raw = clean(source[column]);
    if (!raw) return prior[column] ?? null;
    const value = nullable(source[column]);
    prior[column] = value;
    return value;
  };
  for (let index = header + 1; index < matrix.length; index++) {
    const source = matrix[index] ?? [];
    if (source.every(value => value == null || value === "")) continue;
    if (source.some(value => /^(total|subtotal)\b/i.test(clean(value)))) throw new Error(`Aba ${sheetName}, linha ${index + 1}: subtotal exige contrato específico.`);
    const movementCents = moneyCents(source[49], sheetName, index + 1) as number;
    const ug = inherited(source, 0);
    if (!ug) throw new Error(`Aba ${sheetName}, linha ${index + 1}: UG Executora ausente.`);
    const ne = inherited(source, 15);
    const nc = inherited(source, 28);
    const ro = inherited(source, 37);
    const itemCode = inherited(source, 11);
    const row = blankRow({ id: `${sheetName}:${index + 1}`, sheet: sheetName, sourceRow: index + 1, ug, om: inherited(source, 1) ?? "UG sem descrição", movementCents });
    Object.assign(row, {
      pi: inherited(source, 2), piDescription: inherited(source, 3),
      action: inherited(source, 4), actionDescription: inherited(source, 5),
      fundingSource: inherited(source, 6), fundingSourceDescription: inherited(source, 7),
      responsibleUg: inherited(source, 8), responsibleUgDescription: inherited(source, 9),
      ptres: inherited(source, 10), itemCode, itemDescription: inherited(source, 12),
      nd: inherited(source, 13), ndDescription: inherited(source, 14), ne,
      year: inherited(source, 16), supplier: inherited(source, 18),
      neDescription: inherited(source, 19), neAdditionalInformation: inherited(source, 20),
      biddingModality: inherited(source, 21), processNumber: inherited(source, 23),
      neType: inherited(source, 24), neDay: inherited(source, 26), neMonth: inherited(source, 27),
      nc, ncDescription: inherited(source, 29), ncOperation: inherited(source, 30),
      ncStatus: inherited(source, 31), ncDecentralizationType: inherited(source, 32),
      ncTransfer: inherited(source, 33), ncYear: inherited(source, 34),
      ncDay: inherited(source, 35), ncMonth: inherited(source, 36), ro,
      roAdditionalInformation: inherited(source, 38), roWebDocumentType: inherited(source, 39),
      roWebDocument: inherited(source, 40), document: inherited(source, 41),
      documentObservation: inherited(source, 42), documentType: inherited(source, 43),
      documentTypeDescription: inherited(source, 44),
      documentValueCents: moneyCents(source[45], sheetName, index + 1, true),
      documentYear: inherited(source, 46), documentDay: inherited(source, 47),
      documentMonth: inherited(source, 48),
      level: ne ? "NE_DETAIL" : nc ? "NC_DETAIL" : ro || (itemCode && Number(itemCode) >= 40 && Number(itemCode) <= 47) ? "RPNP_DETAIL" : "PI_SUMMARY",
      piExplicit: nullable(source[2]) !== null,
      neExplicit: nullable(source[15]) !== null,
    });
    rows.push(row);
  }
  return rows;
}

function parseV1(matrix: unknown[][], sheet: XLSX.WorkSheet, sheetName: string, header: number): TgRow[] {
  const ugText = matrix.slice(0, header).flat().map(clean).find(value => /^UG Executora:/.test(value));
  const ugMatch = ugText?.match(/^UG Executora:\s*(\d{6})\s*:\s*(.+)$/);
  if (!ugMatch) throw new Error(`Aba ${sheetName}: UG Executora não identificada na fonte.`);
  const explicitPiRows = new Set(matrix.flatMap((row, index) => index > header && nullable(row[0]) ? [index] : []));
  const explicitNeRows = new Set(matrix.flatMap((row, index) => index > header && nullable(row[2]) ? [index] : []));
  for (const merge of sheet["!merges"] ?? []) {
    if (merge.s.r <= header) continue;
    const value = matrix[merge.s.r]?.[merge.s.c];
    for (let r = merge.s.r; r <= merge.e.r; r++) for (let c = merge.s.c; c <= merge.e.c; c++) (matrix[r] ??= [])[c] = value;
  }
  const rows: TgRow[] = [];
  let pi: string | null = null, piDescription: string | null = null;
  let ne: string | null = null, year: string | null = null, supplier: string | null = null;
  for (let index = header + 1; index < matrix.length; index++) {
    const source = matrix[index] ?? [];
    if (source.every(value => value == null || value === "")) continue;
    const piExplicit = explicitPiRows.has(index);
    if (piExplicit) { pi = nullable(source[0]); piDescription = nullable(source[1]); ne = year = supplier = null; }
    const neExplicit = explicitNeRows.has(index);
    if (neExplicit) { ne = nullable(source[2]); year = nullable(source[3]); supplier = nullable(source[5]); }
    const row = blankRow({ id: `${sheetName}:${index + 1}`, sheet: sheetName, sourceRow: index + 1, ug: ugMatch[1], om: ugMatch[2], movementCents: moneyCents(source[8], sheetName, index + 1) as number });
    Object.assign(row, { pi, piDescription, ne, year, supplier, nd: nullable(source[6]), ndDescription: nullable(source[7]), level: ne ? "NE_DETAIL" : "PI_SUMMARY", piExplicit, neExplicit });
    rows.push(row);
  }
  return rows;
}

export function parseTgWorkbook(buffer: ArrayBuffer, fileName: string): TgReport {
  const workbook = XLSX.read(buffer, { type: "array" });
  const rows: TgRow[] = [];
  let schema: TgReport["schema"] | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    if (range.e.r > 100000 || range.e.c > 100) throw new Error("Relatório TG excede os limites de leitura.");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
    const v2Header = matrix.findIndex(row => clean(row[0]) === "UG Executora" && clean(row[11]) === "Item Informação" && clean(row[49]) === METRIC);
    const v1Header = matrix.findIndex(row => clean(row[0]) === "PI" && clean(row[2]) === "NE CCor" && clean(row[8]) === METRIC);
    if (v2Header >= 0) {
      if (schema && schema !== "TG_MASTER_V2") throw new Error("Não é permitido misturar contratos TG V1 e V2 no mesmo arquivo.");
      schema = "TG_MASTER_V2";
      rows.push(...parseV2(matrix, sheetName, v2Header));
    } else if (v1Header >= 0) {
      if (schema && schema !== "TG_MASTER_V1") throw new Error("Não é permitido misturar contratos TG V1 e V2 no mesmo arquivo.");
      schema = "TG_MASTER_V1";
      rows.push(...parseV1(matrix, sheet, sheetName, v1Header));
    } else throw new Error(`Aba ${sheetName}: contrato do relatório mestre TG não reconhecido.`);
  }
  if (!rows.length || !schema) throw new Error("Relatório TG sem registros.");
  const warnings = schema === "TG_MASTER_V2" ? [
    "Doc - Valor é preservado apenas para auditoria documental e não compõe indicadores contábeis.",
    "UG Executora representa a unidade administrativa. A OM beneficiária/requisitante ainda depende de classificação própria do MCL/SAG.",
    "Metas e pregões SRP dependem de fontes próprias e não são inferidos deste relatório.",
  ] : [
    "O Item Informação não está identificado neste contrato legado; não interpretar Movim. Líquido como saldo contábil específico.",
    "NC, classificação da OM beneficiária/requisitante, metas e saldos próprios de RPNP não são fornecidos pelo contrato legado.",
  ];
  return { schema, parserVersion: 3, fileName, sourceDate: null, metric: METRIC, rows, warnings };
}
