import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { NextResponse } from "next/server";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  if (!await getMonitorReader(monitorId)) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  return NextResponse.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" }, { headers: { "Cache-Control": "no-store" } });
}
