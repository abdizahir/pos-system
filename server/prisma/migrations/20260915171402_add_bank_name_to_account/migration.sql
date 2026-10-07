-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "bankName" TEXT;

-- CreateIndex
CREATE INDEX "accounts_bankName_idx" ON "accounts"("bankName");
