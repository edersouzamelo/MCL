import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";

import { getLatestTg, getLatestTgProjection, saveTgProjection } from "@/modules/credits-tg/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  try {
    const projected = await getLatestTgProjection(session.user.organizationId);
    if (projected) {
      return NextResponse.json({
        success: true, source: "TESOURO_GERENCIAL", dataNature: "PERSISTED_IMPORTED",
        lastUpdatedAt: projected.snapshot.sourceDate,
        snapshot: projected.snapshot,
        operational: projected.operational,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    // One-time repair for the latest import created before compact projections.
    const legacy = await getLatestTg(session.user.organizationId);
    if (legacy) {
      const repaired = await saveTgProjection(session.user.organizationId, legacy);
      return NextResponse.json({ success: true, source: "TESOURO_GERENCIAL", dataNature: "PERSISTED_IMPORTED",
        lastUpdatedAt: repaired.snapshot.sourceDate, snapshot: repaired.snapshot, operational: repaired.operational },
      { headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Não foi possível consultar a fonte TG persistida.", code: "TG_READ_FAILED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  // The existing FinancialSourceImport repository stores SAG/CCO payloads, not
  // the UASG's TG report contract. Never reinterpret those records as TG balances.
  return NextResponse.json({
    success: false,
    code: "TG_SOURCE_RECONNECTION_PENDING",
    source: "TESOURO_GERENCIAL",
    dataNature: "NONE",
    lastUpdatedAt: null,
    error: "A conexão dos relatórios do Tesouro Gerencial por e-mail e Apps Script está em recuperação. Os saldos desta UASG ainda não estão disponíveis neste painel.",
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
