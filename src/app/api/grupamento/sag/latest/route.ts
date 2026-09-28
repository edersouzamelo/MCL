import { NextResponse } from "next/server";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";
import { getLatestFinancialSnapshotPair } from "@/modules/financial-snapshots/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const monitorIdParam = new URL(request.url).searchParams.get("monitorId");
  const monitorId = monitorIdParam ? Number(monitorIdParam) : undefined;
  if (monitorId !== undefined && (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 8)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  const reader = await getMonitorReader(monitorId);
  if (!reader || (reader.device && monitorId === undefined)) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  const snapshot = await getLatestFinancialSnapshotPair(reader.organizationId);
  return NextResponse.json({
    ...snapshot,
    complete: Boolean(snapshot.current && snapshot.rpn),
    dataNature: snapshot.current || snapshot.rpn ? "PERSISTED_IMPORTED" : "NONE",
  }, { headers: { "Cache-Control": "no-store" } });
}
