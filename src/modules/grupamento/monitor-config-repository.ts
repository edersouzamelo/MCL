import { prisma } from "@/server/db";
import { randomUUID } from "node:crypto";
import { ccoLocalDate, isCcoMonitorId, defaultCcoMonitorConfig, parseCcoMonitorConfig, type CcoMonitorConfig } from "./monitor";

export async function listCcoMonitorConfigs(organizationId: string): Promise<CcoMonitorConfig[]> {
  const defaults = defaultCcoMonitorConfig();
  const [rows, documents, contentEvents] = await Promise.all([
    prisma.ccoMonitorConfiguration.findMany({ where: { organizationId } }),
    prisma.monitorContentImport.findMany({ where: { organizationId }, select: { monitorId: true, importedAt: true, importedBy: true, importedByName: true, approvedAt: true, approvedBy: true, archivedAt: true, archivedBy: true } }),
    prisma.auditLog.findMany({ where: { organizationId, action: { in: ["MONITOR_CONTENT_DELETE", "MONITOR_CONTENT_REPROCESS", "MONITOR_CONTENT_ONLINE_EDIT"] }, outcome: "SUCESSO" }, select: { occurredAt: true, actorId: true, metadata: true } }),
  ]);
  const updates = new Map<number, { at: Date; actorId: string; name?: string | null }>();
  for (const row of rows) {
    if (!isCcoMonitorId(row.monitorId)) continue;
    const parsed = parseCcoMonitorConfig(row.configuration, row.monitorId);
    if (parsed) defaults[row.monitorId - 1] = parsed;
    updates.set(row.monitorId, { at: row.updatedAt, actorId: row.updatedBy });
  }
  for (const doc of documents) {
    for (const event of [
      { at: doc.importedAt, actorId: doc.importedBy, name: doc.importedByName },
      { at: doc.approvedAt, actorId: doc.approvedBy, name: null },
      { at: doc.archivedAt, actorId: doc.archivedBy, name: null },
    ]) {
      if (!isCcoMonitorId(doc.monitorId) || !event.at || !event.actorId) continue;
      if (!updates.has(doc.monitorId) || event.at > updates.get(doc.monitorId)!.at) updates.set(doc.monitorId, { at: event.at, actorId: event.actorId, name: event.name });
    }
  }
  for (const event of contentEvents) {
    const metadata = event.metadata as { monitorId?: number } | null;
    const id = metadata?.monitorId;
    if (!id || !isCcoMonitorId(id) || !event.actorId) continue;
    if (!updates.has(id) || event.occurredAt > updates.get(id)!.at) updates.set(id, { at: event.occurredAt, actorId: event.actorId });
  }
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set([...updates.values()].map((event) => event.actorId))] } }, select: { id: true, name: true } });
  const names = new Map(users.map((user) => [user.id, user.name]));
  for (const [id, event] of updates) {
    defaults[id - 1].updatedOn = ccoLocalDate(event.at);
    defaults[id - 1].updatedAt = event.at.toISOString();
    defaults[id - 1].updatedByName = event.name || names.get(event.actorId) || "Responsável não identificado";
  }
  return defaults;
}

export async function saveCcoMonitorConfig(organizationId: string, actorId: string, value: unknown, monitorId: number) {
  const config = parseCcoMonitorConfig(value, monitorId);
  if (!config) throw new Error("Configuração do monitor inválida.");
  delete config.updatedAt;
  delete config.updatedByName;
  await prisma.$transaction(async (tx) => {
    const before = await tx.ccoMonitorConfiguration.findUnique({ where: { organizationId_monitorId: { organizationId, monitorId } } });
    await tx.ccoMonitorConfiguration.upsert({
      where: { organizationId_monitorId: { organizationId, monitorId } },
      create: { organizationId, monitorId, configuration: config, updatedBy: actorId },
      update: { configuration: config, updatedBy: actorId },
    });
    await tx.auditLog.create({ data: {
      id: randomUUID(), actorId, organizationId, occurredAt: new Date(), action: "CCOL_MONITOR_CONFIG_UPDATE", resourceType: "CCOL_MONITOR", resourceId: String(monitorId), requestId: randomUUID(), userAgent: "mcl-ccol-panel", outcome: "SUCESSO", reason: "Operador alterou configuração compartilhada do monitor.",
      metadata: { monitorId, before: before?.configuration ?? null, after: config },
    } });
  });
  return config;
}

export async function resetCcoMonitorConfigs(organizationId: string) {
  await prisma.ccoMonitorConfiguration.deleteMany({ where: { organizationId } });
  return defaultCcoMonitorConfig();
}
