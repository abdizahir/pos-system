-- VAT collected on sales is owed to the tax authority, not revenue
INSERT INTO "chart_accounts" ("code", "name", "type", "isActive", "created_at", "updated_at")
VALUES ('2100', 'VAT Payable', 'LIABILITY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
