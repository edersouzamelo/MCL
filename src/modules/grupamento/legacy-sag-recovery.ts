import { z } from "zod";
import { computeRpnSnapshot, type RpnImportResult, type RpnRow } from "@/modules/grupamento/rpn";
import { computeSagSnapshot, type SagImportResult, type SagRow } from "@/modules/grupamento/sag";

const finiteNumber = z.number().refine(Number.isFinite, "Número financeiro inválido.");
const optionalText = z.string().max(500).optional();
const timestamp = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Data de importação inválida.");

const sagSourceSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  importedAt: timestamp,
  origin: z.literal("MANUAL_SAG"),
  nature: z.literal("DADO_IMPORTADO"),
});

const rpnSourceSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  importedAt: timestamp,
  origin: z.literal("MANUAL_RPNP"),
  nature: z.literal("DADO_IMPORTADO"),
});

const sagRowSchema = z.object({
  sheet: z.string().max(255),
  ug: optionalText,
  acronym: optionalText,
  pi: optionalText,
  piName: optionalText,
  expenseNature: optionalText,
  expenseNatureName: optionalText,
  available: finiteNumber,
  toLiquidate: finiteNumber,
  inLiquidation: finiteNumber,
  liquidated: finiteNumber,
  paid: finiteNumber,
  reportedCommittedPercent: finiteNumber.optional(),
  reportedLiquidatedPercent: finiteNumber.optional(),
}).passthrough();

const rpnRowSchema = z.object({
  sheet: z.string().max(255),
  ug: optionalText,
  acronym: optionalText,
  pi: optionalText,
  piName: optionalText,
  toLiquidate: finiteNumber,
  liquidated: finiteNumber,
  cancelled: finiteNumber,
  reportedInscribed: finiteNumber.optional(),
  reportedLiquidatedPercent: finiteNumber.optional(),
  reportedCancelledPercent: finiteNumber.optional(),
}).passthrough();

const sagLegacySchema = z.object({
  source: sagSourceSchema,
  sheets: z.array(z.string().max(255)).max(2000).optional(),
  rows: z.array(sagRowSchema).min(1).max(50000),
  warnings: z.array(z.string().max(2000)).max(2000).optional(),
}).passthrough();

const rpnLegacySchema = z.object({
  source: rpnSourceSchema,
  sheets: z.array(z.string().max(255)).max(2000).optional(),
  rows: z.array(rpnRowSchema).min(1).max(50000),
  warnings: z.array(z.string().max(2000)).max(2000).optional(),
}).passthrough();

const RECOVERY_WARNING = "Snapshot recuperado do armazenamento local legado; o arquivo-fonte não foi relido nesta operação.";

function inferredSheets(rows: Array<{ sheet: string }>) {
  return [...new Set(rows.map((row) => row.sheet).filter(Boolean))];
}

function sumSag(rows: SagRow[]) {
  return computeSagSnapshot(rows.reduce(
    (acc, row) => ({
      available: acc.available + row.available,
      toLiquidate: acc.toLiquidate + row.toLiquidate,
      inLiquidation: acc.inLiquidation + row.inLiquidation,
      liquidated: acc.liquidated + row.liquidated,
      paid: acc.paid + row.paid,
    }),
    { available: 0, toLiquidate: 0, inLiquidation: 0, liquidated: 0, paid: 0 },
  ));
}

function groupSag(rows: SagRow[], key: "pi" | "ug") {
  const groups = new Map<string, SagRow[]>();
  for (const row of rows) {
    const value = row[key]?.trim();
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}

function rebuildSag(input: unknown): SagImportResult {
  const parsed = sagLegacySchema.parse(input);
  const rows: SagRow[] = parsed.rows.map((row) => {
    const computed = computeSagSnapshot({
      available: row.available,
      toLiquidate: row.toLiquidate,
      inLiquidation: row.inLiquidation,
      liquidated: row.liquidated,
      paid: row.paid,
    });
    const percentDivergence =
      (row.reportedCommittedPercent !== undefined && Math.abs(row.reportedCommittedPercent - computed.committedPercent) > 0.2) ||
      (row.reportedLiquidatedPercent !== undefined && Math.abs(row.reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2);

    return {
      sheet: row.sheet,
      ug: row.ug,
      acronym: row.acronym,
      pi: row.pi,
      piName: row.piName,
      expenseNature: row.expenseNature,
      expenseNatureName: row.expenseNatureName,
      available: row.available,
      toLiquidate: row.toLiquidate,
      inLiquidation: row.inLiquidation,
      liquidated: row.liquidated,
      paid: row.paid,
      reportedCommittedPercent: row.reportedCommittedPercent,
      reportedLiquidatedPercent: row.reportedLiquidatedPercent,
      computed,
      percentDivergence,
    };
  });
  const byPi = groupSag(rows, "pi");
  const byUg = groupSag(rows, "ug");

  return {
    source: parsed.source,
    sheets: parsed.sheets?.length ? parsed.sheets : inferredSheets(rows),
    rows,
    totals: sumSag(rows),
    byPi: [...byPi.entries()].map(([pi, group]) => ({
      pi,
      piName: group.find((row) => row.piName)?.piName,
      snapshot: sumSag(group),
      rowCount: group.length,
    })).sort((a, b) => b.snapshot.total - a.snapshot.total),
    byUg: [...byUg.entries()].map(([ug, group]) => ({
      ug,
      acronym: group.find((row) => row.acronym)?.acronym,
      snapshot: sumSag(group),
      rowCount: group.length,
    })).sort((a, b) => b.snapshot.total - a.snapshot.total),
    warnings: [...(parsed.warnings ?? []), RECOVERY_WARNING],
  };
}

function sumRpn(rows: RpnRow[]) {
  return computeRpnSnapshot(rows.reduce(
    (acc, row) => ({
      toLiquidate: acc.toLiquidate + row.toLiquidate,
      liquidated: acc.liquidated + row.liquidated,
      cancelled: acc.cancelled + row.cancelled,
    }),
    { toLiquidate: 0, liquidated: 0, cancelled: 0 },
  ));
}

function groupRpn(rows: RpnRow[], key: "pi" | "ug") {
  const groups = new Map<string, RpnRow[]>();
  for (const row of rows) {
    const value = row[key]?.trim();
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}

function rebuildRpn(input: unknown): RpnImportResult {
  const parsed = rpnLegacySchema.parse(input);
  const rows: RpnRow[] = parsed.rows.map((row) => {
    const computed = computeRpnSnapshot({
      toLiquidate: row.toLiquidate,
      liquidated: row.liquidated,
      cancelled: row.cancelled,
    });
    const valueDivergence =
      (row.reportedInscribed !== undefined && Math.abs(row.reportedInscribed - computed.inscribed) > 0.02) ||
      (row.reportedLiquidatedPercent !== undefined && Math.abs(row.reportedLiquidatedPercent - computed.liquidatedPercent) > 0.2) ||
      (row.reportedCancelledPercent !== undefined && Math.abs(row.reportedCancelledPercent - computed.cancelledPercent) > 0.2);

    return {
      sheet: row.sheet,
      ug: row.ug,
      acronym: row.acronym,
      pi: row.pi,
      piName: row.piName,
      toLiquidate: row.toLiquidate,
      liquidated: row.liquidated,
      cancelled: row.cancelled,
      reportedInscribed: row.reportedInscribed,
      reportedLiquidatedPercent: row.reportedLiquidatedPercent,
      reportedCancelledPercent: row.reportedCancelledPercent,
      computed,
      valueDivergence,
    };
  });
  const byPi = groupRpn(rows, "pi");
  const byUg = groupRpn(rows, "ug");

  return {
    source: parsed.source,
    sheets: parsed.sheets?.length ? parsed.sheets : inferredSheets(rows),
    rows,
    totals: sumRpn(rows),
    byPi: [...byPi.entries()].map(([pi, group]) => ({
      pi,
      piName: group.find((row) => row.piName)?.piName,
      snapshot: sumRpn(group),
      rowCount: group.length,
    })).sort((a, b) => b.snapshot.inscribed - a.snapshot.inscribed),
    byUg: [...byUg.entries()].map(([ug, group]) => ({
      ug,
      acronym: group.find((row) => row.acronym)?.acronym,
      snapshot: sumRpn(group),
      rowCount: group.length,
    })).sort((a, b) => b.snapshot.inscribed - a.snapshot.inscribed),
    warnings: [...(parsed.warnings ?? []), RECOVERY_WARNING],
  };
}

export function recoverLegacySagPair(input: { current: unknown; rpn: unknown }) {
  return {
    current: rebuildSag(input.current),
    rpn: rebuildRpn(input.rpn),
  };
}
