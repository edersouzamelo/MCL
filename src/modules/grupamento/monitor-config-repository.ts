import { prisma } from "@/server/db";
import { randomUUID } from "node:crypto";
import { isCcoMonitorId, defaultCcoMonitorConfig, parseCcoMonitorConfig, type CcoMonitorConfig } from "./monitor";

export async function listCcoMonitorConfigs(organizationId: string): Promise<CcoMonitorConfig[]> {
  const defaults = defaultCcoMonitorConfig();
  const rows = await prisma.ccoMonitorConfiguration.findMany({ where: { organizationId } });
  for (const row of rows) {
    if (!isCcoMonitorId(row.monitorId)) continue;
    const parsed = parseCcoMonitorConfig(row.configuration, row.monitorId);
    if (parsed) defaults[row.monitorId - 1] = parsed;
  }
  return defaults;
}

export async function saveCcoMonitorConfig(organizationId: string, actorId: string, value: unknown, monitorId: number) {
  const config = parseCcoMonitorConfig(value, monitorId);
  if (!config) throw new Error("Configuração do monitor inválida.");
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
