import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
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
