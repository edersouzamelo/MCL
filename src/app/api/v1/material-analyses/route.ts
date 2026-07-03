import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { getOrCreateMaterialAnalysis, persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    if (persistenceMode() === "postgresql") {
      const analyses = await prisma.materialCoverageAnalysis.findMany({
        orderBy: { updatedAt: "desc" }
      });
      return NextResponse.json({ analyses });
    } else {
      // In-memory mock
      const state = getDemoState();
      const analyses = state.needs.map(need => ({
        id: `analysis-${need.id}`,
        needId: need.id,
        itemId: "item-coturno",
        variantId: need.itemVariantId,
        status: "demo-memory",
        deficitQuantity: need.quantityRequested,
        requestedQuantity: need.quantityRequested,
        availableStockQuantity: 0,
        reservedQuantity: 0,
        deliveredQuantity: 0,
        startedBy: (session.user as any).id || "unknown",
        startedAt: new Date().toISOString(),
        confidence: 0.75,
        summaryVersion: 1,
      }));
      return NextResponse.json({ analyses });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar analises." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const { needId } = await request.json();
    if (!needId) {
      return NextResponse.json({ error: "needId obrigatorio." }, { status: 400 });
    }

    if (persistenceMode() === "postgresql") {
      const analysis = await getOrCreateMaterialAnalysis(needId, (session.user as any).id || "unknown");
      return NextResponse.json({ analysis });
    } else {
      // In-memory returns simple structure
      return NextResponse.json({
        analysis: {
          id: `analysis-${needId}`,
          needId,
          status: "demo-memory",
        }
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar/buscar analise." },
      { status: 400 }
    );
  }
}
