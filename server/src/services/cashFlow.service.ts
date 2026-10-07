// server/src/services/cashFlow.service.ts
//
// Cash flow from posted journal lines on the money accounts
// (1000 Cash, 1010 Bank, 1020 Wallets, 1030 Merchant). Transfers
// between the business's own accounts are skipped: they move money
// around but don't change the total.

import { prisma } from "../db/prisma.js";

// ============================================================
// TYPES
// ============================================================

type CashFlowLine = {
  id: string;
  date: string;
  type: "IN" | "OUT";
  category: string;
  reference: string;
  description: string;
  method: string | null;
  amount: number;
};

const MONEY_CODES = ["1000", "1010", "1020", "1030"];

const CHANNEL_BY_CODE: Record<string, string> = {
  "1000": "Cash",
  "1010": "Bank",
  "1020": "Wallet",
  "1030": "Merchant",
};

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date: Date) {
  return dayKey(date).slice(0, 7);
}

type EntryInfo = {
  description: string | null;
  saleId: number | null;
  purchaseId: number | null;
  expenseId: number | null;
  incomeId: number | null;
  salaryPaymentId: number | null;
  ownerWithdrawalId: number | null;
  vatPaymentId: number | null;
  saleReturnId: number | null;
  expense: { category: string; title: string } | null;
  income: { category: string; title: string } | null;
};

function categoryOf(entry: EntryInfo, type: "IN" | "OUT") {
  if (entry.saleReturnId) return "Sale refunds";
  if (entry.saleId) return type === "IN" ? "Sales" : "Cancelled sales";
  if (entry.expense) return `Expense · ${entry.expense.category}`;
  if (entry.incomeId) return entry.income ? `Income · ${entry.income.category}` : "Other income";
  if (entry.salaryPaymentId) return "Salaries";
  if (entry.ownerWithdrawalId) return "Owner withdrawals";
  if (entry.vatPaymentId) return "VAT payments";
  if (entry.purchaseId) {
    if (type === "IN") return "Purchase refunds";
    return entry.description?.startsWith("Supplier payment") ? "Supplier payments" : "Purchases";
  }
  return type === "IN" ? "Other money in" : "Other money out";
}

// ============================================================
// GET CASH FLOW
// ============================================================

export async function getCashFlow(from: Date, to: Date) {
  const moneyAccounts = await prisma.chartAccount.findMany({
    where: { code: { in: MONEY_CODES } },
    select: { id: true, code: true },
  });
  const moneyIds = moneyAccounts.map((account) => account.id);
  const codeById = new Map(moneyAccounts.map((a) => [a.id, a.code]));

  const [opening, entries] = await Promise.all([
    prisma.journalLine.aggregate({
      where: { accountId: { in: moneyIds }, journalEntry: { date: { lt: from } } },
      _sum: { debit: true, credit: true },
    }),

    // Entries in range that touch a money account, with all their lines
    prisma.journalEntry.findMany({
      where: {
        date: { gte: from, lte: to },
        lines: { some: { accountId: { in: moneyIds } } },
      },
      select: {
        id: true,
        date: true,
        reference: true,
        description: true,
        saleId: true,
        purchaseId: true,
        expenseId: true,
        incomeId: true,
        salaryPaymentId: true,
        ownerWithdrawalId: true,
        vatPaymentId: true,
        saleReturnId: true,
        expense: { select: { category: true, title: true } },
        income: { select: { category: true, title: true } },
        lines: {
          select: {
            id: true,
            accountId: true,
            debit: true,
            credit: true,
            paymentAccount: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
  ]);

  const openingBalance =
    Number(opening._sum.debit ?? 0) - Number(opening._sum.credit ?? 0);

  const lines: CashFlowLine[] = [];
  let transfersTotal = 0;

  for (const entry of entries) {
    const moneyLines = entry.lines.filter((line) => moneyIds.includes(line.accountId));
    const otherLines = entry.lines.filter((line) => !moneyIds.includes(line.accountId));

    // Only money accounts involved: an internal transfer
    if (otherLines.length === 0) {
      transfersTotal += moneyLines.reduce((sum, line) => sum + Number(line.debit), 0);
      continue;
    }

    for (const line of moneyLines) {
      const net = Number(line.debit) - Number(line.credit);
      if (Math.abs(net) < 0.005) continue;

      const type = net > 0 ? "IN" : "OUT";
      const channel = CHANNEL_BY_CODE[codeById.get(line.accountId) ?? ""] ?? null;

      lines.push({
        id: `line-${line.id}`,
        date: entry.date.toISOString(),
        type,
        category: categoryOf(entry, type),
        reference: entry.reference ?? `JE-${entry.id}`,
        description:
          entry.expense?.title ?? entry.income?.title ?? entry.description ?? "",
        method: line.paymentAccount ? `${channel} · ${line.paymentAccount.name}` : channel,
        amount: Math.abs(net),
      });
    }
  }

  // ----------------------------------------------------------
  // Totals and groupings
  // ----------------------------------------------------------
  const totalIn = lines.filter((l) => l.type === "IN").reduce((s, l) => s + l.amount, 0);
  const totalOut = lines.filter((l) => l.type === "OUT").reduce((s, l) => s + l.amount, 0);
  const netChange = totalIn - totalOut;

  const group = (type: "IN" | "OUT") => {
    const map = new Map<string, number>();
    for (const line of lines) {
      if (line.type === type) map.set(line.category, (map.get(line.category) ?? 0) + line.amount);
    }
    return Array.from(map, ([category, amount]) => ({ category, amount })).sort(
      (a, b) => b.amount - a.amount,
    );
  };

  // In / out per channel (Cash, Bank, Wallet, Merchant)
  const channelMap = new Map(
    Object.values(CHANNEL_BY_CODE).map((name) => [name, { in: 0, out: 0 }]),
  );
  for (const line of lines) {
    const channel = (line.method ?? "").split(" · ")[0]!;
    const bucket = channelMap.get(channel);
    if (!bucket) continue;
    if (line.type === "IN") bucket.in += line.amount;
    else bucket.out += line.amount;
  }

  // Trend by day (or month for long ranges) with running balance
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const granularity: "day" | "month" = days > 62 ? "month" : "day";
  const trendMap = new Map<string, { in: number; out: number }>();

  const cursor = new Date(from.getFullYear(), from.getMonth(), granularity === "day" ? from.getDate() : 1);
  while (cursor <= to) {
    trendMap.set(granularity === "day" ? dayKey(cursor) : monthKey(cursor), { in: 0, out: 0 });
    if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const line of lines) {
    const date = new Date(line.date);
    const bucket = trendMap.get(granularity === "day" ? dayKey(date) : monthKey(date));
    if (!bucket) continue;
    if (line.type === "IN") bucket.in += line.amount;
    else bucket.out += line.amount;
  }

  let running = openingBalance;
  const fullTrend = Array.from(trendMap, ([period, value]) => {
    running += value.in - value.out;
    return { period, in: value.in, out: value.out, net: value.in - value.out, balance: running };
  });

  // Skip quiet periods before the first movement (e.g. "all time")
  const firstActive = fullTrend.findIndex((row) => row.in !== 0 || row.out !== 0);
  const trend =
    granularity === "month" && firstActive > 0 ? fullTrend.slice(firstActive) : fullTrend;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,

    summary: {
      totalIn,
      totalOut,
      netChange,
      openingBalance,
      closingBalance: openingBalance + netChange,
      transfers: transfersTotal,
    },

    inflowsByCategory: group("IN"),
    outflowsByCategory: group("OUT"),

    channels: Array.from(channelMap, ([name, value]) => ({
      name,
      in: value.in,
      out: value.out,
      net: value.in - value.out,
    })),

    trend,

    transactions: lines,
  };
}
