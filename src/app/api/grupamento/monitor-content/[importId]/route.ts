import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { deletePendingMonitorContentImport } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) {
    return NextResponse.json({ error: "Permissão insuficiente para excluir conteúdo documental." }, { status: 403 });
  }
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  const { importId } = await params;
  try {
    const deleted = await deletePendingMonitorContentImport({
      id: importId, organizationId: session.user.organizationId, actorId: session.user.id,
      userAgent: request.headers.get("user-agent") ?? "mcl-monitor-content",
    });
    return NextResponse.json({ ok: true, monitorId: deleted.monitorId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao excluir arquivo." }, { status: 400 });
  }
}
