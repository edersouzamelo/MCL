export type LogisticsSourceSystem = "EPRDU" | "SISCOFIS";

export type PrduRequirementRecord = {
  itemKey: string;
  itemLabel: string;
  quantityRequired: number;
  referenceYear: number;
  organizationScope: string;
  sourceSystem: "EPRDU";
  sourceDocumentId?: string;
};

export type SiscofisStockRecord = {
  itemKey: string;
  itemLabel: string;
  quantityExisting: number;
  quantityReserved: number;
  quantityAvailable: number;
  stockPositionDate: string;
  organizationScope: string;
  sourceSystem: "SISCOFIS";
  sourceDocumentId?: string;
};

export type PrduCoverageRecord = {
  itemKey: string;
  itemLabel: string;
  quantityRequired: number;
  quantityAvailable: number;
  deficit: number;
  surplus: number;
  coveragePrdu: number;
  referenceYear: number;
  stockPositionDate: string;
  organizationScope: string;
};

export type CoverageJoinIssue = {
  itemKey: string;
  side: "PRDU" | "SISCOFIS";
  reason: "SEM_CORRESPONDENCIA";
};

export type CoverageProjection = {
  rows: PrduCoverageRecord[];
  issues: CoverageJoinIssue[];
};

export function calculatePrduCoverage(
  requirements: PrduRequirementRecord[],
  stocks: SiscofisStockRecord[],
): CoverageProjection {
  const stocksByKey = new Map(stocks.map((stock) => [stock.itemKey, stock]));
  const rows: PrduCoverageRecord[] = [];
  const issues: CoverageJoinIssue[] = [];

  for (const requirement of requirements) {
    const stock = stocksByKey.get(requirement.itemKey);
    if (!stock) {
      issues.push({ itemKey: requirement.itemKey, side: "SISCOFIS", reason: "SEM_CORRESPONDENCIA" });
      continue;
    }

    const available = Math.max(0, stock.quantityAvailable);
    const required = Math.max(0, requirement.quantityRequired);
    const delta = available - required;

    rows.push({
      itemKey: requirement.itemKey,
      itemLabel: requirement.itemLabel,
      quantityRequired: required,
      quantityAvailable: available,
      deficit: Math.max(0, -delta),
      surplus: Math.max(0, delta),
      coveragePrdu: required > 0 ? available / required : 0,
      referenceYear: requirement.referenceYear,
      stockPositionDate: stock.stockPositionDate,
      organizationScope: requirement.organizationScope,
    });
  }

  const requirementKeys = new Set(requirements.map((requirement) => requirement.itemKey));
  for (const stock of stocks) {
    if (!requirementKeys.has(stock.itemKey)) {
      issues.push({ itemKey: stock.itemKey, side: "PRDU", reason: "SEM_CORRESPONDENCIA" });
    }
  }

  return { rows, issues };
}

export function isPrduTargetMet(coveragePrdu: number) {
  return coveragePrdu >= 1;
}
