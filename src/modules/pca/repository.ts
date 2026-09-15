import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
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

  const records = await fetchPncpPcaByUasg({ year, uasg: organization.uasg, cnpj: organization.pncpCnpj });
  const normalized = records.map(normalizePncpPcaRecord);
  const synchronizedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.pcaItem.updateMany({ where: { organizationId, year }, data: { active: false } });
    for (const item of normalized) {
      const persisted = { ...item, rawPayload: item.rawPayload as Prisma.InputJsonValue };
      await tx.pcaItem.upsert({
        where: { organizationId_year_pncpItemId: { organizationId, year, pncpItemId: item.pncpItemId } },
        create: { organizationId, year, ...persisted, synchronizedAt, active: true },
        update: { ...persisted, synchronizedAt, active: true },
      });
    }
  });

  return { count: normalized.length, synchronizedAt: synchronizedAt.toISOString() };
}
