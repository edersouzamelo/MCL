BEGIN;

ALTER TABLE "MonitorContentImport"
ADD COLUMN "importedByName" TEXT;

COMMIT;
