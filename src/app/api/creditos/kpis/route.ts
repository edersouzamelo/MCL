import { NextRequest, NextResponse } from "next/server";
import {
  calculateBudgetSummary,
  getExpenseNatureBreakdown,
  getResourceSourceBreakdown,
  getMonthlyExecutionData,
  getCoverageFinancialMatrix,
} from "@/modules/credits/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("ano");
    const ugCode = searchParams.get("ug") || undefined;
    const expenseNature = searchParams.get("nd") || undefined;
    const resourceSource = searchParams.get("fonte") || undefined;

    const financialYear = yearStr ? parseInt(yearStr, 10) : undefined;
    const filters = { financialYear, ugCode, expenseNature, resourceSource };

    const summary = calculateBudgetSummary(filters);
    const byExpenseNature = getExpenseNatureBreakdown(filters);
    const byResourceSource = getResourceSourceBreakdown(filters);
    const monthlyExecution = getMonthlyExecutionData();
    const coverageMatrix = getCoverageFinancialMatrix();

    return NextResponse.json({
      success: true,
      summary,
      byExpenseNature,
      byResourceSource,
      monthlyExecution,
      coverageMatrix,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao calcular KPIs de créditos" },
      { status: 500 }
    );
  }
}
