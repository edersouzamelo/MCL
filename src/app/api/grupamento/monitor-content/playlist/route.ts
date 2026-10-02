import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { NextResponse } from "next/server";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";
import { getApprovedMonitorScenes } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });

  const reader = await getMonitorReader(monitorId);
  if (!reader) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  const scenes = await getApprovedMonitorScenes(reader.organizationId, monitorId);
  return NextResponse.json({ scenes }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
