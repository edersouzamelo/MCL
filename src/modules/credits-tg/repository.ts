import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { TgReport } from "./parser";

// Separate source kind: queries for SAG CURRENT/RPNP cannot consume this payload.
// Stable database discriminator. The payload itself declares V1 or V2.
export const TG_SOURCE_KIND = "TG_MASTER_V1";
export type TgSnapshot = TgReport & { checksum: string; importedAt: string; emailReceivedAt: string | null; ingestionMethod: string };
export type TgSnapshotMetadata = Omit<TgSnapshot, "rows"> & { rowCount: number };
export async function persistTg(input: { organizationId: string; report: TgReport; buffer: ArrayBuffer; actor: string; method: "APPS_SCRIPT_TG" | "MANUAL_TG"; emailReceivedAt?: string | null }) {
  const checksum = createHash("sha256").update(Buffer.from(input.buffer)).digest("hex");
  const payload = JSON.parse(JSON.stringify({ ...input.report, emailReceivedAt: input.emailReceivedAt ?? null })) as Prisma.InputJsonValue;
  return prisma.financialSourceImport.upsert({
    where: { organizationId_sourceKind_checksum: { organizationId: input.organizationId, sourceKind: TG_SOURCE_KIND, checksum } },
    // The checksum still identifies the immutable source file. Rebuild only the
    // parsed projection so a corrected parser can repair an existing import;
    // importedAt and ingestion provenance remain unchanged.
    update: { fileName: input.report.fileName, rowCount: input.report.rows.length, payload, warnings: input.report.warnings },
    create: { organizationId: input.organizationId, sourceKind: TG_SOURCE_KIND, checksum,
      fileName: input.report.fileName, rowCount: input.report.rows.length,
      payload,
      warnings: input.report.warnings, ingestionMethod: input.method, importedBy: input.actor },
  });
}
export async function getLatestTg(organizationId: string): Promise<TgSnapshot | null> {
  const record = await prisma.financialSourceImport.findFirst({ where: { organizationId, sourceKind: TG_SOURCE_KIND }, orderBy: [{ importedAt: "desc" }, { id: "desc" }] });
  if (!record) return null;
  const payload = record.payload as unknown as TgReport & { emailReceivedAt?: string };
  if (!["TG_MASTER_V1", "TG_MASTER_V2"].includes(payload.schema) || !Array.isArray(payload.rows)) throw new Error("Carga TG persistida incompatível.");
  return { ...payload, checksum: record.checksum, importedAt: record.importedAt.toISOString(), emailReceivedAt: payload.emailReceivedAt ?? null, ingestionMethod: record.ingestionMethod };
}
