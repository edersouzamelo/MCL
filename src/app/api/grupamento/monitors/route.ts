import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { listCcoMonitorConfigs, resetCcoMonitorConfigs } from "@/modules/grupamento/monitor-config-repository";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";

export const runtime = "nodejs";
const WRITE_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);

export async function GET(request: Request) {
  const monitorIdParam = new URL(request.url).searchParams.get("monitorId");
  const monitorId = monitorIdParam ? Number(monitorIdParam) : undefined;
  if (monitorId !== undefined && (!isCcoMonitorId(monitorId))) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  const reader = await getMonitorReader(monitorId);
  if (!reader || (reader.device && monitorId === undefined)) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  const monitors = await listCcoMonitorConfigs(reader.organizationId);
  const visible = reader.device ? monitors.filter((monitor) => monitor.id === reader.monitorId) : monitors;
  return NextResponse.json({ monitors: visible }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => WRITE_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const monitors = await resetCcoMonitorConfigs(session.user.organizationId);
  return NextResponse.json({ monitors });
}
