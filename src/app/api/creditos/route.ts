import { NextRequest, NextResponse } from "next/server";
import { getCreditRecords } from "@/modules/credits/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("ano");
    const ugCode = searchParams.get("ug") || undefined;
    const expenseNature = searchParams.get("nd") || undefined;
    const resourceSource = searchParams.get("fonte") || undefined;
    const status = searchParams.get("status") || undefined;
    const searchQuery = searchParams.get("q") || undefined;

    const financialYear = yearStr ? parseInt(yearStr, 10) : undefined;

    const credits = getCreditRecords({
      financialYear,
      ugCode,
      expenseNature,
      resourceSource,
      status,
      searchQuery,
    });

    return NextResponse.json({
      success: true,
      count: credits.length,
      data: credits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao consultar créditos orçamentários" },
      { status: 500 }
    );
  }
}
