CREATE TABLE "MonitorContentRevision" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "compilerVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "scenes" JSONB NOT NULL,
  CONSTRAINT "MonitorContentRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonitorContentRevision_importId_fkey" FOREIGN KEY ("importId") REFERENCES "MonitorContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MonitorContentRevision_importId_createdAt_idx" ON "MonitorContentRevision"("importId", "createdAt");
CREATE TABLE "MonitorCompilerDecision" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "decision" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonitorCompilerDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonitorCompilerDecision_organizationId_cacheKey_key" ON "MonitorCompilerDecision"("organizationId", "cacheKey");
