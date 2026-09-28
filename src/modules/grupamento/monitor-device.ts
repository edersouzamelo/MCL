import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";

export const DISPLAY_COOKIE = "mcl_monitor_display";
export const DISPLAY_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const READ_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getDisplayDevice() {
  const token = (await cookies()).get(DISPLAY_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  return prisma.monitorDisplayDevice.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, monitorId: true, organizationId: true, label: true, expiresAt: true },
  });
}

export async function getMonitorReader(monitorId?: number) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.organizationId && (session.user.roles ?? []).some((role) => READ_ROLES.has(role))) {
    return { organizationId: session.user.organizationId, monitorId: null, device: false as const };
  }
  const device = await getDisplayDevice();
  if (!device || (monitorId !== undefined && device.monitorId !== monitorId)) return null;
  return { organizationId: device.organizationId, monitorId: device.monitorId, device: true as const };
}

export async function enrollDisplayDevice(input: { organizationId: string; monitorId: number; actorId: string; label: string }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DISPLAY_MAX_AGE_SECONDS * 1000);
  const device = await prisma.monitorDisplayDevice.create({
    data: {
      id: randomUUID(), organizationId: input.organizationId, monitorId: input.monitorId,
      tokenHash: hashToken(token), label: input.label, enrolledBy: input.actorId, expiresAt,
    },
  });
  return { token, device: { id: device.id, monitorId: device.monitorId, label: device.label, expiresAt } };
}
