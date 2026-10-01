import { CCO_CLASS_GROUPS, CCO_CLASS_SLIDES, buildCcoClassExecution, type CcoClassId } from "./cco";
import type { SagRow } from "./sag";

export const CCO_SUMMARY_ROWS_PER_PAGE = 9;

/** Balanced consecutive pages, with the same boundaries for playlist and renderer. */
export function paginateClassSummary<T>(items: T[]): T[][] {
  const count = Math.max(1, Math.ceil(items.length / CCO_SUMMARY_ROWS_PER_PAGE));
  const size = Math.floor(items.length / count);
  const extra = items.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, page) => {
    const length = size + (page < extra ? 1 : 0);
    const result = items.slice(offset, offset + length);
    offset += length;
    return result;
  });
}

export function summaryClassId(screen: string): CcoClassId | undefined {
  if (!screen.endsWith("-summary")) return undefined;
  const id = screen.slice(0, -"-summary".length);
  return CCO_CLASS_SLIDES.find((definition) => definition.id === id)?.id;
}

/** Use the exact PI matrix from algoritmo.xlsx, never a PI prefix or description. */
export function buildCcoClassSummary(classId: CcoClassId, rows: SagRow[]) {
  const groups = CCO_CLASS_GROUPS.filter((group) => group.classId === classId);
  const codes = [...new Set(groups.flatMap((group) => group.piCodes))];
  const execution = buildCcoClassExecution(classId, rows, []);
  const byPi = codes.map((pi) => {
    const matched = rows.filter((row) => row.pi?.trim().toUpperCase() === pi);
    const total = matched.reduce((sum, row) =>
      sum + row.available + row.toLiquidate + row.inLiquidation + row.liquidated + row.paid, 0);
    return {
      pi, total, rowCount: matched.length,
      piName: matched.find((row) => row.piName)?.piName,
      share: execution.current.total > 0 ? total / execution.current.total * 100 : 0,
    };
  }).filter((item) => item.rowCount > 0).sort((a, b) => b.total - a.total || a.pi.localeCompare(b.pi));
  return {
    total: execution.current.total,
    byPi,
    missingPiCodes: codes.filter((pi) => !byPi.some((item) => item.pi === pi)),
    unmappedPurposes: groups.filter((group) => !group.piCodes.length).map((group) => group.label),
  };
}
