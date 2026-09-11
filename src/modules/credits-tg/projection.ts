import type { TgReport, TgRow } from "./parser";

export type TgPiNdMovement = Pick<TgRow, "id" | "ug" | "om" | "pi" | "piDescription" | "nd" | "ndDescription" | "movementCents" | "sheet" | "sourceRow">;
export type TgNeMovement = Pick<TgRow, "id" | "ug" | "om" | "pi" | "ne" | "year" | "supplier" | "nd" | "ndDescription" | "movementCents" | "sheet" | "sourceRow">;

const isDetailedNd = (nd: string | null) => Boolean(nd && /^\d{8}$/.test(nd));

/**
 * Produces only views that the current TG_MASTER_V1 can support without
 * relabelling Movim. Líquido as provision, commitment, liquidation or RPNP.
 * PI/ND summaries and NE details are mutually exclusive grains.
 */
export function projectTgOperational(report: Pick<TgReport, "rows"> | null) {
  const rows = report?.rows ?? [];
  const currentYear = rows.reduce<number | null>((latest, row) => {
    const year = row.year && /^\d{4}$/.test(row.year) ? Number(row.year) : null;
    return year == null ? latest : Math.max(latest ?? year, year);
  }, null);

  const piNdMovements: TgPiNdMovement[] = rows.filter(
    (row): row is TgRow & { pi: string; nd: string } => !row.ne && Boolean(row.pi) && isDetailedNd(row.nd),
  );
  const neMovements: TgNeMovement[] = rows.filter(
    (row): row is TgRow & { ne: string; nd: string } => Boolean(row.ne) && isDetailedNd(row.nd) && (currentYear == null || row.year === String(currentYear)),
  );

  return {
    currentYear,
    piNdMovements,
    neMovements,
    ugCount: new Set(rows.map(row => row.ug)).size,
    piCount: new Set(rows.flatMap(row => row.pi ? [`${row.ug}:${row.pi}`] : [])).size,
    neCount: new Set(neMovements.map(row => `${row.ug}:${row.ne}`)).size,
    sourceRowCount: rows.length,
    piNdMovementCents: piNdMovements.reduce((sum, row) => sum + row.movementCents, 0),
    neMovementCents: neMovements.reduce((sum, row) => sum + row.movementCents, 0),
  };
}
