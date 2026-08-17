import { describe, it, expect } from "vitest";
import {
  getCreditRecords,
  getCommitmentRecords,
  calculateBudgetSummary,
  getExpenseNatureBreakdown,
  getResourceSourceBreakdown,
  getMonthlyExecutionData,
  getCoverageFinancialMatrix,
} from "@/modules/credits/service";

describe("Credit Module - Service Unit Tests", () => {
  it("retorna todos os registros de crédito sem filtro", () => {
    const credits = getCreditRecords();
    expect(credits.length).toBeGreaterThan(0);
    expect(credits[0]).toHaveProperty("persistentCode");
    expect(credits[0]).toHaveProperty("totalAmount");
  });

  it("filtra créditos por UG com precisão", () => {
    const cologCredits = getCreditRecords({ ugCode: "160136" });
    expect(cologCredits.length).toBeGreaterThan(0);
    cologCredits.forEach((c) => {
      expect(c.ugCode).toBe("160136");
    });
  });

  it("filtra créditos por Natureza de Despesa (ND 339030)", () => {
    const nd30Credits = getCreditRecords({ expenseNature: "339030" });
    expect(nd30Credits.length).toBeGreaterThan(0);
    nd30Credits.forEach((c) => {
      expect(c.expenseNature).toBe("339030");
    });
  });

  it("filtra notas de empenho por busca textual", () => {
    const commitments = getCommitmentRecords({ searchQuery: "PETROBRAS" });
    expect(commitments.length).toBeGreaterThan(0);
    commitments.forEach((c) => {
      expect(c.supplierName.toUpperCase()).toContain("PETROBRAS");
    });
  });

  it("calcula o resumo de execução orçamentária determinístico", () => {
    const summary = calculateBudgetSummary({ financialYear: 2026 });
    expect(summary.financialYear).toBe(2026);
    expect(summary.totalUpdated).toBeGreaterThan(0);
    expect(summary.totalCommitted).toBeLessThanOrEqual(summary.totalUpdated);
    expect(summary.totalAvailable).toBe(summary.totalUpdated - summary.totalCommitted);
    expect(summary.executionPercentageCommitted).toBeGreaterThan(0);
  });

  it("gera a decomposição por Natureza de Despesa com porcentagens válidas", () => {
    const breakdown = getExpenseNatureBreakdown();
    expect(breakdown.length).toBeGreaterThan(0);
    const sumPercentage = breakdown.reduce((acc, b) => acc + b.percentage, 0);
    expect(sumPercentage).toBeCloseTo(100, 0);
  });

  it("retorna a série temporal de execução mensal", () => {
    const monthly = getMonthlyExecutionData();
    expect(monthly.length).toBe(6);
    expect(monthly[0]).toHaveProperty("empenhado");
    expect(monthly[0]).toHaveProperty("liquidado");
    expect(monthly[0]).toHaveProperty("pago");
  });

  it("retorna a matriz de cobertura financeira vs logística", () => {
    const matrix = getCoverageFinancialMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]).toHaveProperty("needId");
    expect(matrix[0]).toHaveProperty("financialCoveragePercentage");
  });
});
