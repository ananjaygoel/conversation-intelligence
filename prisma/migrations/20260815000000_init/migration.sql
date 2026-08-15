-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtractionSchema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schemaDefinition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExtractionSchema_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "originalFileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
    "transcript" TEXT NOT NULL,
    "structuredData" TEXT NOT NULL,
    "schemaId" TEXT,
    "durationSeconds" REAL,
    "transcriptionCost" REAL NOT NULL DEFAULT 0,
    "extractionCost" REAL NOT NULL DEFAULT 0,
    "estimatedApiCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "ExtractionSchema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "ExtractionSchema_userId_createdAt_idx" ON "ExtractionSchema"("userId", "createdAt");
CREATE UNIQUE INDEX "ExtractionSchema_userId_name_key" ON "ExtractionSchema"("userId", "name");
CREATE INDEX "Conversation_userId_createdAt_idx" ON "Conversation"("userId", "createdAt");
CREATE INDEX "Conversation_userId_schemaId_idx" ON "Conversation"("userId", "schemaId");
