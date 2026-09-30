import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { saveCcoMonitorConfig } from "@/modules/grupamento/monitor-config-repository";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ monitorId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) {
    return NextResponse.json({ error: "Permissão insuficiente para alterar o monitor." }, { status: 403 });
  }
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const { monitorId: id } = await params;
  const monitorId = Number(id);
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  try {
    const config = await saveCcoMonitorConfig(session.user.organizationId, session.user.id, await request.json(), monitorId);
    return NextResponse.json({ monitor: config });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao salvar monitor." }, { status: 400 });
  }
}
