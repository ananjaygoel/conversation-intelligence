-- Production PostgreSQL baseline for the V0–V3 data model.
-- The existing prisma/migrations chain remains the SQLite development chain.

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtractionSchema" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schemaDefinition" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtractionSchema_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "originalFileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
    "transcript" TEXT NOT NULL,
    "structuredData" TEXT NOT NULL,
    "schemaId" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "transcriptionCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extractionCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedApiCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IngestionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ingestion" (
    "id" TEXT NOT NULL,
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
    "recordingData" BYTEA,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ingestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectorConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "credentials" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConnectorConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaId" TEXT,
    "connectorType" TEXT NOT NULL,
    "connectionId" TEXT,
    "connectorConfig" TEXT NOT NULL,
    "fieldMappings" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineDelivery" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseStatus" INTEGER,
    "responseBodySummary" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    CONSTRAINT "PipelineDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "ExtractionSchema_userId_createdAt_idx" ON "ExtractionSchema"("userId", "createdAt");
CREATE UNIQUE INDEX "ExtractionSchema_userId_name_key" ON "ExtractionSchema"("userId", "name");
CREATE UNIQUE INDEX "ExtractionSchema_userId_systemKey_key" ON "ExtractionSchema"("userId", "systemKey");
CREATE INDEX "Conversation_userId_createdAt_idx" ON "Conversation"("userId", "createdAt");
CREATE INDEX "Conversation_userId_schemaId_idx" ON "Conversation"("userId", "schemaId");
CREATE UNIQUE INDEX "IngestionSource_keyHash_key" ON "IngestionSource"("keyHash");
CREATE INDEX "IngestionSource_userId_enabled_idx" ON "IngestionSource"("userId", "enabled");
CREATE INDEX "IngestionSource_keyPrefix_idx" ON "IngestionSource"("keyPrefix");
CREATE UNIQUE INDEX "IngestionSource_userId_name_key" ON "IngestionSource"("userId", "name");
CREATE UNIQUE INDEX "Ingestion_conversationId_key" ON "Ingestion"("conversationId");
CREATE INDEX "Ingestion_userId_receivedAt_idx" ON "Ingestion"("userId", "receivedAt");
CREATE INDEX "Ingestion_sourceId_status_receivedAt_idx" ON "Ingestion"("sourceId", "status", "receivedAt");
CREATE UNIQUE INDEX "Ingestion_sourceId_externalId_key" ON "Ingestion"("sourceId", "externalId");
CREATE INDEX "ConnectorConnection_userId_type_idx" ON "ConnectorConnection"("userId", "type");
CREATE INDEX "ConnectorConnection_userId_status_idx" ON "ConnectorConnection"("userId", "status");
CREATE INDEX "Pipeline_userId_schemaId_enabled_idx" ON "Pipeline"("userId", "schemaId", "enabled");
CREATE INDEX "Pipeline_connectionId_idx" ON "Pipeline"("connectionId");
CREATE UNIQUE INDEX "Pipeline_userId_name_key" ON "Pipeline"("userId", "name");
CREATE INDEX "PipelineDelivery_conversationId_createdAt_idx" ON "PipelineDelivery"("conversationId", "createdAt");
CREATE INDEX "PipelineDelivery_pipelineId_status_createdAt_idx" ON "PipelineDelivery"("pipelineId", "status", "createdAt");
CREATE UNIQUE INDEX "PipelineDelivery_pipelineId_conversationId_key" ON "PipelineDelivery"("pipelineId", "conversationId");
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");
CREATE INDEX "OAuthState_userId_type_expiresAt_idx" ON "OAuthState"("userId", "type", "expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionSchema" ADD CONSTRAINT "ExtractionSchema_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IngestionSource" ADD CONSTRAINT "IngestionSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConnectorConnection" ADD CONSTRAINT "ConnectorConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectorConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PipelineDelivery" ADD CONSTRAINT "PipelineDelivery_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineDelivery" ADD CONSTRAINT "PipelineDelivery_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthState" ADD CONSTRAINT "OAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
