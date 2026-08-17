import * as XLSX from "xlsx";
import { SiafiReportRecord, SiafiIngestionResult } from "./types";

export function parseSiafiBuffer(buffer: Buffer, filename: string): SiafiReportRecord[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  let rows: any[][] = [];

  if (isCsv) {
    const text = buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    rows = lines.map((line) => {
      // Split by tab or semicolon or comma
      if (line.includes("\t")) return line.split("\t");
      if (line.includes(";")) return line.split(";");
      return line.split(",");
    });
  } else {
    // Parse XLSX / XLS using SheetJS
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  }

  if (!rows || rows.length === 0) return [];

  // Locate header row or column indices
  let headerIndex = -1;
  let colUg = -1;
  let colPi = -1;
  let colNe = -1;
  let colNeYear = -1;
  let colSupplier = -1;
  let colExpenseNature = -1;
  let colAmount = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const rowStr = rows[i].map((cell) => String(cell || "").toLowerCase());
    
    for (let c = 0; c < rowStr.length; c++) {
      const val = rowStr[c].trim();
      if (val.includes("ug executora") || val === "ug") colUg = c;
      if (val === "pi" || val.includes("plano interno")) colPi = c;
      if (val.includes("ano emiss") || val.includes("ano emissa")) colNeYear = c;
      else if (val.includes("favorecido") || val.includes("credor")) colSupplier = c;
      else if (val === "ne ccor" || val === "nota de empenho" || (val.includes("ne ccor") && !val.includes("ano") && !val.includes("favorecido"))) colNe = c;
      if (val.includes("natureza despesa") || val.includes("nd")) colExpenseNature = c;
      if (val.includes("movim") || val.includes("líquido") || val.includes("valor") || val.includes("empenhado")) colAmount = c;
    }

    if (colNe !== -1 || colAmount !== -1) {
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
  if (colAmount === -1) colAmount = rows[0] ? rows[0].length - 1 : 6;

  const records: SiafiReportRecord[] = [];
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const neCode = String(row[colNe] || "").trim();
    if (!neCode || neCode.toLowerCase().includes("linhas de dados") || neCode.toLowerCase().includes("detalhes do relatório")) {
      continue;
    }

    const ugCodeRaw = String(row[colUg] || "").trim();
    const ugMatch = ugCodeRaw.match(/\d{6}/);
    const ugCode = ugMatch ? ugMatch[0] : ugCodeRaw || "160136";

    const planningCode = String(row[colPi] || "PI-MCL-2026").trim();

    const neYearRaw = String(row[colNeYear] || "").trim();
    const neYearMatch = neYearRaw.match(/\d{4}/);
    const neYear = neYearMatch ? parseInt(neYearMatch[0], 10) : 2026;
    const isRPNP = neYear < 2026;

    const supplierName = String(row[colSupplier] || "FORNECEDOR DIVERSO").trim();
    const expenseNatureRaw = String(row[colExpenseNature] || "339030").trim();
    const ndMatch = expenseNatureRaw.match(/\d{6}/);
    const expenseNature = ndMatch ? ndMatch[0] : "339030";

    const amountRaw = String(row[colAmount] || "0").replace(/\./g, "").replace(",", ".");
    const amountParsed = parseFloat(amountRaw);
    const amount = isNaN(amountParsed) ? 0 : amountParsed;

    records.push({
      ugCode,
      planningCode,
      neCode,
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
