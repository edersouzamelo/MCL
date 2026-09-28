BEGIN;

CREATE TABLE "CcoMonitorConfiguration" (
  "organizationId" TEXT NOT NULL,
  "monitorId" INTEGER NOT NULL,
  "configuration" JSONB NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CcoMonitorConfiguration_pkey" PRIMARY KEY ("organizationId", "monitorId"),
  CONSTRAINT "CcoMonitorConfiguration_monitorId_check" CHECK ("monitorId" BETWEEN 1 AND 8)
);
ALTER TABLE "CcoMonitorConfiguration" ADD CONSTRAINT "CcoMonitorConfiguration_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitorContentImport" DROP CONSTRAINT IF EXISTS "MonitorContentImport_status_check";
ALTER TABLE "MonitorContentImport" ADD CONSTRAINT "MonitorContentImport_status_check"
CHECK ("status" IN ('PREVIEW','APPROVED','ARCHIVED','REJECTED'));

COMMIT;
