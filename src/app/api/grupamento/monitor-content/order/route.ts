import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { reorderApprovedMonitorImports } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) {
    return NextResponse.json({ error: "Permissão insuficiente para reordenar documentos." }, { status: 403 });
  }
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Dados de ordenação inválidos." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const monitorId = input.monitorId;
  if (typeof monitorId !== "number" || !isCcoMonitorId(monitorId)) {
    return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  }
  if (!Array.isArray(input.orderedImportIds)) {
    return NextResponse.json({ error: "Lista de documentos inválida." }, { status: 400 });
  }

  try {
    const result = await reorderApprovedMonitorImports({
      organizationId: session.user.organizationId,
      monitorId,
      actorId: session.user.id,
      userAgent: request.headers.get("user-agent") ?? "mcl-monitor-content",
      orderedImportIds: input.orderedImportIds,
    });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar ordem dos documentos.";
    return NextResponse.json({ error: message }, { status: message.includes("mudou") ? 409 : 400 });
  }
}
