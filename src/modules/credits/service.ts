import {
  CreditRecord,
  CommitmentRecord,
  BudgetExecutionSummary,
  ExpenseNatureBreakdown,
  ResourceSourceBreakdown,
  CreditFilterOptions,
} from "./types";
import {
  demoCreditRecords,
  demoCommitmentRecords,
  demoMonthlyExecution,
  demoCoverageFinancialMatrix,
} from "./demo-data";

export function getCreditRecords(filters?: CreditFilterOptions): CreditRecord[] {
  let records = [...demoCreditRecords];

  if (!filters) return records;

  if (filters.financialYear) {
    records = records.filter((r) => r.financialYear === filters.financialYear);
  }

  if (filters.ugCode) {
    records = records.filter((r) => r.ugCode === filters.ugCode);
  }

  if (filters.expenseNature) {
    records = records.filter((r) => r.expenseNature === filters.expenseNature);
  }

  if (filters.resourceSource) {
    records = records.filter((r) => r.resourceSource === filters.resourceSource);
  }

  if (filters.status) {
    records = records.filter((r) => r.status === filters.status);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    records = records.filter(
      (r) =>
        r.persistentCode.toLowerCase().includes(q) ||
        r.ugName.toLowerCase().includes(q) ||
        r.planningCode.toLowerCase().includes(q) ||
        r.budgetProgramName.toLowerCase().includes(q) ||
        r.expenseNatureLabel.toLowerCase().includes(q)
    );
  }

  return records;
}

export function getCommitmentRecords(filters?: CreditFilterOptions): CommitmentRecord[] {
  let commitments = [...demoCommitmentRecords];

  if (!filters) return commitments;

  if (filters.ugCode) {
    commitments = commitments.filter((c) => c.ugCode === filters.ugCode);
  }

  if (filters.expenseNature) {
    commitments = commitments.filter((c) => c.expenseNature === filters.expenseNature);
  }

  if (filters.resourceSource) {
    commitments = commitments.filter((c) => c.resourceSource === filters.resourceSource);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    commitments = commitments.filter(
      (c) =>
        c.neCode.toLowerCase().includes(q) ||
        c.persistentCode.toLowerCase().includes(q) ||
        c.supplierName.toLowerCase().includes(q) ||
        c.supplierDocument.toLowerCase().includes(q) ||
        (c.needItemDescription && c.needItemDescription.toLowerCase().includes(q))
    );
  }

  return commitments;
}

export function calculateBudgetSummary(filters?: CreditFilterOptions): BudgetExecutionSummary {
  const records = getCreditRecords(filters);
  const commitments = getCommitmentRecords(filters);

  const totalInitial = records.reduce((acc, r) => acc + r.initialAmount, 0);
  const totalSupplemented = records.reduce((acc, r) => acc + r.supplementedAmount, 0);
  const totalCanceled = records.reduce((acc, r) => acc + r.canceledAmount, 0);
  const totalUpdated = records.reduce((acc, r) => acc + r.totalAmount, 0);
  const totalCommitted = records.reduce((acc, r) => acc + r.committedAmount, 0);
  const totalLiquidated = records.reduce((acc, r) => acc + r.liquidatedAmount, 0);
  const totalPaid = records.reduce((acc, r) => acc + r.paidAmount, 0);
  const totalAvailable = records.reduce((acc, r) => acc + r.availableAmount, 0);

  const executionPercentageCommitted =
    totalUpdated > 0 ? Number(((totalCommitted / totalUpdated) * 100).toFixed(1)) : 0;

  const executionPercentagePaid =
    totalUpdated > 0 ? Number(((totalPaid / totalUpdated) * 100).toFixed(1)) : 0;

  const alertsCount = records.filter(
    (r) => r.status === "COMPROMETIDO" || r.availableAmount < 10000
  ).length;

  return {
    financialYear: filters?.financialYear || 2026,
    totalInitial,
    totalSupplemented,
    totalCanceled,
    totalUpdated,
    totalCommitted,
    totalLiquidated,
    totalPaid,
    totalAvailable,
    executionPercentageCommitted,
    executionPercentagePaid,
    countCredits: records.length,
    countCommitments: commitments.length,
    alertsCount,
  };
}

export function getExpenseNatureBreakdown(filters?: CreditFilterOptions): ExpenseNatureBreakdown[] {
  const records = getCreditRecords(filters);
  const map = new Map<string, ExpenseNatureBreakdown>();

  for (const r of records) {
    const existing = map.get(r.expenseNature) || {
      code: r.expenseNature,
      label: r.expenseNatureLabel,
      totalUpdated: 0,
      committed: 0,
      paid: 0,
      available: 0,
      percentage: 0,
    };

    existing.totalUpdated += r.totalAmount;
    existing.committed += r.committedAmount;
    existing.paid += r.paidAmount;
    existing.available += r.availableAmount;

    map.set(r.expenseNature, existing);
  }

  const grandTotal = Array.from(map.values()).reduce((acc, b) => acc + b.totalUpdated, 0);

  return Array.from(map.values()).map((b) => ({
    ...b,
    percentage: grandTotal > 0 ? Number(((b.totalUpdated / grandTotal) * 100).toFixed(1)) : 0,
  }));
}

export function getResourceSourceBreakdown(filters?: CreditFilterOptions): ResourceSourceBreakdown[] {
  const records = getCreditRecords(filters);
  const map = new Map<string, ResourceSourceBreakdown>();

  for (const r of records) {
    const existing = map.get(r.resourceSource) || {
      code: r.resourceSource,
      label: r.resourceSourceLabel,
      totalUpdated: 0,
      committed: 0,
      paid: 0,
      available: 0,
    };

    existing.totalUpdated += r.totalAmount;
    existing.committed += r.committedAmount;
    existing.paid += r.paidAmount;
    existing.available += r.availableAmount;

    map.set(r.resourceSource, existing);
  }

  return Array.from(map.values());
}

export function getMonthlyExecutionData() {
  return demoMonthlyExecution;
}

export function getCoverageFinancialMatrix() {
  return demoCoverageFinancialMatrix;
}
