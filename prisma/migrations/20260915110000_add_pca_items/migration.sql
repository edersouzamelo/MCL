ALTER TABLE "Organization" ADD COLUMN "pncpUserId" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "pncpCnpj" TEXT;

CREATE TABLE "PcaItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pncpControlNumber" TEXT,
    "pncpItemId" TEXT NOT NULL,
    "itemNumber" INTEGER,
    "catalogCode" TEXT,
    "catalogType" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "estimatedQuantity" DECIMAL(65,30),
    "estimatedUnitValue" DECIMAL(65,30),
    "estimatedTotalValue" DECIMAL(65,30),
    "expectedContractingDate" TIMESTAMP(3),
    "category" TEXT,
    "classificationCode" TEXT,
    "rawPayload" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "synchronizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PcaItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PcaItem_organizationId_year_pncpItemId_key" ON "PcaItem"("organizationId", "year", "pncpItemId");
CREATE INDEX "PcaItem_organizationId_year_active_idx" ON "PcaItem"("organizationId", "year", "active");
CREATE INDEX "PcaItem_catalogCode_idx" ON "PcaItem"("catalogCode");
ALTER TABLE "PcaItem" ADD CONSTRAINT "PcaItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
