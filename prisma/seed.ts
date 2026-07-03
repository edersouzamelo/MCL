import { createRequire } from "node:module";
import { createDemoState } from "../src/modules/demo/data";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => { $disconnect: () => Promise<void> } };
const prisma = new PrismaClient();
const state = createDemoState();
type SeedModel = {
  deleteMany: () => Promise<unknown>;
  createMany: (args: { data: unknown }) => Promise<unknown>;
};

async function main() {
  const client = prisma as unknown as Record<string, SeedModel>;
  const deleteOrder = [
    "auditLog",
    "connectorRun",
    "externalRecord",
    "quarantineRecord",
    "connectorHealth",
    "divergence",
    "eventRelation",
    "logisticsEvent",
    "objectLink",
    "documentReference",
    "shipmentUnit",
    "shipment",
    "logisticsUnit",
    "location",
    "lot",
    "needCoverage",
    "commitment",
    "acquisitionInstrument",
    "credit",
    "need",
    "itemVariant",
    "supplyItem",
    "userScope",
    "user",
    "organization",
  ];

  for (const model of deleteOrder) {
    await client[model].deleteMany();
  }

  await client.organization.createMany({ data: state.organizations });
  await client.user.createMany({ data: state.users });
  await client.userScope.createMany({ data: state.userScopes });
  await client.supplyItem.createMany({ data: state.supplyItems });
  await client.itemVariant.createMany({ data: state.itemVariants });
  await client.need.createMany({ data: state.needs });
  await client.credit.createMany({ data: state.credits });
  await client.acquisitionInstrument.createMany({ data: state.acquisitionInstruments });
  await client.commitment.createMany({ data: state.commitments });
  await client.needCoverage.createMany({ data: state.needCoverages });
  await client.lot.createMany({ data: state.lots });
  await client.location.createMany({ data: state.locations });
  await client.logisticsUnit.createMany({ data: state.logisticsUnits });
  await client.shipment.createMany({ data: state.shipments });
  await client.shipmentUnit.createMany({ data: state.shipmentUnits });
  await client.documentReference.createMany({ data: state.documents });
  await client.objectLink.createMany({ data: state.objectLinks });
  if (state.externalRecords.length) {
    await client.externalRecord.createMany({ data: state.externalRecords });
  }
  if (state.connectorRuns.length) {
    await client.connectorRun.createMany({ data: state.connectorRuns });
  }
  await client.logisticsEvent.createMany({ data: state.events });
  await client.eventRelation.createMany({ data: state.eventRelations });
  await client.divergence.createMany({ data: state.divergences });
  await client.connectorHealth.createMany({ data: state.connectors });
  await client.quarantineRecord.createMany({ data: state.quarantine });
  await client.auditLog.createMany({ data: state.auditLogs });

  console.log("Seed MCL v0.1.0 concluido com dados sinteticos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
