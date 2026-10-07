-- Owner withdrawals (drawings): contra-equity, debited when the owner takes money out
INSERT INTO "chart_accounts" ("code", "name", "type", "isActive", "created_at", "updated_at")
VALUES ('3100', 'Owner Withdrawals', 'EQUITY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
