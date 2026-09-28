import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId || !(session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }
  const { deviceId } = await params;
  const result = await prisma.monitorDisplayDevice.updateMany({
    where: { id: deviceId, organizationId: session.user.organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "Dispositivo não encontrado." }, { status: 404 });
  await recordAuditEvent({ actorId: session.user.id, action: "MONITOR_DEVICE_REVOKE", resourceType: "MONITOR_DISPLAY_DEVICE", resourceId: deviceId,
    organizationId: session.user.organizationId, outcome: "SUCESSO", reason: "Acesso do notebook HDMI revogado.", metadata: {} });
  return NextResponse.json({ ok: true });
}
