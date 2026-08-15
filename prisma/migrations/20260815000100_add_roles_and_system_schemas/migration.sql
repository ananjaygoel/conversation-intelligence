-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "ExtractionSchema" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExtractionSchema" ADD COLUMN "systemKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionSchema_userId_systemKey_key" ON "ExtractionSchema"("userId", "systemKey");
