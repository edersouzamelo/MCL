import { createRequire } from "node:module";
import { createDemoState } from "../src/modules/demo/data";
import fs from "node:fs";
import path from "node:path";

// Load .env manually if it exists
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    for (const line of envFile.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("Failed to load .env file in seed:", e);
}

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const state = createDemoState();
type SeedModel = {
  deleteMany: () => Promise<unknown>;
  createMany: (args: { data: unknown }) => Promise<unknown>;
  create: (args: { data: unknown }) => Promise<unknown>;
};

async function main() {
  const client = prisma as unknown as Record<string, SeedModel>;
  
  // Exclusão em ordem de dependência (chaves estrangeiras)
  const deleteOrder = [
    "eventLog",
    "coverageResult",
    "coverageAnalysis",
    "procurementInstrumentItem",
    "procurementInstrument",
    "needItem",
    "catmatMapping",
    "item",
    "integrationLog",
    "integrationRun",
    "membership",
    "role",
    "auditLog",
    "arpUnitRecord",
    "itemCatalogMapping",
    "catalogSearchCandidate",
    "coverageQuery",
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
    if (client[model]) {
      await client[model].deleteMany();
    }
  }

  // Carga das tabelas legadas
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
  if (state.coverageQueries.length) {
    await client.coverageQuery.createMany({ data: state.coverageQueries });
  }
  if (state.catalogSearchCandidates.length) {
    await client.catalogSearchCandidate.createMany({ data: state.catalogSearchCandidates });
  }
  if (state.itemCatalogMappings.length) {
    await client.itemCatalogMapping.createMany({ data: state.itemCatalogMappings });
  }
  if (state.arpUnitRecords.length) {
    await client.arpUnitRecord.createMany({ data: state.arpUnitRecords });
  }
  
  await client.logisticsEvent.createMany({ data: state.events });
  await client.eventRelation.createMany({ data: state.eventRelations });
  await client.divergence.createMany({ data: state.divergences });
  await client.connectorHealth.createMany({ data: state.connectors });
  await client.quarantineRecord.createMany({ data: state.quarantine });
  await client.auditLog.createMany({ data: state.auditLogs });

  // Carga das novas tabelas do Sprint DB-0
  console.log("MCL: Iniciando carga de dados demonstrativos Sprint DB-0...");

  // 1. Roles
  await prisma.role.create({
    data: { id: "role-admin", name: "ADMIN", description: "Administrador do sistema" },
  });
  await prisma.role.create({
    data: { id: "role-auditor", name: "AUDITOR", description: "Auditor de conformidade" },
  });

  // 2. Memberships
  await prisma.membership.create({
    data: {
      id: "membership-1",
      userId: "user-demo-admin",
      organizationId: "org-provedor-alfa",
      roleId: "role-admin",
      status: "ACTIVE",
      active: true,
    },
  });
  await prisma.membership.create({
    data: {
      id: "membership-2",
      userId: "user-demo-auditor",
      organizationId: "org-provedor-alfa",
      roleId: "role-auditor",
      status: "ACTIVE",
      active: true,
    },
  });

  // 3. IntegrationRun & Logs
  const run = await prisma.integrationRun.create({
    data: {
      id: "run-demo-1",
      integrationKey: "MCL-CATMAT-SYNC",
      status: "SUCCESS",
      recordsTotal: 10,
      recordsSuccess: 10,
      recordsFailed: 0,
      errorMessage: null,
    },
  });
  await prisma.integrationLog.create({
    data: {
      id: "log-demo-1",
      runId: run.id,
      level: "INFO",
      message: "Conexao estabelecida com o CATMAT",
      sourceSystem: "CATMAT-EXTERNO",
      sourceRecordId: "CONN-100",
      payloadSanitized: { connection: "OK" },
    },
  });

  // 4. Items & CatmatMappings
  const item = await prisma.item.create({
    data: {
      id: "item-demo-coturno",
      code: "CATMAT-12345",
      name: "Coturno operacional preto",
      description: "Coturno padrão de fardamento do MCL",
      category: "FARDAMENTO",
      active: true,
      sourceSystem: "CATMAT",
      sourceRecordId: "CATMAT-12345",
    },
  });
  await prisma.catmatMapping.create({
    data: {
      id: "mapping-demo-1",
      itemId: item.id,
      catmatCode: "12345",
      description: "Coturno de Fardamento",
      confidence: 1.0,
      status: "ACTIVE",
      justification: "Mapeamento oficial direto do catalogo",
    },
  });

  // 5. NeedItem
  await prisma.needItem.create({
    data: {
      id: "needitem-demo-1",
      needId: "need-coturno-200",
      itemId: item.id,
      quantity: 200,
      unit: "par",
      status: "PENDING",
    },
  });

  // 6. ProcurementInstrument & ProcurementInstrumentItem
  const instrument = await prisma.procurementInstrument.create({
    data: {
      id: "instrument-demo-1",
      type: "ATA",
      code: "ARP-2026-0001",
      organizationId: "org-provedor-alfa",
      status: "ACTIVE",
      validFrom: new Date("2026-01-01T00:00:00Z"),
      validUntil: new Date("2026-12-31T23:59:59Z"),
    },
  });
  const instrumentItem = await prisma.procurementInstrumentItem.create({
    data: {
      id: "instrument-item-demo-1",
      procurementInstrumentId: instrument.id,
      itemId: item.id,
      quantity: 1000,
      unitValue: 150.0,
      totalValue: 150000.0,
      unit: "par",
    },
  });

  // 7. CoverageAnalysis & CoverageResult
  const analysis = await prisma.coverageAnalysis.create({
    data: {
      id: "analysis-demo-1",
      needId: "need-coturno-200",
      status: "SUCCESS",
      startedBy: "user-demo-admin",
    },
  });
  await prisma.coverageResult.create({
    data: {
      id: "result-demo-1",
      coverageAnalysisId: analysis.id,
      itemId: item.id,
      quantityCovered: 200,
      deficitQuantity: 0,
      unit: "par",
      instrumentId: instrument.id,
      instrumentItemId: instrumentItem.id,
      confidence: 0.95,
      sourceSystem: "MCL-COVERAGE",
      sourceRecordId: "COV-001",
    },
  });

  // 8. EventLog
  await prisma.eventLog.create({
    data: {
      id: "event-demo-1",
      eventType: "SYNC_COMPLETE",
      objectType: "Item",
      objectId: item.id,
      occurredAt: new Date(),
      sourceSystem: "MCL",
      sourceRecordId: "EVT-100",
      actorId: "user-demo-admin",
      schemaVersion: "1.0",
      integrityStatus: "VALID",
      idempotencyKey: "idem-key-seed-001",
      relatedObjects: ["run-demo-1"],
      quantityValue: 10,
      quantityUnit: "unidades",
    },
  });

  // 9. AuditLog
  await prisma.auditLog.create({
    data: {
      id: "audit-demo-sprint-db0",
      occurredAt: new Date(),
      actorId: "user-demo-admin",
      action: "SEED_DB0",
      resourceType: "Database",
      resourceId: "MCL-DB",
      organizationId: "org-provedor-alfa",
      requestId: "req-seed-db0",
      sourceIpHash: "sha256-localhost",
      userAgent: "MCL-Seed-Script",
      outcome: "SUCCESS",
      reason: "Sprint DB-0 data seeding successfully completed",
      metadata: { sprint: "DB-0" },
    },
  });

  console.log("Seed MCL v0.1.0 concluido com dados sinteticos e persistência de dados Sprint DB-0.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
