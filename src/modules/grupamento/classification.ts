import { computeSagSnapshot, type SagFinancialValues, type SagRow, type SagSnapshot } from "@/modules/grupamento/sag";
import type { SagRuleGroup, SagRuleSet } from "@/modules/grupamento/rules";

export type SagGroupResult = {
  group: SagRuleGroup;
  snapshot: SagSnapshot;
  matchedRowCount: number;
  matchedPis: string[];
  missingPiCodes: string[];
};

export type SagClassResult = {
  className: string;
  snapshot: SagSnapshot;
  matchedRowCount: number;
  matchedPis: string[];
  groupIds: string[];
};

export type SagClassificationResult = {
  groups: SagGroupResult[];
  classes: SagClassResult[];
  unclassifiedRows: number;
  rowsWithoutPiCode: number;
  conflictedRows: number;
  warnings: string[];
};

function sumRows(rows: SagRow[]) {
  return computeSagSnapshot(
    rows.reduce<SagFinancialValues>(
      (acc, row) => ({
        available: acc.available + row.available,
        toLiquidate: acc.toLiquidate + row.toLiquidate,
        inLiquidation: acc.inLiquidation + row.inLiquidation,
        liquidated: acc.liquidated + row.liquidated,
        paid: acc.paid + row.paid,
      }),
      { available: 0, toLiquidate: 0, inLiquidation: 0, liquidated: 0, paid: 0 },
    ),
  );
}

export function classifySagRows(rows: SagRow[], rules: SagRuleSet): SagClassificationResult {
  const activeGroups = rules.groups.filter((group) => group.status === "ATIVA");
  const piToGroups = new Map<string, SagRuleGroup[]>();
  for (const group of activeGroups) {
    for (const pi of group.piCodes) {
      const current = piToGroups.get(pi) ?? [];
      current.push(group);
      piToGroups.set(pi, current);
    }
  }

  const rowsByGroup = new Map<string, SagRow[]>();
  const rowsByClass = new Map<string, SagRow[]>();
  const classSeenRowKeys = new Map<string, Set<string>>();
  let unclassifiedRows = 0;
  let rowsWithoutPiCode = 0;
  let conflictedRows = 0;
  const warnings = [...rules.warnings];

  rows.forEach((row, rowIndex) => {
    const pi = row.pi?.trim().toUpperCase();
    if (!pi) {
      rowsWithoutPiCode += 1;
      return;
    }

    const matchingGroups = piToGroups.get(pi) ?? [];
    if (!matchingGroups.length) {
      unclassifiedRows += 1;
      return;
    }
    if (matchingGroups.length > 1) conflictedRows += 1;

    for (const group of matchingGroups) {
      const groupRows = rowsByGroup.get(group.id) ?? [];
      groupRows.push(row);
      rowsByGroup.set(group.id, groupRows);

      const rowKey = `${row.sheet}:${rowIndex}:${pi}`;
      const seen = classSeenRowKeys.get(group.className) ?? new Set<string>();
      if (!seen.has(rowKey)) {
        const classRows = rowsByClass.get(group.className) ?? [];
        classRows.push(row);
        rowsByClass.set(group.className, classRows);
        seen.add(rowKey);
        classSeenRowKeys.set(group.className, seen);
      }
    }
  });

  if (rowsWithoutPiCode) {
    warnings.push(`${rowsWithoutPiCode} linha(s) SAG não possuem código PI e não foram classificadas por nome para evitar inferência silenciosa.`);
  }
  if (unclassifiedRows) {
    warnings.push(`${unclassifiedRows} linha(s) com PI não possuem regra importada aplicável.`);
  }
  if (conflictedRows) {
    warnings.push(`${conflictedRows} linha(s) correspondem a PI presente em mais de um grupo; o total de cada Classe deduplica a linha dentro da própria Classe.`);
  }

  const groupResults = activeGroups.map((group) => {
    const matchedRows = rowsByGroup.get(group.id) ?? [];
    const matchedPis = [...new Set(matchedRows.map((row) => row.pi?.trim().toUpperCase()).filter(Boolean) as string[])];
    return {
      group,
      snapshot: sumRows(matchedRows),
      matchedRowCount: matchedRows.length,
      matchedPis,
      missingPiCodes: group.piCodes.filter((pi) => !matchedPis.includes(pi)),
    };
  });

  const classes = [...rowsByClass.entries()]
    .map(([className, classRows]) => ({
      className,
      snapshot: sumRows(classRows),
      matchedRowCount: classRows.length,
      matchedPis: [...new Set(classRows.map((row) => row.pi?.trim().toUpperCase()).filter(Boolean) as string[])],
      groupIds: activeGroups.filter((group) => group.className === className).map((group) => group.id),
    }))
    .sort((a, b) => b.snapshot.total - a.snapshot.total);

  return {
    groups: groupResults,
    classes,
    unclassifiedRows,
    rowsWithoutPiCode,
    conflictedRows,
    warnings,
  };
}
