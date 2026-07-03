import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const { id } = await params;

  try {
    if (persistenceMode() === "postgresql") {
      const analysis = await prisma.materialCoverageAnalysis.findUnique({
        where: { id },
      });
      if (!analysis) {
        return NextResponse.json({ error: "Analise nao localizada." }, { status: 404 });
      }

      const candidates = await prisma.acquisitionCoverageCandidate.findMany({
        where: { analysisId: analysis.id }
      });

      return NextResponse.json({ analysis, candidates });
    } else {
      // In-memory fallback
      const state = getDemoState();
      const need = state.needs.find(n => n.id === id || `analysis-${n.id}` === id);
      if (!need) {
        return NextResponse.json({ error: "Analise nao localizada." }, { status: 404 });
      }
      return NextResponse.json({
        analysis: {
          id: `analysis-${need.id}`,
          needId: need.id,
          status: "demo-memory",
          deficitQuantity: need.quantityRequested,
          requestedQuantity: need.quantityRequested,
          availableStockQuantity: 0,
        },
        candidates: []
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar analise." },
      { status: 500 }
    );
  }
}
