import * as XLSX from "xlsx";

export type TgRow = {
  id: string; sheet: string; sourceRow: number; ug: string; om: string;
  pi: string | null; piDescription: string | null; ne: string | null;
  year: string | null; supplier: string | null; nd: string | null;
  ndDescription: string | null; movementCents: number;
};
export type TgReport = {
  schema: "TG_MASTER_V1"; fileName: string; sourceDate: null;
  metric: string; rows: TgRow[]; warnings: string[];
};
const clean = (v: unknown) => String(v ?? "").trim();
const nullable = (v: unknown) => !clean(v) || /^'?\-9$/.test(clean(v)) || clean(v) === "NAO SE APLICA" ? null : clean(v);
export function parseTgWorkbook(buffer: ArrayBuffer, fileName: string): TgReport {
  const workbook = XLSX.read(buffer, { type: "array" });
  const rows: TgRow[] = [];
  const metric = "Movim. Líquido - R$ (Item Informação)";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]!);
    if (range.e.r > 100000 || range.e.c > 100) throw new Error("Relatório TG excede os limites de leitura.");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const header = matrix.findIndex(row => clean(row[0]) === "PI" && clean(row[2]) === "NE CCor" && clean(row[8]) === metric);
    if (header >= 0 && (clean(matrix[header][3]) !== "NE CCor - Ano Emissão" || clean(matrix[header][4]) !== "NE CCor - Favorecido" || clean(matrix[header][6]) !== "Natureza Despesa Detalhada")) throw new Error(`Aba ${sheetName}: colunas TG incompatíveis.`);
    if (header < 0) throw new Error(`Aba ${sheetName}: contrato do relatório mestre TG não reconhecido.`);
    const ugText = matrix.slice(0, header).flat().map(clean).find(v => /^UG Executora:/.test(v));
    const ugMatch = ugText?.match(/^UG Executora:\s*(\d{6})\s*:\s*(.+)$/);
    if (!ugMatch) throw new Error(`Aba ${sheetName}: UG Executora não identificada na fonte.`);
    // Only actual Excel merges propagate identifiers; never fill unrelated blank cells.
    for (const merge of sheet["!merges"] ?? []) {
      if (merge.s.r <= header) continue;
      if (merge.e.r > range.e.r || merge.e.c > range.e.c) throw new Error("Mesclagem TG fora dos limites da planilha.");
      const value = matrix[merge.s.r]?.[merge.s.c];
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          if (c >= 8) throw new Error("Métrica TG mesclada: distribuição de valores ambígua.");
          (matrix[r] ??= [])[c] = value;
        }
      }
    }
    for (let r = header + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.every(v => v == null || v === "")) continue;
      if (row.some(v => /^(total|subtotal)\b/i.test(clean(v)))) throw new Error(`Aba ${sheetName}, linha ${r + 1}: subtotal exige contrato específico.`);
      const value = row[8];
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Aba ${sheetName}, linha ${r + 1}: valor monetário inválido.`);
      const cents = Math.round(value * 100);
      if (!Number.isSafeInteger(cents)) throw new Error("Valor TG fora da precisão monetária suportada.");
      rows.push({ id: `${sheetName}:${r + 1}`, sheet: sheetName, sourceRow: r + 1,
        ug: ugMatch[1], om: ugMatch[2], pi: nullable(row[0]), piDescription: nullable(row[1]),
        ne: nullable(row[2]), year: nullable(row[3]), supplier: nullable(row[5]),
        nd: nullable(row[6]), ndDescription: nullable(row[7]), movementCents: cents });
    }
  }
  if (!rows.length) throw new Error("Relatório TG sem registros.");
  return { schema: "TG_MASTER_V1", fileName, sourceDate: null, metric, rows, warnings: [
    "O relatório informa Movim. Líquido. O Item Informação selecionado não está identificado; não interpretar como crédito disponível, empenhado, liquidado ou pago.",
    "NC, classificação Requisitante/RPCM, metas e saldos próprios de RPNP não são fornecidos por este contrato.",
    "Data de referência contábil não identificada no arquivo; recebimento do e-mail e importação não comprovam atualização dos saldos.",
  ] };
}
