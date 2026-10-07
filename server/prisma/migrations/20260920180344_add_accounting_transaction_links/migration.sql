-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "account_id" INTEGER;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "expense_id" INTEGER,
ADD COLUMN     "purchase_id" INTEGER,
ADD COLUMN     "sale_id" INTEGER,
ADD COLUMN     "sale_return_id" INTEGER;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "account_id" INTEGER,
ADD COLUMN     "payment_method" "PaymentMethod";

-- AlterTable
ALTER TABLE "sale_returns" ADD COLUMN     "account_id" INTEGER,
ADD COLUMN     "refund_method" "PaymentMethod";

-- CreateIndex
CREATE INDEX "expenses_account_id_idx" ON "expenses"("account_id");

-- CreateIndex
CREATE INDEX "journal_entries_sale_id_idx" ON "journal_entries"("sale_id");

-- CreateIndex
CREATE INDEX "journal_entries_purchase_id_idx" ON "journal_entries"("purchase_id");

-- CreateIndex
CREATE INDEX "journal_entries_expense_id_idx" ON "journal_entries"("expense_id");

-- CreateIndex
CREATE INDEX "journal_entries_sale_return_id_idx" ON "journal_entries"("sale_return_id");

-- CreateIndex
CREATE INDEX "purchases_account_id_idx" ON "purchases"("account_id");

-- CreateIndex
CREATE INDEX "sale_returns_account_id_idx" ON "sale_returns"("account_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_sale_return_id_fkey" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
