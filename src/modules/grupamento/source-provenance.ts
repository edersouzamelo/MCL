type FinancialSource = {
  referenceDate?: string;
  importedAt: string;
};

export function formatMonitorSourceDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-04:00` : value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleDateString("pt-BR", { timeZone: "America/Campo_Grande" });
}

function financialSourceLabel(source?: FinancialSource | null) {
  const referenceDate = formatMonitorSourceDate(source?.referenceDate);
  if (referenceDate) return `referência ${referenceDate}`;
  // Upload time identifies the published load, without claiming the report's date.
  const importedAt = formatMonitorSourceDate(source?.importedAt);
  return importedAt ? `importado em ${importedAt}` : "data não identificada";
}

export function sagMonitorProvenance(current?: FinancialSource | null, rpn?: FinancialSource | null) {
  const currentLabel = financialSourceLabel(current);
  const rpnLabel = financialSourceLabel(rpn);
  if (currentLabel === rpnLabel) return `Fonte: SAG · ${currentLabel}`;
  return `Fonte: SAG · EC ${currentLabel} · RPNP ${rpnLabel}`;
}
