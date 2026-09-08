import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";

export type FinancialSourceKind = "CURRENT" | "RPNP";

type PersistInput = {
  organizationId: string;
  sourceKind: FinancialSourceKind;
  fileName: string;
  checksum: string;
  rowCount: number;
  payload: SagImportResult | RpnImportResult;
  warnings: string[];
  ingestionMethod: "MANUAL_PAIR" | "APPS_SCRIPT";
  importedBy?: string;
};

export type FinancialSnapshotPair = {
  current: (SagImportResult & { persistedAt: string; checksum: string }) | null;
  rpn: (RpnImportResult & { persistedAt: string; checksum: string }) | null;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function checksumBuffer(buffer: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

function upsertArgs(input: PersistInput): Prisma.FinancialSourceImportUpsertArgs {
  return {
    where: {
      organizationId_sourceKind_checksum: {
        organizationId: input.organizationId,
        sourceKind: input.sourceKind,
        checksum: input.checksum,
      },
    },
    update: {},
    create: {
      organizationId: input.organizationId,
      sourceKind: input.sourceKind,
      fileName: input.fileName,
      checksum: input.checksum,
      rowCount: input.rowCount,
      payload: json(input.payload),
      warnings: json(input.warnings),
      ingestionMethod: input.ingestionMethod,
      importedBy: input.importedBy,
    },
  };
}

export async function persistFinancialImport(input: PersistInput) {
  return prisma.financialSourceImport.upsert(upsertArgs(input));
}

export async function persistFinancialPair(current: PersistInput, rpn: PersistInput) {
  if (current.organizationId !== rpn.organizationId || current.sourceKind !== "CURRENT" || rpn.sourceKind !== "RPNP") {
    throw new Error("Par financeiro inválido para persistência atômica.");
  }
  return prisma.$transaction([
    prisma.financialSourceImport.upsert(upsertArgs(current)),
    prisma.financialSourceImport.upsert(upsertArgs(rpn)),
  ]);
}

export async function getLatestFinancialSnapshotPair(organizationId: string): Promise<FinancialSnapshotPair> {
  const [current, rpn] = await Promise.all([
    prisma.financialSourceImport.findFirst({
      where: { organizationId, sourceKind: "CURRENT" },
      orderBy: { importedAt: "desc" },
    }),
    prisma.financialSourceImport.findFirst({
      where: { organizationId, sourceKind: "RPNP" },
      orderBy: { importedAt: "desc" },
    }),
  ]);

  return {
    current: current
      ? {
          ...(current.payload as unknown as SagImportResult),
          persistedAt: current.importedAt.toISOString(),
          checksum: current.checksum,
        }
      : null,
    rpn: rpn
      ? {
          ...(rpn.payload as unknown as RpnImportResult),
          persistedAt: rpn.importedAt.toISOString(),
          checksum: rpn.checksum,
        }
      : null,
  };
}
