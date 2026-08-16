import { NextRequest, NextResponse } from "next/server";
import { getCommitmentRecords } from "@/modules/credits/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ugCode = searchParams.get("ug") || undefined;
    const expenseNature = searchParams.get("nd") || undefined;
    const resourceSource = searchParams.get("fonte") || undefined;
    const searchQuery = searchParams.get("q") || undefined;

    const commitments = getCommitmentRecords({
      ugCode,
      expenseNature,
      resourceSource,
      searchQuery,
    });

    return NextResponse.json({
      success: true,
      count: commitments.length,
      data: commitments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao consultar notas de empenho" },
      { status: 500 }
    );
  }
}
