-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'MERCHANT';

-- Chart account for merchant balances
INSERT INTO "chart_accounts" ("code", "name", "type", "isActive", "created_at", "updated_at")
VALUES ('1030', 'Merchant Accounts', 'ASSET', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
