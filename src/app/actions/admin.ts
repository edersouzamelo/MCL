"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { MCL_ADMIN_EMAIL } from "@/modules/auth/access";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== MCL_ADMIN_EMAIL) {
    throw new Error("Acesso negado");
  }
  return session;
}

export async function getAllUsers() {
  await requireAdmin();

  if (persistenceMode() === "postgresql") {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  const state = getDemoState();
  return [...state.users].reverse();
}

export async function getAdminAccessMetrics() {
  await requireAdmin();
  const mode = persistenceMode();

  const users = mode === "postgresql"
    ? await prisma.user.findMany({ orderBy: { createdAt: "desc" } })
    : [...getDemoState().users].reverse();

  const logs = mode === "postgresql"
    ? await prisma.auditLog.findMany({
        where: { action: "AUTH_LOGIN", outcome: "SUCESSO" },
        orderBy: { occurredAt: "desc" },
        take: 2000,
      })
    : getDemoState().auditLogs.filter((log) => log.action === "AUTH_LOGIN" && log.outcome === "SUCESSO");

  const byUser = new Map<string, Date[]>();
  for (const log of logs) {
    const occurredAt = new Date(log.occurredAt);
    const current = byUser.get(log.actorId) ?? [];
    current.push(occurredAt);
    byUser.set(log.actorId, current);
  }

  const rows = users.map((user) => {
    const accesses = (byUser.get(user.id) ?? []).sort((a, b) => b.getTime() - a.getTime());
    return {
      id: user.id,
      name: user.name ?? "Usuário",
      email: user.email ?? "",
      image: user.image ?? null,
      militaryRole: user.militaryRole ?? null,
      militaryOrganization: user.militaryOrganization ?? null,
      createdAt: new Date(user.createdAt).toISOString(),
      accessCount: accesses.length,
      firstAccessAt: accesses.length ? accesses[accesses.length - 1].toISOString() : null,
      lastAccessAt: accesses.length ? accesses[0].toISOString() : null,
      recentAccesses: accesses.slice(0, 5).map((date) => date.toISOString()),
      isAdmin: user.email?.toLowerCase() === MCL_ADMIN_EMAIL,
      isVisitor: user.militaryRole === "Visitante - 1º Congresso de Gestão da Cadeia de suprimento COLOG",
    };
  });

  const organicRows = rows.filter((row) => !row.isAdmin);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const organicAccessesToday = organicRows.reduce((sum, row) => {
    return sum + row.recentAccesses.filter((value) => new Date(value) >= todayStart).length;
  }, 0);

  return {
    generatedAt: now.toISOString(),
    totalUsers: organicRows.length,
    congressVisitors: organicRows.filter((row) => row.isVisitor).length,
    totalAuthenticatedEntries: organicRows.reduce((sum, row) => sum + row.accessCount, 0),
    authenticatedEntriesToday: organicAccessesToday,
    users: rows.sort((a, b) => {
      const aTime = a.lastAccessAt ? new Date(a.lastAccessAt).getTime() : 0;
      const bTime = b.lastAccessAt ? new Date(b.lastAccessAt).getTime() : 0;
      return bTime - aTime;
    }),
  };
}

export async function cleanMockData() {
  await requireAdmin();

  if (persistenceMode() === "postgresql") {
    const fakes = await prisma.catalogSearchCandidate.findMany({
      where: { sourceSystem: "MCL_SIMULADO" },
    });

    for (const fake of fakes) {
      await prisma.itemCatalogMapping.deleteMany({
        where: { externalItemCode: fake.externalItemCode },
      });
      await prisma.catalogSearchCandidate.delete({
        where: { id: fake.id },
      });
    }

    await prisma.acquisitionInstrument.deleteMany({
      where: { sourceSystem: "MCL_SIMULADO" },
    });
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}
