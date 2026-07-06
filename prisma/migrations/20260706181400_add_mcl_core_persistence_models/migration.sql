-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationRun" (
    "id" TEXT NOT NULL,
    "integrationKey" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsSuccess" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "payloadSanitized" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatmatMapping" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "catmatCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "MappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "justification" TEXT,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatmatMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedItem" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementInstrument" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "ProcurementStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementInstrumentItem" (
    "id" TEXT NOT NULL,
    "procurementInstrumentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitValue" DECIMAL(65,30) NOT NULL,
    "totalValue" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementInstrumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageAnalysis" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "status" "CoverageStatus" NOT NULL DEFAULT 'PENDING',
    "startedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageResult" (
    "id" TEXT NOT NULL,
    "coverageAnalysisId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityCovered" DECIMAL(65,30) NOT NULL,
    "deficitQuantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "instrumentId" TEXT,
    "instrumentItemId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceSystem" TEXT NOT NULL DEFAULT 'MCL',
    "sourceRecordId" TEXT,
    "actorId" TEXT,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "integrityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "relatedObjects" JSONB,
    "quantityValue" DECIMAL(65,30),
    "quantityUnit" TEXT,
    "locationId" TEXT,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");

-- CreateIndex
CREATE INDEX "Membership_roleId_idx" ON "Membership"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_roleId_key" ON "Membership"("userId", "organizationId", "roleId");

-- CreateIndex
CREATE INDEX "IntegrationRun_integrationKey_status_idx" ON "IntegrationRun"("integrationKey", "status");

-- CreateIndex
CREATE INDEX "IntegrationLog_runId_idx" ON "IntegrationLog"("runId");

-- CreateIndex
CREATE INDEX "IntegrationLog_level_idx" ON "IntegrationLog"("level");

-- CreateIndex
CREATE INDEX "Item_code_idx" ON "Item"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_sourceSystem_sourceRecordId_key" ON "Item"("sourceSystem", "sourceRecordId");

-- CreateIndex
CREATE INDEX "CatmatMapping_itemId_idx" ON "CatmatMapping"("itemId");

-- CreateIndex
CREATE INDEX "CatmatMapping_catmatCode_idx" ON "CatmatMapping"("catmatCode");

-- CreateIndex
CREATE UNIQUE INDEX "CatmatMapping_itemId_catmatCode_key" ON "CatmatMapping"("itemId", "catmatCode");

-- CreateIndex
CREATE INDEX "NeedItem_needId_idx" ON "NeedItem"("needId");

-- CreateIndex
CREATE INDEX "NeedItem_itemId_idx" ON "NeedItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementInstrument_code_key" ON "ProcurementInstrument"("code");

-- CreateIndex
CREATE INDEX "ProcurementInstrument_organizationId_idx" ON "ProcurementInstrument"("organizationId");

-- CreateIndex
CREATE INDEX "ProcurementInstrumentItem_procurementInstrumentId_idx" ON "ProcurementInstrumentItem"("procurementInstrumentId");

-- CreateIndex
CREATE INDEX "ProcurementInstrumentItem_itemId_idx" ON "ProcurementInstrumentItem"("itemId");

-- CreateIndex
CREATE INDEX "CoverageAnalysis_needId_idx" ON "CoverageAnalysis"("needId");

-- CreateIndex
CREATE INDEX "CoverageResult_coverageAnalysisId_idx" ON "CoverageResult"("coverageAnalysisId");

-- CreateIndex
CREATE INDEX "CoverageResult_itemId_idx" ON "CoverageResult"("itemId");

-- CreateIndex
CREATE INDEX "CoverageResult_instrumentId_idx" ON "CoverageResult"("instrumentId");

-- CreateIndex
CREATE INDEX "CoverageResult_instrumentItemId_idx" ON "CoverageResult"("instrumentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EventLog_idempotencyKey_key" ON "EventLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE INDEX "EventLog_objectType_objectId_idx" ON "EventLog"("objectType", "objectId");

-- CreateIndex
CREATE INDEX "EventLog_occurredAt_idx" ON "EventLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IntegrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatmatMapping" ADD CONSTRAINT "CatmatMapping_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedItem" ADD CONSTRAINT "NeedItem_needId_fkey" FOREIGN KEY ("needId") REFERENCES "Need"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedItem" ADD CONSTRAINT "NeedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementInstrument" ADD CONSTRAINT "ProcurementInstrument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementInstrumentItem" ADD CONSTRAINT "ProcurementInstrumentItem_procurementInstrumentId_fkey" FOREIGN KEY ("procurementInstrumentId") REFERENCES "ProcurementInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementInstrumentItem" ADD CONSTRAINT "ProcurementInstrumentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageAnalysis" ADD CONSTRAINT "CoverageAnalysis_needId_fkey" FOREIGN KEY ("needId") REFERENCES "Need"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageResult" ADD CONSTRAINT "CoverageResult_coverageAnalysisId_fkey" FOREIGN KEY ("coverageAnalysisId") REFERENCES "CoverageAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageResult" ADD CONSTRAINT "CoverageResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageResult" ADD CONSTRAINT "CoverageResult_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "ProcurementInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageResult" ADD CONSTRAINT "CoverageResult_instrumentItemId_fkey" FOREIGN KEY ("instrumentItemId") REFERENCES "ProcurementInstrumentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
