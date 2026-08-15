CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngestionSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Ingestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceLabel" TEXT,
    "originalFilename" TEXT NOT NULL,
    "originalFileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "schemaId" TEXT,
    "pipelineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "conversationId" TEXT,
    "recordingData" BLOB,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" DATETIME,
    "processingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingestion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ingestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ingestion_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ingestion_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ingestion_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IngestionSource_keyHash_key" ON "IngestionSource"("keyHash");
CREATE UNIQUE INDEX "IngestionSource_userId_name_key" ON "IngestionSource"("userId", "name");
CREATE INDEX "IngestionSource_userId_enabled_idx" ON "IngestionSource"("userId", "enabled");
CREATE INDEX "IngestionSource_keyPrefix_idx" ON "IngestionSource"("keyPrefix");
CREATE UNIQUE INDEX "Ingestion_conversationId_key" ON "Ingestion"("conversationId");
CREATE UNIQUE INDEX "Ingestion_sourceId_externalId_key" ON "Ingestion"("sourceId", "externalId");
CREATE INDEX "Ingestion_userId_receivedAt_idx" ON "Ingestion"("userId", "receivedAt");
CREATE INDEX "Ingestion_sourceId_status_receivedAt_idx" ON "Ingestion"("sourceId", "status", "receivedAt");
