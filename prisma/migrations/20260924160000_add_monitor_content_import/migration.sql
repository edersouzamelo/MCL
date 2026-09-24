BEGIN;

CREATE TABLE "MonitorContentUploadChunk" (
  "uploadId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "chunkCount" INTEGER NOT NULL,
  "organizationId" TEXT NOT NULL,
  "monitorId" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "totalSize" INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonitorContentUploadChunk_pkey" PRIMARY KEY ("uploadId", "chunkIndex")
);
CREATE INDEX "MonitorContentUploadChunk_organizationId_createdAt_idx"
ON "MonitorContentUploadChunk"("organizationId", "createdAt");

CREATE TABLE "MonitorContentImport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "monitorId" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW',
  "sceneCount" INTEGER NOT NULL,
  "warnings" JSONB NOT NULL,
  "rawFile" BYTEA NOT NULL,
  "importedBy" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "archivedBy" TEXT,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "MonitorContentImport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonitorContentImport_status_check" CHECK ("status" IN ('PREVIEW','APPROVED','ARCHIVED'))
);
CREATE UNIQUE INDEX "MonitorContentImport_organizationId_monitorId_checksum_key"
ON "MonitorContentImport"("organizationId","monitorId","checksum");
CREATE INDEX "MonitorContentImport_organizationId_monitorId_status_importedAt_idx"
ON "MonitorContentImport"("organizationId","monitorId","status","importedAt" DESC);
ALTER TABLE "MonitorContentImport"
ADD CONSTRAINT "MonitorContentImport_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MonitorContentScene" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "sceneOrder" INTEGER NOT NULL,
  "sceneType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "sourcePage" INTEGER,
  "durationSeconds" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "MonitorContentScene_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonitorContentScene_type_check" CHECK ("sceneType" IN ('TEXT','TABLE','CHART','FIGURE'))
);
CREATE UNIQUE INDEX "MonitorContentScene_importId_sceneOrder_key"
ON "MonitorContentScene"("importId","sceneOrder");
CREATE INDEX "MonitorContentScene_importId_active_sceneOrder_idx"
ON "MonitorContentScene"("importId","active","sceneOrder");
ALTER TABLE "MonitorContentScene"
ADD CONSTRAINT "MonitorContentScene_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "MonitorContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MonitorContentAsset" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonitorContentAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MonitorContentAsset_importId_idx" ON "MonitorContentAsset"("importId");
ALTER TABLE "MonitorContentAsset"
ADD CONSTRAINT "MonitorContentAsset_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "MonitorContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitorContentUploadChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MonitorContentImport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MonitorContentScene" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MonitorContentAsset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MonitorContentUploadChunk","MonitorContentImport","MonitorContentScene","MonitorContentAsset" FROM anon, authenticated;

COMMIT;
