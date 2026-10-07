-- CreateTable
CREATE TABLE "money_transfers" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "from_account_id" INTEGER NOT NULL,
    "to_account_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "money_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "money_transfers_number_key" ON "money_transfers"("number");

-- CreateIndex
CREATE INDEX "money_transfers_date_idx" ON "money_transfers"("date");

-- CreateIndex
CREATE INDEX "money_transfers_from_account_id_idx" ON "money_transfers"("from_account_id");

-- CreateIndex
CREATE INDEX "money_transfers_to_account_id_idx" ON "money_transfers"("to_account_id");

-- CreateIndex
CREATE INDEX "money_transfers_user_id_idx" ON "money_transfers"("user_id");

-- AddForeignKey
ALTER TABLE "money_transfers" ADD CONSTRAINT "money_transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_transfers" ADD CONSTRAINT "money_transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_transfers" ADD CONSTRAINT "money_transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
