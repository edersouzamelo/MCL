import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getLatestFinancialSnapshotPair } from "@/modules/financial-snapshots/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const snapshot = await getLatestFinancialSnapshotPair(session.user.organizationId);
  return NextResponse.json({
    ...snapshot,
    complete: Boolean(snapshot.current && snapshot.rpn),
    dataNature: snapshot.current || snapshot.rpn ? "PERSISTED_IMPORTED" : "NONE",
  }, { headers: { "Cache-Control": "no-store" } });
}
