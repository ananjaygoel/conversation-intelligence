CREATE TABLE "ConnectorConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "credentials" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConnectorConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaId" TEXT,
    "connectorType" TEXT NOT NULL,
    "connectionId" TEXT,
    "connectorConfig" TEXT NOT NULL,
    "fieldMappings" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pipeline_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pipeline_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectorConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PipelineDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseStatus" INTEGER,
    "responseBodySummary" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deliveredAt" DATETIME,
    CONSTRAINT "PipelineDelivery_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PipelineDelivery_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Pipeline_userId_name_key" ON "Pipeline"("userId", "name");
CREATE INDEX "Pipeline_userId_schemaId_enabled_idx" ON "Pipeline"("userId", "schemaId", "enabled");
CREATE INDEX "Pipeline_connectionId_idx" ON "Pipeline"("connectionId");
CREATE UNIQUE INDEX "PipelineDelivery_pipelineId_conversationId_key" ON "PipelineDelivery"("pipelineId", "conversationId");
CREATE INDEX "PipelineDelivery_conversationId_createdAt_idx" ON "PipelineDelivery"("conversationId", "createdAt");
CREATE INDEX "PipelineDelivery_pipelineId_status_createdAt_idx" ON "PipelineDelivery"("pipelineId", "status", "createdAt");
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");
CREATE INDEX "OAuthState_userId_type_expiresAt_idx" ON "OAuthState"("userId", "type", "expiresAt");
CREATE INDEX "ConnectorConnection_userId_type_idx" ON "ConnectorConnection"("userId", "type");
CREATE INDEX "ConnectorConnection_userId_status_idx" ON "ConnectorConnection"("userId", "status");
