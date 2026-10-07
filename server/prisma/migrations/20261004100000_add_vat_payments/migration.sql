-- CreateEnum
CREATE TYPE "TaxAuthority" AS ENUM ('SOMALI_REGIONAL_STATE_REVENUE_BUREAU', 'JIGJIGA_CITY_REVENUE_BUREAU');

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "vat_payment_id" INTEGER;

-- CreateTable
CREATE TABLE "vat_payments" (
    "id" SERIAL NOT NULL,
    "authority" "TaxAuthority" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "account_id" INTEGER,
    "reference" TEXT,
    "notes" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_payments_date_idx" ON "vat_payments"("date");

-- CreateIndex
CREATE INDEX "vat_payments_authority_idx" ON "vat_payments"("authority");

-- CreateIndex
CREATE INDEX "journal_entries_vat_payment_id_idx" ON "journal_entries"("vat_payment_id");

-- AddForeignKey
ALTER TABLE "vat_payments" ADD CONSTRAINT "vat_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_payments" ADD CONSTRAINT "vat_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_vat_payment_id_fkey" FOREIGN KEY ("vat_payment_id") REFERENCES "vat_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

