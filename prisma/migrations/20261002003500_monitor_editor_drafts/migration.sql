CREATE TABLE "MonitorEditorDraft" (
 "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "sceneId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1, "baseRevision" INTEGER NOT NULL, "base" JSONB NOT NULL, "patches" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MonitorEditorDraft_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "MonitorEditorDraft_importId_fkey" FOREIGN KEY ("importId") REFERENCES "MonitorContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MonitorEditorDraft_sceneId_actorId_key" ON "MonitorEditorDraft"("sceneId", "actorId");
CREATE INDEX "MonitorEditorDraft_importId_actorId_idx" ON "MonitorEditorDraft"("importId", "actorId");
