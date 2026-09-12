CREATE TABLE "TgUploadChunk" (
    "uploadId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "emailReceivedAt" TIMESTAMP(3),
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgUploadChunk_pkey" PRIMARY KEY ("uploadId", "chunkIndex")
);

CREATE INDEX "TgUploadChunk_createdAt_idx" ON "TgUploadChunk"("createdAt");
