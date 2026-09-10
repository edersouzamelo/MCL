import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { TgReport } from "./parser";

// Separate source kind: queries for SAG CURRENT/RPNP cannot consume this payload.
export const TG_SOURCE_KIND = "TG_MASTER_V1";
export type TgSnapshot = TgReport & { checksum: string; importedAt: string; emailReceivedAt: string | null; ingestionMethod: string };
export async function persistTg(input: { organizationId: string; report: TgReport; buffer: ArrayBuffer; actor: string; method: "APPS_SCRIPT_TG" | "MANUAL_TG"; emailReceivedAt?: string | null }) {
  const checksum = createHash("sha256").update(Buffer.from(input.buffer)).digest("hex");
  return prisma.financialSourceImport.upsert({
    where: { organizationId_sourceKind_checksum: { organizationId: input.organizationId, sourceKind: TG_SOURCE_KIND, checksum } },
    update: {},
    create: { organizationId: input.organizationId, sourceKind: TG_SOURCE_KIND, checksum,
      fileName: input.report.fileName, rowCount: input.report.rows.length,
      payload: JSON.parse(JSON.stringify({ ...input.report, emailReceivedAt: input.emailReceivedAt ?? null })) as Prisma.InputJsonValue,
      warnings: input.report.warnings, ingestionMethod: input.method, importedBy: input.actor },
  });
}
export async function getLatestTg(organizationId: string): Promise<TgSnapshot | null> {
  const record = await prisma.financialSourceImport.findFirst({ where: { organizationId, sourceKind: TG_SOURCE_KIND }, orderBy: [{ importedAt: "desc" }, { id: "desc" }] });
  if (!record) return null;
  const payload = record.payload as unknown as TgReport & { emailReceivedAt?: string };
  if (payload.schema !== TG_SOURCE_KIND || !Array.isArray(payload.rows)) throw new Error("Carga TG persistida incompatível.");
  return { ...payload, checksum: record.checksum, importedAt: record.importedAt.toISOString(), emailReceivedAt: payload.emailReceivedAt ?? null, ingestionMethod: record.ingestionMethod };
}
