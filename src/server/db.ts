/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { createDemoState } from "@/modules/demo/data";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

async function ensureDatabaseSeeded(client: PrismaClient) {
  try {
    if (globalThis.hasOwnProperty("__db_seeded")) {
      return;
    }
    
    // Verifica a contagem de usuários como indicador se o banco está vazio
    const userCount = await client.user.count();
    if (userCount > 0) {
      (globalThis as any).__db_seeded = true;
      console.log("MCL: Banco de dados ja contem registros. Pulando seed.");
      return;
    }
    
    console.log("MCL: Banco de dados vazio detectado. Iniciando auto-seed...");
    const state = createDemoState();
    
    // Seed em ordem de dependência (copiado de prisma/seed.ts)
    await client.organization.createMany({ data: state.organizations as any });
    await client.user.createMany({ data: state.users as any });
    await client.userScope.createMany({ data: state.userScopes as any });
    await client.supplyItem.createMany({ data: state.supplyItems as any });
    await client.itemVariant.createMany({ data: state.itemVariants as any });
    await client.need.createMany({ data: state.needs as any });
    await client.credit.createMany({ data: state.credits as any });
    await client.acquisitionInstrument.createMany({ data: state.acquisitionInstruments as any });
    await client.commitment.createMany({ data: state.commitments as any });
    await client.needCoverage.createMany({ data: state.needCoverages as any });
    await client.lot.createMany({ data: state.lots as any });
    await client.location.createMany({ data: state.locations as any });
    await client.logisticsUnit.createMany({ data: state.logisticsUnits as any });
    await client.shipment.createMany({ data: state.shipments as any });
    await client.shipmentUnit.createMany({ data: state.shipmentUnits as any });
    await client.documentReference.createMany({ data: state.documents as any });
    await client.objectLink.createMany({ data: state.objectLinks as any });
    
    if (state.externalRecords.length) {
      await client.externalRecord.createMany({ data: state.externalRecords as any });
    }
    if (state.connectorRuns.length) {
      await client.connectorRun.createMany({ data: state.connectorRuns as any });
    }
    if (state.coverageQueries.length) {
      await client.coverageQuery.createMany({ data: state.coverageQueries as any });
    }
    if (state.catalogSearchCandidates.length) {
      await client.catalogSearchCandidate.createMany({ data: state.catalogSearchCandidates as any });
    }
    if (state.itemCatalogMappings.length) {
      await client.itemCatalogMapping.createMany({ data: state.itemCatalogMappings as any });
    }
    if (state.arpUnitRecords.length) {
      await client.arpUnitRecord.createMany({ data: state.arpUnitRecords as any });
    }
    
    await client.logisticsEvent.createMany({ data: state.events as any });
    await client.eventRelation.createMany({ data: state.eventRelations as any });
    await client.divergence.createMany({ data: state.divergences as any });
    await client.connectorHealth.createMany({ data: state.connectors as any });
    await client.quarantineRecord.createMany({ data: state.quarantine as any });
    await client.auditLog.createMany({ data: state.auditLogs as any });
    
    (globalThis as any).__db_seeded = true;
    console.log("MCL: Auto-seed concluido com sucesso!");
  } catch (err) {
    console.error("MCL: Falha no auto-seed do banco:", err);
  }
}

// Instanciação preguiçosa (Lazy) do PrismaClient usando Proxy JavaScript.
// Evita a validação de construtor do Prisma 7 durante a execução de testes em memória (sem DATABASE_URL).
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error(
          "DATABASE_URL nao configurada. O PrismaClient nao pode ser instanciado no modo de fallback em memoria."
        );
      }

      globalForPrisma.prisma = new PrismaClient({
        accelerateUrl: dbUrl,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      } as any);

      // Roda o seed em background
      ensureDatabaseSeeded(globalForPrisma.prisma);
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
