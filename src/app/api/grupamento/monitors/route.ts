import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { listCcoMonitorConfigs, resetCcoMonitorConfigs } from "@/modules/grupamento/monitor-config-repository";

export const runtime = "nodejs";
const READ_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);
const WRITE_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => READ_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const monitors = await listCcoMonitorConfigs(session.user.organizationId);
  return NextResponse.json({ monitors }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => WRITE_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const monitors = await resetCcoMonitorConfigs(session.user.organizationId);
  return NextResponse.json({ monitors });
}
