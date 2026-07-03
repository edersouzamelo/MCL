-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('COMMAND_VIEWER', 'LOGISTICS_MANAGER', 'WAREHOUSE_OPERATOR', 'AUDITOR', 'ADMIN', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "DataNature" AS ENUM ('validado', 'informado', 'calculado', 'estimado', 'divergente', 'pendente');

-- CreateEnum
CREATE TYPE "SourceOrigin" AS ENUM ('PUBLICO', 'SINTETICO', 'MANUAL', 'CALCULADO');

-- CreateEnum
CREATE TYPE "ExternalProcessingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'UPDATED', 'DUPLICATE', 'REJECTED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "ConnectorRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CatalogMappingStatus" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CoverageQueryKind" AS ENUM ('CATMAT_SEARCH', 'ARP_SEARCH', 'ARP_UNITS');

-- CreateEnum
CREATE TYPE "CoverageQueryStatus" AS ENUM ('SUCCESS', 'FAILED', 'NO_RESULTS', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LogisticsUnitState" AS ENUM ('IDENTIFICADO', 'AGUARDANDO_INSPECAO', 'DISPONIVEL', 'ARMAZENADO', 'RESERVADO', 'SEPARADO', 'EM_TRANSITO', 'ENTREGUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserScope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplyClass" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplyClass" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "sourceOrigin" "SourceOrigin",
    "sourceUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVariant" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Need" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemVariantId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityApproved" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "requiredAt" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "authorityLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "dataNature" "DataNature" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Need_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "availableAmount" DECIMAL(65,30) NOT NULL,
    "planningCode" TEXT NOT NULL,
    "expenseNature" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "dataNature" "DataNature" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionInstrument" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierNameSynthetic" TEXT,
    "supplierName" TEXT,
    "supplierDocument" TEXT,
    "organizationName" TEXT,
    "organizationCode" TEXT,
    "itemDescription" TEXT,
    "itemCode" TEXT,
    "quantity" DECIMAL(65,30),
    "unitValue" DECIMAL(65,30),
    "totalValue" DECIMAL(65,30),
    "sourceOrigin" "SourceOrigin",
    "sourceUrl" TEXT,
    "externalReference" TEXT,
    "lastSourceUpdateAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,

    CONSTRAINT "AcquisitionInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "acquisitionInstrumentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedCoverage" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "creditId" TEXT,
    "commitmentId" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "NeedCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "itemVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "manufacturedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "supplierReferenceSynthetic" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsUnit" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "itemVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "currentState" "LogisticsUnitState" NOT NULL,
    "currentLocationId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sourceEventId" TEXT,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "dataNature" "DataNature" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "originOrganizationId" TEXT NOT NULL,
    "destinationOrganizationId" TEXT NOT NULL,
    "plannedDepartureAt" TIMESTAMP(3) NOT NULL,
    "actualDepartureAt" TIMESTAMP(3),
    "expectedDeliveryAt" TIMESTAMP(3) NOT NULL,
    "actualDeliveryAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "transportReferenceSynthetic" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentUnit" (
    "shipmentId" TEXT NOT NULL,
    "logisticsUnitId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShipmentUnit_pkey" PRIMARY KEY ("shipmentId","logisticsUnitId")
);

-- CreateTable
CREATE TABLE "DocumentReference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "classificationLabel" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectLink" (
    "id" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "actorId" TEXT,
    "justification" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceOrigin" "SourceOrigin",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsEvent" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "locationId" TEXT,
    "condition" TEXT,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "authorityLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dataNature" "DataNature" NOT NULL,
    "payload" JSONB NOT NULL,
    "correctionOfEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRelation" (
    "eventId" TEXT NOT NULL,
    "relatedObjectType" TEXT NOT NULL,
    "relatedObjectId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,

    CONSTRAINT "EventRelation_pkey" PRIMARY KEY ("eventId","relatedObjectType","relatedObjectId","relationType")
);

-- CreateTable
CREATE TABLE "Divergence" (
    "id" TEXT NOT NULL,
    "persistentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "observed" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "correctedByEventId" TEXT,

    CONSTRAINT "Divergence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorHealth" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "latencyMs" INTEGER NOT NULL,
    "recordsImported" INTEGER NOT NULL,
    "quarantinedRecords" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "endpoint" TEXT,
    "recordsRead" INTEGER,
    "acceptedRecords" INTEGER,
    "updatedRecords" INTEGER,
    "duplicateRecords" INTEGER,
    "rejectedRecords" INTEGER,
    "durationMs" INTEGER,
    "mappingVersion" TEXT,
    "lastRunId" TEXT,

    CONSTRAINT "ConnectorHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarantineRecord" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarantineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalRecord" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "schemaVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "processingStatus" "ExternalProcessingStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorRun" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "ConnectorRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "endpoint" TEXT NOT NULL,
    "recordsRead" INTEGER NOT NULL,
    "acceptedRecords" INTEGER NOT NULL,
    "updatedRecords" INTEGER NOT NULL,
    "duplicateRecords" INTEGER NOT NULL,
    "rejectedRecords" INTEGER NOT NULL,
    "quarantinedRecords" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "mappingVersion" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "ConnectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageQuery" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "kind" "CoverageQueryKind" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "CoverageQueryStatus" NOT NULL,
    "recordsRead" INTEGER NOT NULL,
    "sourceUrl" TEXT,
    "errorMessage" TEXT,
    "actorId" TEXT,
    "externalCatalog" TEXT,
    "externalItemCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "staleAt" TIMESTAMP(3),

    CONSTRAINT "CoverageQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSearchCandidate" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "externalCatalog" TEXT NOT NULL,
    "externalItemCode" TEXT NOT NULL,
    "externalDescription" TEXT NOT NULL,
    "groupCode" TEXT,
    "classCode" TEXT,
    "pdmCode" TEXT,
    "statusItem" BOOLEAN,
    "sourceSystem" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "similarityExplanation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "CatalogSearchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCatalogMapping" (
    "id" TEXT NOT NULL,
    "mclItemId" TEXT NOT NULL,
    "mclVariantId" TEXT,
    "needId" TEXT,
    "externalCatalog" TEXT NOT NULL,
    "externalItemCode" TEXT NOT NULL,
    "externalDescription" TEXT NOT NULL,
    "groupCode" TEXT,
    "classCode" TEXT,
    "pdmCode" TEXT,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "justification" TEXT NOT NULL,
    "status" "CatalogMappingStatus" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "mappingVersion" INTEGER NOT NULL,
    "replacesMappingId" TEXT,
    "sourceCandidateId" TEXT,

    CONSTRAINT "ItemCatalogMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArpUnitRecord" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "acquisitionInstrumentId" TEXT NOT NULL,
    "numeroAta" TEXT NOT NULL,
    "unidadeGerenciadora" TEXT NOT NULL,
    "numeroItem" TEXT NOT NULL,
    "codigoUnidade" TEXT,
    "nomeUnidade" TEXT,
    "tipoUnidade" TEXT,
    "fornecedor" TEXT,
    "quantidadeRegistrada" DECIMAL(65,30),
    "saldoAdesoes" DECIMAL(65,30),
    "saldoRemanejamentoEmpenho" DECIMAL(65,30),
    "qtdLimiteAdesao" DECIMAL(65,30),
    "qtdLimiteInformadoCompra" DECIMAL(65,30),
    "aceitaAdesao" BOOLEAN,
    "sourceUrl" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ArpUnitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "organizationId" TEXT,
    "requestId" TEXT NOT NULL,
    "sourceIpHash" TEXT,
    "userAgent" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCoverageAnalysis" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "variantId" TEXT,
    "status" TEXT NOT NULL,
    "deficitQuantity" INTEGER NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "availableStockQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL,
    "confirmedCatalogMappingId" TEXT,
    "startedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastRefreshAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL,
    "summaryVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCoverageAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionCoverageCandidate" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "acquisitionInstrumentId" TEXT NOT NULL,
    "externalItemCode" TEXT NOT NULL,
    "potentialQuantity" INTEGER NOT NULL,
    "committedQuantity" INTEGER,
    "reportedBalance" INTEGER,
    "unitValue" DOUBLE PRECISION,
    "validityStatus" TEXT NOT NULL,
    "evidenceLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "limitations" TEXT[],
    "selectedByUser" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionCoverageCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyItem_persistentCode_key" ON "SupplyItem"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "ItemVariant_sku_key" ON "ItemVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Need_persistentCode_key" ON "Need"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_persistentCode_key" ON "Credit"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionInstrument_persistentCode_key" ON "AcquisitionInstrument"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Commitment_persistentCode_key" ON "Commitment"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_persistentCode_key" ON "Lot"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsUnit_persistentCode_key" ON "LogisticsUnit"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsUnit_qrToken_key" ON "LogisticsUnit"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_persistentCode_key" ON "Shipment"("persistentCode");

-- CreateIndex
CREATE INDEX "ObjectLink_fromType_fromId_idx" ON "ObjectLink"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "ObjectLink_toType_toId_idx" ON "ObjectLink"("toType", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsEvent_persistentCode_key" ON "LogisticsEvent"("persistentCode");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsEvent_idempotencyKey_key" ON "LogisticsEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LogisticsEvent_objectType_objectId_idx" ON "LogisticsEvent"("objectType", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "Divergence_persistentCode_key" ON "Divergence"("persistentCode");

-- CreateIndex
CREATE INDEX "ExternalRecord_connectorId_processingStatus_idx" ON "ExternalRecord"("connectorId", "processingStatus");

-- CreateIndex
CREATE INDEX "ExternalRecord_payloadHash_idx" ON "ExternalRecord"("payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRecord_connectorId_externalType_externalId_key" ON "ExternalRecord"("connectorId", "externalType", "externalId");

-- CreateIndex
CREATE INDEX "ConnectorRun_connectorId_startedAt_idx" ON "ConnectorRun"("connectorId", "startedAt");

-- CreateIndex
CREATE INDEX "CoverageQuery_needId_kind_startedAt_idx" ON "CoverageQuery"("needId", "kind", "startedAt");

-- CreateIndex
CREATE INDEX "CoverageQuery_externalCatalog_externalItemCode_idx" ON "CoverageQuery"("externalCatalog", "externalItemCode");

-- CreateIndex
CREATE INDEX "CatalogSearchCandidate_needId_queryId_idx" ON "CatalogSearchCandidate"("needId", "queryId");

-- CreateIndex
CREATE INDEX "CatalogSearchCandidate_externalCatalog_externalItemCode_idx" ON "CatalogSearchCandidate"("externalCatalog", "externalItemCode");

-- CreateIndex
CREATE INDEX "ItemCatalogMapping_mclItemId_mclVariantId_status_idx" ON "ItemCatalogMapping"("mclItemId", "mclVariantId", "status");

-- CreateIndex
CREATE INDEX "ItemCatalogMapping_needId_status_idx" ON "ItemCatalogMapping"("needId", "status");

-- CreateIndex
CREATE INDEX "ItemCatalogMapping_externalCatalog_externalItemCode_idx" ON "ItemCatalogMapping"("externalCatalog", "externalItemCode");

-- CreateIndex
CREATE INDEX "ArpUnitRecord_numeroAta_unidadeGerenciadora_numeroItem_idx" ON "ArpUnitRecord"("numeroAta", "unidadeGerenciadora", "numeroItem");

-- CreateIndex
CREATE UNIQUE INDEX "ArpUnitRecord_needId_acquisitionInstrumentId_codigoUnidade_key" ON "ArpUnitRecord"("needId", "acquisitionInstrumentId", "codigoUnidade");

-- CreateIndex
CREATE INDEX "MaterialCoverageAnalysis_needId_idx" ON "MaterialCoverageAnalysis"("needId");

-- CreateIndex
CREATE INDEX "MaterialCoverageAnalysis_itemId_idx" ON "MaterialCoverageAnalysis"("itemId");

-- CreateIndex
CREATE INDEX "AcquisitionCoverageCandidate_analysisId_idx" ON "AcquisitionCoverageCandidate"("analysisId");

-- CreateIndex
CREATE INDEX "AcquisitionCoverageCandidate_acquisitionInstrumentId_idx" ON "AcquisitionCoverageCandidate"("acquisitionInstrumentId");

-- AddForeignKey
ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVariant" ADD CONSTRAINT "ItemVariant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "SupplyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_itemVariantId_fkey" FOREIGN KEY ("itemVariantId") REFERENCES "ItemVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_itemVariantId_fkey" FOREIGN KEY ("itemVariantId") REFERENCES "ItemVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
