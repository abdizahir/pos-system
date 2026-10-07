-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "owner_withdrawal_id" INTEGER;

-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "national_id" TEXT NOT NULL,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_withdrawals" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "account_id" INTEGER,
    "reference" TEXT,
    "notes" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owners_national_id_key" ON "owners"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "owners_email_key" ON "owners"("email");

-- CreateIndex
CREATE INDEX "owners_lname_idx" ON "owners"("lname");

-- CreateIndex
CREATE INDEX "owner_withdrawals_owner_id_idx" ON "owner_withdrawals"("owner_id");

-- CreateIndex
CREATE INDEX "owner_withdrawals_date_idx" ON "owner_withdrawals"("date");

-- CreateIndex
CREATE INDEX "owner_withdrawals_account_id_idx" ON "owner_withdrawals"("account_id");

-- CreateIndex
CREATE INDEX "journal_entries_owner_withdrawal_id_idx" ON "journal_entries"("owner_withdrawal_id");

-- AddForeignKey
ALTER TABLE "owner_withdrawals" ADD CONSTRAINT "owner_withdrawals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_withdrawals" ADD CONSTRAINT "owner_withdrawals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_withdrawals" ADD CONSTRAINT "owner_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_owner_withdrawal_id_fkey" FOREIGN KEY ("owner_withdrawal_id") REFERENCES "owner_withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

