import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { fetchPncpPcaByUasg, normalizePncpPcaRecord } from "@/modules/pca/pncp-client";
import type { PcaItemView } from "@/modules/pca/contracts";

function view(item: {
  id: string; year: number; itemNumber: number | null; catalogCode: string | null;
  catalogType: string | null; description: string; unit: string | null;
  estimatedQuantity: { toString(): string } | null; estimatedTotalValue: { toString(): string } | null;
  expectedContractingDate: Date | null; category: string | null; sourceUrl: string | null; synchronizedAt: Date;
}): PcaItemView {
  return {
    ...item,
    estimatedQuantity: item.estimatedQuantity?.toString() ?? null,
    estimatedTotalValue: item.estimatedTotalValue?.toString() ?? null,
    expectedContractingDate: item.expectedContractingDate?.toISOString() ?? null,
    synchronizedAt: item.synchronizedAt.toISOString(),
  };
}

export async function listPcaItems(organizationId: string, year: number) {
  const items = await prisma.pcaItem.findMany({
    where: { organizationId, year, active: true },
    orderBy: [{ itemNumber: "asc" }, { description: "asc" }],
  });
  return items.map(view);
}

export async function syncPcaItems(organizationId: string, year: number) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new Error("Organização não localizada.");
  if (!organization.uasg) throw new Error("A organização ainda não possui UASG vinculada no MCL.");
  if (!organization.pncpCnpj) throw new Error("Cadastre o CNPJ do órgão da organização antes de sincronizar o PCA com o PNCP.");

  const records = await fetchPncpPcaByUasg({ year, uasg: organization.uasg, cnpj: organization.pncpCnpj });
  const normalized = records.map(normalizePncpPcaRecord);
  const synchronizedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.pcaItem.updateMany({ where: { organizationId, year }, data: { active: false } });
    // Bulk upsert keeps item identities and avoids thousands of database round trips.
    const columns = ["pncpItemId", "pncpControlNumber", "itemNumber", "catalogCode", "catalogType",
      "description", "unit", "estimatedQuantity", "estimatedUnitValue", "estimatedTotalValue",
      "expectedContractingDate", "category", "classificationCode", "sourceUpdatedAt", "sourceUrl"] as const;
    const quoted = (name: string) => Prisma.raw(`"${name}"`);
    for (let offset = 0; offset < normalized.length; offset += 250) {
      const rows = normalized.slice(offset, offset + 250).map((item) => Prisma.sql`(
        ${randomUUID()}, ${organizationId}, ${year},
        ${Prisma.join(columns.map((column) => item[column]))},
        ${JSON.stringify(item.rawPayload)}::jsonb, ${synchronizedAt}, true
      )`);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PcaItem" ("id", "organizationId", "year", ${Prisma.join(columns.map(quoted))},
          "rawPayload", "synchronizedAt", "active") VALUES ${Prisma.join(rows)}
        ON CONFLICT ("organizationId", "year", "pncpItemId") DO UPDATE SET
          ${Prisma.join([...columns, "rawPayload", "synchronizedAt", "active"].map((column) =>
            Prisma.sql`${quoted(column)} = EXCLUDED.${quoted(column)}`))}
      `);
    }
  }, { timeout: 60_000 });

  return { count: normalized.length, synchronizedAt: synchronizedAt.toISOString() };
}
