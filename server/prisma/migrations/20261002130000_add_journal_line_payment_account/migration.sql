-- Tag payment journal lines (1010 Bank, 1020 Wallet, 1030 Merchant)
-- with the specific account the money moved through. Posted journal
-- lines become the source of truth for account balances.

-- AlterTable
ALTER TABLE "journal_lines" ADD COLUMN "payment_account_id" INTEGER;

-- CreateIndex
CREATE INDEX "journal_lines_payment_account_id_idx" ON "journal_lines"("payment_account_id");

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- Backfill existing lines from their source documents.
-- A line is only tagged when the account's type matches the
-- line's chart code, so cash and non-money lines stay NULL.
-- ------------------------------------------------------------

-- Expenses
UPDATE "journal_lines" jl
SET "payment_account_id" = a."id"
FROM "journal_entries" je, "chart_accounts" ca, "expenses" src, "accounts" a
WHERE je."id" = jl."journal_entry_id"
  AND ca."id" = jl."account_id"
  AND src."id" = je."expense_id"
  AND a."id" = src."account_id"
  AND jl."payment_account_id" IS NULL
  AND ((ca."code" = '1010' AND a."type" = 'BANK')
    OR (ca."code" = '1020' AND a."type" = 'WALLET')
    OR (ca."code" = '1030' AND a."type" = 'MERCHANT'));

-- Purchases and supplier payments (purchase keeps the last payment account)
UPDATE "journal_lines" jl
SET "payment_account_id" = a."id"
FROM "journal_entries" je, "chart_accounts" ca, "purchases" src, "accounts" a
WHERE je."id" = jl."journal_entry_id"
  AND ca."id" = jl."account_id"
  AND src."id" = je."purchase_id"
  AND a."id" = src."account_id"
  AND jl."payment_account_id" IS NULL
  AND ((ca."code" = '1010' AND a."type" = 'BANK')
    OR (ca."code" = '1020' AND a."type" = 'WALLET')
    OR (ca."code" = '1030' AND a."type" = 'MERCHANT'));

-- Sale return refunds
UPDATE "journal_lines" jl
SET "payment_account_id" = a."id"
FROM "journal_entries" je, "chart_accounts" ca, "sale_returns" src, "accounts" a
WHERE je."id" = jl."journal_entry_id"
  AND ca."id" = jl."account_id"
  AND src."id" = je."sale_return_id"
  AND a."id" = src."account_id"
  AND jl."payment_account_id" IS NULL
  AND ((ca."code" = '1010' AND a."type" = 'BANK')
    OR (ca."code" = '1020' AND a."type" = 'WALLET')
    OR (ca."code" = '1030' AND a."type" = 'MERCHANT'));

-- Sales, sale payments and cancellations: tag only when the sale used
-- exactly one account of the line's type (otherwise it is ambiguous)
UPDATE "journal_lines" jl
SET "payment_account_id" = m."account_id"
FROM (
  SELECT jl2."id" AS "line_id", MIN(p."account_id") AS "account_id"
  FROM "journal_lines" jl2
  JOIN "chart_accounts" ca ON ca."id" = jl2."account_id"
  JOIN "journal_entries" je ON je."id" = jl2."journal_entry_id"
  JOIN "payments" p ON p."sale_id" = je."sale_id"
  JOIN "accounts" a ON a."id" = p."account_id"
  WHERE je."sale_id" IS NOT NULL
    AND jl2."payment_account_id" IS NULL
    AND ((ca."code" = '1010' AND a."type" = 'BANK')
      OR (ca."code" = '1020' AND a."type" = 'WALLET')
      OR (ca."code" = '1030' AND a."type" = 'MERCHANT'))
  GROUP BY jl2."id"
  HAVING COUNT(DISTINCT p."account_id") = 1
) m
WHERE jl."id" = m."line_id";

-- Money transfers (journal reference = transfer number):
-- debit line -> to account, credit line -> from account
UPDATE "journal_lines" jl
SET "payment_account_id" = a."id"
FROM "journal_entries" je, "chart_accounts" ca, "money_transfers" mt, "accounts" a
WHERE je."id" = jl."journal_entry_id"
  AND ca."id" = jl."account_id"
  AND je."reference" = mt."number"
  AND a."id" = CASE WHEN jl."debit" > 0 THEN mt."to_account_id" ELSE mt."from_account_id" END
  AND jl."payment_account_id" IS NULL
  AND ((ca."code" = '1010' AND a."type" = 'BANK')
    OR (ca."code" = '1020' AND a."type" = 'WALLET')
    OR (ca."code" = '1030' AND a."type" = 'MERCHANT'));
