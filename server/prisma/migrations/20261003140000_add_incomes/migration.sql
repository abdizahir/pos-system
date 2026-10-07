-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "income_id" INTEGER;

-- CreateTable
CREATE TABLE "incomes" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "account_id" INTEGER,
    "reference" TEXT,
    "notes" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incomes_category_idx" ON "incomes"("category");

-- CreateIndex
CREATE INDEX "incomes_date_idx" ON "incomes"("date");

-- CreateIndex
CREATE INDEX "incomes_payment_method_idx" ON "incomes"("payment_method");

-- CreateIndex
CREATE INDEX "incomes_account_id_idx" ON "incomes"("account_id");

-- CreateIndex
CREATE INDEX "incomes_user_id_idx" ON "incomes"("user_id");

-- CreateIndex
CREATE INDEX "journal_entries_income_id_idx" ON "journal_entries"("income_id");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Chart account for income that is not from sales
INSERT INTO "chart_accounts" ("code", "name", "type", "isActive", "created_at", "updated_at")
VALUES ('4100', 'Other Income', 'REVENUE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
