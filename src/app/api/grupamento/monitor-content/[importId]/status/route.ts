import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { setMonitorContentStatus } from "@/modules/grupamento/monitor-content/repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);

export async function POST(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente para publicar conteúdo documental." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const { importId } = await params;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  const status = String(body?.status ?? "").toUpperCase();
  if (status !== "APPROVED" && status !== "ARCHIVED") return NextResponse.json({ error: "Status inválido." }, { status: 400 });

  try {
    const updated = await setMonitorContentStatus({
      id: importId,
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      status,
    });

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        occurredAt: new Date(),
        actorId: session.user.id,
        action: status === "APPROVED" ? "MONITOR_CONTENT_APPROVE" : "MONITOR_CONTENT_ARCHIVE",
        resourceType: "MONITOR_CONTENT",
        resourceId: importId,
        organizationId: session.user.organizationId,
        requestId: randomUUID(),
        userAgent: request.headers.get("user-agent") ?? "mcl-monitor-content",
        outcome: "SUCESSO",
        reason: status === "APPROVED"
          ? "Conteúdo documental aprovado por operador humano para entrar no loop do monitor."
          : "Conteúdo documental retirado do loop do monitor por operador humano.",
        metadata: { monitorId: updated.monitorId, fileName: updated.fileName, status },
      },
    });

    return NextResponse.json({
      ok: true,
      import: {
        id: updated.id,
        status: updated.status,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        archivedAt: updated.archivedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao atualizar publicação." }, { status: 400 });
  }
}
