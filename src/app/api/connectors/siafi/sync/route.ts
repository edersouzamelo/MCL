import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getLatestFinancialSnapshotPair } from "@/modules/financial-snapshots/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const pair = await getLatestFinancialSnapshotPair(session.user.organizationId);
  const timestamps = [pair.current?.persistedAt, pair.rpn?.persistedAt].filter((value): value is string => Boolean(value)).sort();
  const status = pair.current && pair.rpn ? "READY" : pair.current || pair.rpn ? "PARTIAL" : "NEVER_SYNCED";
  return NextResponse.json({
    connector: "SAG / Tesouro Gerencial",
    status,
    lastPersistedAt: timestamps.at(-1) ?? null,
    sources: {
      current: pair.current ? { fileName: pair.current.source.fileName, rowCount: pair.current.rows.length, checksum: pair.current.checksum, persistedAt: pair.current.persistedAt } : null,
      rpn: pair.rpn ? { fileName: pair.rpn.source.fileName, rowCount: pair.rpn.rows.length, checksum: pair.rpn.checksum, persistedAt: pair.rpn.persistedAt } : null,
    },
    automationConfigured: Boolean(process.env.MCL_SIAFI_WEBHOOK_TOKEN),
  }, { headers: { "Cache-Control": "no-store" } });
}
