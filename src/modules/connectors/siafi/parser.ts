import * as XLSX from "xlsx";
import { SiafiReportRecord, SiafiIngestionResult } from "./types";
import { setIngestedSiafiRecords } from "./store";

export function parseSiafiBuffer(buffer: Buffer, filename: string): SiafiReportRecord[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  let rows: any[][] = [];

  try {
    if (isCsv) {
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter((l) => typeof l === "string" && l.trim().length > 0);
      rows = lines.map((line) => {
        if (line.includes("\t")) return line.split("\t");
        if (line.includes(";")) return line.split(";");
        return line.split(",");
      });
    } else {
      // Parse XLSX / XLS / HTML tables saved as XLS using SheetJS
      const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName && workbook.Sheets[firstSheetName]) {
        const sheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
      }
    }
  } catch (err) {
    console.error("Erro ao ler buffer do arquivo com SheetJS:", err);
    return [];
  }

  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Locate header row or column indices
  let headerIndex = -1;
  let colUg = -1;
  let colPi = -1;
  let colNe = -1;
  let colNeYear = -1;
  let colSupplier = -1;
  let colExpenseNature = -1;
  let colAmount = -1;

  const maxHeaderCheck = Math.min(rows.length, 30);
  for (let i = 0; i < maxHeaderCheck; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map((cell) => String(cell ?? "").toLowerCase().trim());

    for (let c = 0; c < rowStr.length; c++) {
      const val = rowStr[c] || "";
      if (val.includes("ug executora") || val === "ug" || val.includes("ug ")) colUg = c;
      if (val === "pi" || val.includes("plano interno") || val.includes("pi ")) colPi = c;
      if (val.includes("ano emiss") || val.includes("ano emissa") || val.includes("exercicio")) colNeYear = c;
      else if (val.includes("favorecido") || val.includes("credor") || val.includes("fornecedor")) colSupplier = c;
      else if (val === "ne ccor" || val === "nota de empenho" || val.includes("empenho")) colNe = c;
      if (val.includes("natureza despesa") || val.includes("nd")) colExpenseNature = c;
      if (val.includes("movim") || val.includes("líquido") || val.includes("valor") || val.includes("empenhado") || val.includes("saldo")) colAmount = c;
    }

    if (colNe !== -1 || colAmount !== -1 || colUg !== -1) {
      headerIndex = i;
      break;
    }
  }

  // Fallback defaults if header line was not strictly identified
  if (colUg === -1) colUg = 0;
  if (colPi === -1) colPi = 1;
  if (colNe === -1) colNe = 2;
  if (colNeYear === -1) colNeYear = 3;
  if (colSupplier === -1) colSupplier = 4;
  if (colExpenseNature === -1) colExpenseNature = 5;
  if (colAmount === -1) colAmount = rows[0] && Array.isArray(rows[0]) ? rows[0].length - 1 : 6;

  const records: SiafiReportRecord[] = [];
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawNeCell = String(row[colNe] ?? "").trim();
    if (!rawNeCell || rawNeCell.toLowerCase().includes("linhas de dados") || rawNeCell.toLowerCase().includes("detalhes do relatório") || rawNeCell.toLowerCase().includes("total")) {
      continue;
    }

    const ugCodeRaw = String(row[colUg] ?? "").trim();
    const ugMatch = ugCodeRaw.match(/\d{6}/);
    const ugCode = ugMatch ? ugMatch[0] : ugCodeRaw || "160136";

    const planningCode = String(row[colPi] ?? "PI-MCL-2026").trim() || "PI-MCL-2026";

    const neYearRaw = String(row[colNeYear] ?? "").trim();
    const neYearMatch = neYearRaw.match(/\d{4}/);
    const neYear = neYearMatch ? parseInt(neYearMatch[0], 10) : 2026;
    const isRPNP = neYear < 2026;

    const supplierName = String(row[colSupplier] ?? "FORNECEDOR CADASTRADO").trim() || "FORNECEDOR CADASTRADO";
    const expenseNatureRaw = String(row[colExpenseNature] ?? "339030").trim();
    const ndMatch = expenseNatureRaw.match(/\d{6}/);
    const expenseNature = ndMatch ? ndMatch[0] : "339030";

    const amountCell = String(row[colAmount] ?? "0").trim();
    const amountRaw = amountCell.replace(/\./g, "").replace(",", ".");
    const amountParsed = parseFloat(amountRaw);
    const amount = isNaN(amountParsed) ? 0 : Math.abs(amountParsed);

    records.push({
      ugCode,
      planningCode,
      neCode: rawNeCell,
      neYearIssued: neYear,
      supplierName,
      expenseNature,
      amount,
      isRPNP,
    });
  }

  return records;
}

export function processSiafiIngestion(
  records: SiafiReportRecord[],
  filename: string
): SiafiIngestionResult {
  setIngestedSiafiRecords(records, filename);

  const creditsUpdatedCount = records.length;
  const commitmentsUpdatedCount = records.filter((r) => !r.isRPNP).length;
  const rpnpsUpdatedCount = records.filter((r) => r.isRPNP).length;

  return {
    success: true,
    sourceFilename: filename,
    totalRecordsProcessed: records.length,
    creditsUpdatedCount,
    commitmentsUpdatedCount,
    rpnpsUpdatedCount,
    errors: [],
    ingestedAt: new Date().toISOString(),
  };
}
