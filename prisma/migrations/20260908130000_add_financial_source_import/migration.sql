CREATE TABLE "FinancialSourceImport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "ingestionMethod" TEXT NOT NULL,
    "importedBy" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialSourceImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialSourceImport_organizationId_sourceKind_checksum_key"
ON "FinancialSourceImport"("organizationId", "sourceKind", "checksum");

CREATE INDEX "FinancialSourceImport_organizationId_sourceKind_importedAt_idx"
ON "FinancialSourceImport"("organizationId", "sourceKind", "importedAt");

ALTER TABLE "FinancialSourceImport"
ADD CONSTRAINT "FinancialSourceImport_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
