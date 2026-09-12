import type { TgReport, TgRow } from "./parser";

export const TG_ITEM = {
  provisionReceived: "15", provisionGranted: "16", available: "19",
  committed: "29", committedToLiquidate: "30", liquidated: "31",
  liquidatedToPay: "32", paid: "34", rpnpRegistered: "40",
  rpnpReinscribed: "41", rpnpCancelled: "42", rpnpToLiquidate: "43",
  rpnpLiquidated: "44", rpnpLiquidatedToPay: "45", rpnpPaid: "46",
  rpnpPayable: "47", provisionUpdated: "91",
} as const;

export type TgPiNdMovement = Pick<TgRow, "id" | "ug" | "om" | "pi" | "piDescription" | "nd" | "ndDescription" | "movementCents" | "sheet" | "sourceRow">;
export type TgNeMovement = Pick<TgRow, "id" | "ug" | "om" | "pi" | "ne" | "year" | "supplier" | "nd" | "ndDescription" | "movementCents" | "sheet" | "sourceRow">;
export type TgNcProjection = {
  id: string; ug: string; om: string; nc: string; date: string; action: string;
  ro: string; purpose: string; pi: string; nd: string;
  provisionReceivedCents: number; provisionGrantedCents: number;
  provisionUpdatedCents: number; availableCreditCents: number;
};
export type TgNeProjection = {
  id: string; ug: string; om: string; ne: string; year: string; date: string;
  supplier: string; pi: string; nd: string; ndDescription: string;
  description: string; processNumber: string; biddingModality: string;
  committedCents: number; committedToLiquidateCents: number;
  liquidatedCents: number; liquidatedToPayCents: number; paidCents: number;
};
export type TgRpnpProjection = {
  id: string; ug: string; om: string; ne: string; supplier: string; date: string;
  pi: string; nd: string; registeredCents: number; reinscribedCents: number;
  cancelledCents: number; toLiquidateCents: number; liquidatedCents: number;
  liquidatedToPayCents: number; paidCents: number; payableCents: number;
};

const isDetailedNd = (nd: string | null) => Boolean(nd && /^\d{8}$/.test(nd));
const sum = (rows: TgRow[], code: string) => rows.reduce((total, row) => total + (row.itemCode === code ? row.movementCents : 0), 0);
const ratio = (numerator: number, denominator: number) => denominator === 0 ? null : numerator / denominator;
const text = (value: string | null) => value ?? "—";

function group<T>(rows: TgRow[], key: (row: TgRow) => string, project: (groupRows: TgRow[], first: TgRow, id: string) => T): T[] {
  const groups = new Map<string, TgRow[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return [...groups.entries()].map(([id, groupRows]) => project(groupRows, groupRows[0], id));
}

export function projectTgOperational(report: Pick<TgReport, "rows"> | null) {
  const rows = report?.rows ?? [];
  const currentYear = rows.reduce<number | null>((latest, row) => {
    const candidate = row.year && /^\d{4}$/.test(row.year) ? Number(row.year) : null;
    return candidate == null ? latest : Math.max(latest ?? candidate, candidate);
  }, null);
  const piNdMovements: TgPiNdMovement[] = rows.filter(row => !row.itemCode && !row.ne && Boolean(row.pi) && isDetailedNd(row.nd));
  const neMovements: TgNeMovement[] = rows.filter(row => !row.itemCode && Boolean(row.ne) && isDetailedNd(row.nd) && (currentYear == null || row.year === String(currentYear)));

  const ncCodes: Set<string> = new Set([TG_ITEM.provisionReceived, TG_ITEM.provisionGranted, TG_ITEM.available, TG_ITEM.provisionUpdated]);
  const ncMovements = group(rows.filter(row => row.nc && row.itemCode && ncCodes.has(row.itemCode)),
    row => [row.ug, row.nc, row.pi, row.nd].join("|"),
    (items, first, id): TgNcProjection => ({
      id, ug: first.ug, om: first.om, nc: text(first.nc), date: text(first.ncDay),
      action: text(first.action), ro: text(first.ro), purpose: text(first.ncDescription),
      pi: text(first.pi), nd: text(first.nd),
      provisionReceivedCents: sum(items, TG_ITEM.provisionReceived),
      provisionGrantedCents: sum(items, TG_ITEM.provisionGranted),
      provisionUpdatedCents: sum(items, TG_ITEM.provisionUpdated),
      availableCreditCents: sum(items, TG_ITEM.available),
    }));

  const neCodes: Set<string> = new Set([TG_ITEM.committed, TG_ITEM.committedToLiquidate, TG_ITEM.liquidated, TG_ITEM.liquidatedToPay, TG_ITEM.paid]);
  const neExecution = group(rows.filter(row => row.ne && row.itemCode && neCodes.has(row.itemCode)),
    row => [row.ug, row.ne, row.pi, row.nd].join("|"),
    (items, first, id): TgNeProjection => ({
      id, ug: first.ug, om: first.om, ne: text(first.ne), year: text(first.year), date: text(first.neDay ?? first.documentDay),
      supplier: text(first.supplier), pi: text(first.pi), nd: text(first.nd),
      ndDescription: text(first.ndDescription), description: text(first.neDescription),
      processNumber: text(first.processNumber), biddingModality: text(first.biddingModality),
      committedCents: sum(items, TG_ITEM.committed),
      committedToLiquidateCents: sum(items, TG_ITEM.committedToLiquidate),
      liquidatedCents: sum(items, TG_ITEM.liquidated),
      liquidatedToPayCents: sum(items, TG_ITEM.liquidatedToPay),
      paidCents: sum(items, TG_ITEM.paid),
    }));

  const rpnpCodes: Set<string> = new Set([TG_ITEM.rpnpRegistered, TG_ITEM.rpnpReinscribed, TG_ITEM.rpnpCancelled, TG_ITEM.rpnpToLiquidate, TG_ITEM.rpnpLiquidated, TG_ITEM.rpnpLiquidatedToPay, TG_ITEM.rpnpPaid, TG_ITEM.rpnpPayable]);
  const rpnpMovements = group(rows.filter(row => row.itemCode && rpnpCodes.has(row.itemCode)),
    row => [row.ug, row.ne, row.pi, row.nd].join("|"),
    (items, first, id): TgRpnpProjection => ({
      id, ug: first.ug, om: first.om, ne: text(first.ne), supplier: text(first.supplier), date: text(first.documentDay ?? first.neDay),
      pi: text(first.pi), nd: text(first.nd),
      registeredCents: sum(items, TG_ITEM.rpnpRegistered), reinscribedCents: sum(items, TG_ITEM.rpnpReinscribed),
      cancelledCents: sum(items, TG_ITEM.rpnpCancelled), toLiquidateCents: sum(items, TG_ITEM.rpnpToLiquidate),
      liquidatedCents: sum(items, TG_ITEM.rpnpLiquidated), liquidatedToPayCents: sum(items, TG_ITEM.rpnpLiquidatedToPay),
      paidCents: sum(items, TG_ITEM.rpnpPaid), payableCents: sum(items, TG_ITEM.rpnpPayable),
    }));

  const provisionUpdatedCents = sum(rows, TG_ITEM.provisionUpdated);
  const committedCents = sum(rows, TG_ITEM.committed);
  const liquidatedCents = sum(rows, TG_ITEM.liquidated);
  const availableCreditCents = sum(rows, TG_ITEM.available);
  const committedToLiquidateCents = sum(rows, TG_ITEM.committedToLiquidate);
  const rpnpRegisteredCents = sum(rows, TG_ITEM.rpnpRegistered) + sum(rows, TG_ITEM.rpnpReinscribed);
  const rpnpLiquidatedCents = sum(rows, TG_ITEM.rpnpLiquidated);
  const rpnpCancelledCents = sum(rows, TG_ITEM.rpnpCancelled);
  const rpnpToLiquidateCents = sum(rows, TG_ITEM.rpnpToLiquidate);
  return {
    currentYear, piNdMovements, neMovements, ncMovements, neExecution, rpnpMovements,
    ugOptions: [...new Map(rows.map(row => [row.ug, { ug: row.ug, om: row.om }])).values()].sort((a, b) => a.ug.localeCompare(b.ug)),
    ndOptions: [...new Set(rows.flatMap(row => row.nd ? [row.nd] : []))].sort(),
    ugCount: new Set(rows.map(row => row.ug)).size,
    piCount: new Set(rows.flatMap(row => row.pi ? [`${row.ug}:${row.pi}`] : [])).size,
    neCount: new Set((neExecution.length ? neExecution : neMovements).map(row => `${row.ug}:${row.ne}`)).size,
    sourceRowCount: rows.length,
    piNdMovementCents: piNdMovements.reduce((total, row) => total + row.movementCents, 0),
    neMovementCents: neMovements.reduce((total, row) => total + row.movementCents, 0),
    kpis: {
      provisionUpdatedCents, committedCents, availableCreditCents, liquidatedCents,
      committedToLiquidateCents, paidCents: sum(rows, TG_ITEM.paid),
      committedRatio: ratio(committedCents, provisionUpdatedCents),
      liquidatedRatio: ratio(liquidatedCents, provisionUpdatedCents),
      rpnpRegisteredCents, rpnpLiquidatedCents, rpnpCancelledCents, rpnpToLiquidateCents,
      availableReconciliationCents: availableCreditCents - (provisionUpdatedCents - committedCents),
      committedToLiquidateReconciliationCents: committedToLiquidateCents - (committedCents - liquidatedCents),
      rpnpToLiquidateReconciliationCents: rpnpToLiquidateCents - (rpnpRegisteredCents - rpnpLiquidatedCents - rpnpCancelledCents),
    },
  };
}
