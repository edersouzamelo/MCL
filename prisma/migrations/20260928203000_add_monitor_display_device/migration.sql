BEGIN;

CREATE TABLE "MonitorDisplayDevice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "monitorId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "enrolledBy" TEXT NOT NULL,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "MonitorDisplayDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonitorDisplayDevice_monitorId_check" CHECK ("monitorId" BETWEEN 1 AND 8)
);
CREATE UNIQUE INDEX "MonitorDisplayDevice_tokenHash_key" ON "MonitorDisplayDevice"("tokenHash");
CREATE INDEX "MonitorDisplayDevice_organizationId_monitorId_revokedAt_idx" ON "MonitorDisplayDevice"("organizationId","monitorId","revokedAt");
ALTER TABLE "MonitorDisplayDevice" ADD CONSTRAINT "MonitorDisplayDevice_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
