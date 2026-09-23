export const SAG_PI_FAMILIES = ["E5", "E6", "E7", "D8"] as const;

export type SagPiFamily = (typeof SAG_PI_FAMILIES)[number];
export type SagBatchSource = "current" | "rpn";

export function familyFieldName(source: SagBatchSource, family: SagPiFamily) {
  return `${source}_${family}`;
}

function normalizedPi(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validatePiFamilyRows(rows: Array<{ pi?: string }>, family: SagPiFamily) {
  const missingPi = rows.filter((row) => !normalizedPi(row.pi)).length;
  const mismatched = [...new Set(
    rows
      .map((row) => normalizedPi(row.pi))
      .filter((pi) => pi && !pi.startsWith(family)),
  )];

  return {
    valid: rows.length > 0 && missingPi === 0 && mismatched.length === 0,
    rowCount: rows.length,
    missingPi,
    mismatched,
  };
}
