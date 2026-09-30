import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { DISPLAY_COOKIE, DISPLAY_MAX_AGE_SECONDS, enrollDisplayDevice, getDisplayDevice } from "@/modules/grupamento/monitor-device";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit";

export const runtime = "nodejs";

async function manager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId || !(session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) return null;
  return session.user;
}

export async function GET(request: Request) {
  const user = await manager();
  if (!user) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  const devices = await prisma.monitorDisplayDevice.findMany({
    where: { organizationId: user.organizationId!, monitorId, revokedAt: null },
    orderBy: { enrolledAt: "desc" },
    select: { id: true, label: true, enrolledAt: true, expiresAt: true },
  });
  return NextResponse.json({ devices }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await manager();
  if (!user) return NextResponse.json({ error: "Faça login como gestor neste notebook para vinculá-lo." }, { status: 403 });
  const body = await request.json().catch(() => null) as { monitorId?: number; label?: string } | null;
  const monitorId = Number(body?.monitorId);
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) : "Notebook HDMI";
  const existing = await getDisplayDevice();
  if (existing && existing.organizationId === user.organizationId) {
    await prisma.monitorDisplayDevice.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  }
  const { token, device } = await enrollDisplayDevice({ organizationId: user.organizationId!, monitorId, actorId: user.id, label: label || "Notebook HDMI" });
  await recordAuditEvent({ actorId: user.id, action: "MONITOR_DEVICE_ENROLL", resourceType: "MONITOR_DISPLAY_DEVICE", resourceId: device.id,
    organizationId: user.organizationId, outcome: "SUCESSO", reason: "Notebook HDMI vinculado para exibição restrita.",
    metadata: { monitorId, label: device.label, expiresAt: device.expiresAt.toISOString() }, userAgent: request.headers.get("user-agent") ?? "mcl-monitor-device" });
  const response = NextResponse.json({ device });
  response.cookies.set(DISPLAY_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DISPLAY_MAX_AGE_SECONDS,
  });
  return response;
}
