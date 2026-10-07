-- Employee salaries and wages
INSERT INTO "chart_accounts" ("code", "name", "type", "isActive", "created_at", "updated_at")
VALUES ('5200', 'Salary/Wages Expense', 'EXPENSE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
