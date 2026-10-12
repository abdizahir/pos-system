// server/scripts/rebook-cash-out.ts
//
// Record-only mode: purchases, supplier payments, expenses, payroll,
// VAT payments, refunds and owner withdrawals never take money out of
// the Cash Register, bank, wallet or merchant accounts. This moves their
// existing journal lines on those money accounts (1000-1030) to
// 3000 Owner's Capital and unlinks them from the account.
//
//   npx tsx scripts/rebook-cash-out.ts          # preview
//   npx tsx scripts/rebook-cash-out.ts --apply  # apply

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { LEDGER_CODE_BY_TYPE } from "../src/services/accounts.service.js";
import { RECORD_ONLY_CHART_CODE } from "../src/utils/payment-accounts.js";

const apply = process.argv.includes("--apply");
const MONEY_CODES = Object.values(LEDGER_CODE_BY_TYPE);

async function balances() {
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { account: { code: { in: MONEY_CODES } } },
    _sum: { debit: true, credit: true },
  });
  const accounts = await prisma.chartAccount.findMany({
    where: { code: { in: MONEY_CODES } },
    select: { id: true, code: true, name: true },
  });
  return accounts
    .map((account) => {
      const row = rows.find((r) => r.accountId === account.id);
      const balance = Number(row?._sum.debit ?? 0) - Number(row?._sum.credit ?? 0);
      return `${account.code} ${account.name}: ETB ${balance.toFixed(2)}`;
    })
    .join("\n  ");
}

const target = await prisma.chartAccount.findUnique({
  where: { code: RECORD_ONLY_CHART_CODE },
  select: { id: true, name: true },
});

if (!target) {
  throw new Error(`Chart account ${RECORD_ONLY_CHART_CODE} not found.`);
}

const lines = await prisma.journalLine.findMany({
  where: {
    account: { code: { in: MONEY_CODES } },
    OR: [
      { journalEntry: { expenseId: { not: null } } },
      { journalEntry: { purchaseId: { not: null } } },
      { journalEntry: { salaryPaymentId: { not: null } } },
      { journalEntry: { vatPaymentId: { not: null } } },
      { journalEntry: { saleReturnId: { not: null } } },
      { journalEntry: { ownerWithdrawalId: { not: null } } },
    ],
  },
  select: {
    id: true,
    debit: true,
    credit: true,
    account: { select: { code: true } },
    journalEntry: { select: { date: true, description: true } },
  },
  orderBy: { id: "asc" },
});

for (const line of lines) {
  const out = Number(line.credit) - Number(line.debit);
  console.log(
    `#${line.id}  ${line.journalEntry.date.toISOString().slice(0, 10)}  ` +
      `${line.account.code}  ${out >= 0 ? "out" : "in "} ETB ${Math.abs(out).toFixed(2)}  ` +
      `${line.journalEntry.description ?? ""}`,
  );
}

console.log(`\n${lines.length} line(s) → ${RECORD_ONLY_CHART_CODE} ${target.name}`);
console.log(`Balances now:\n  ${await balances()}`);

if (!apply) {
  console.log("\nPreview only. Run with --apply to re-book.");
} else if (lines.length > 0) {
  await prisma.journalLine.updateMany({
    where: { id: { in: lines.map((line) => line.id) } },
    data: { accountId: target.id, paymentAccountId: null },
  });
  console.log(`\nRe-booked. Balances:\n  ${await balances()}`);
}

process.exit(0);
