import { prisma } from "@/server/db";
import { defaultCcoMonitorConfig, parseCcoMonitorConfig, type CcoMonitorConfig } from "./monitor";

export async function listCcoMonitorConfigs(organizationId: string): Promise<CcoMonitorConfig[]> {
  const defaults = defaultCcoMonitorConfig();
  const rows = await prisma.ccoMonitorConfiguration.findMany({ where: { organizationId } });
  for (const row of rows) {
    if (row.monitorId < 1 || row.monitorId > 8) continue;
    const parsed = parseCcoMonitorConfig(row.configuration, row.monitorId);
    if (parsed) defaults[row.monitorId - 1] = parsed;
  }
  return defaults;
}

export async function saveCcoMonitorConfig(organizationId: string, actorId: string, value: unknown, monitorId: number) {
  const config = parseCcoMonitorConfig(value, monitorId);
  if (!config) throw new Error("Configuração do monitor inválida.");
  await prisma.ccoMonitorConfiguration.upsert({
    where: { organizationId_monitorId: { organizationId, monitorId } },
    create: { organizationId, monitorId, configuration: config, updatedBy: actorId },
    update: { configuration: config, updatedBy: actorId },
  });
  return config;
}

export async function resetCcoMonitorConfigs(organizationId: string) {
  await prisma.ccoMonitorConfiguration.deleteMany({ where: { organizationId } });
  return defaultCcoMonitorConfig();
}
