// server/src/services/dashboard.service.ts

import { prisma } from "../db/prisma.js";
import { getProfitLoss } from "./profitLoss.service.js";
import { getVatSummary } from "./vat.service.js";
import { LEDGER_CODE_BY_TYPE } from "./accounts.service.js";

// ============================================================
// TYPES
// ============================================================

type ChannelKey = keyof typeof LEDGER_CODE_BY_TYPE;

type Channel = {
  key: ChannelKey;
  label: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
  balance: number;
};

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  CASH: "Cash Register",
  BANK: "Bank",
  WALLET: "Wallet",
  MERCHANT: "Merchant",
};

// ============================================================
// GET DASHBOARD
// ============================================================

export async function getDashboard(from: Date, to: Date) {
  const dayRange = { gte: from, lte: to };

  // Money channels come from posted journal lines (ledger 1000-1030)
  const chartAccounts = await prisma.chartAccount.findMany({
    where: { code: { in: Object.values(LEDGER_CODE_BY_TYPE) } },
    select: { id: true, code: true },
  });
  const chartIds = chartAccounts.map((account) => account.id);

  const [
    profitLoss,
    salesAgg,
    purchases,
    expenses,
    dayLines,
    balanceLines,
    productCount,
    lowStockProducts,
    customerCount,
    supplierCount,
    vat,
  ] = await Promise.all([
    getProfitLoss(from, to),

    prisma.sale.aggregate({
      where: {
        createdAt: dayRange,
        status: { in: ["COMPLETED", "PENDING"] },
      },
      _count: { _all: true },
      _sum: { total: true },
    }),

    prisma.purchase.findMany({
      where: {
        createdAt: dayRange,
        status: { not: "CANCELLED" },
      },
      select: { total: true },
    }),

    prisma.expense.findMany({
      where: { date: dayRange },
      select: { amount: true },
    }),

    // In / out during the day
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: chartIds },
        journalEntry: { date: dayRange },
      },
      _sum: { debit: true, credit: true },
    }),

    // Balance at the end of the day
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: chartIds },
        journalEntry: { date: { lte: to } },
      },
      _sum: { debit: true, credit: true },
    }),

    prisma.product.count(),

    prisma.product.findMany({
      select: { stockQuantity: true, lowStockLimit: true },
    }),

    prisma.customer.count(),

    prisma.supplier.count(),

    getVatSummary(from, to),
  ]);

  // ----------------------------------------------------------
  // Money channels (in / out for the day)
  // ----------------------------------------------------------

  const sumsFor = (
    rows: typeof dayLines,
    code: string,
  ) => {
    const chartId = chartAccounts.find((a) => a.code === code)?.id;
    const row = rows.find((r) => r.accountId === chartId);
    return {
      debit: Number(row?._sum.debit ?? 0),
      credit: Number(row?._sum.credit ?? 0),
    };
  };

  const channels: Channel[] = (
    Object.keys(CHANNEL_LABELS) as ChannelKey[]
  ).map((key) => {
    const code = LEDGER_CODE_BY_TYPE[key];
    const day = sumsFor(dayLines, code);
    const total = sumsFor(balanceLines, code);

    return {
      key,
      label: CHANNEL_LABELS[key],
      moneyIn: day.debit,
      moneyOut: day.credit,
      net: day.debit - day.credit,
      balance: total.debit - total.credit,
    };
  });

  // ----------------------------------------------------------
  // Totals
  // ----------------------------------------------------------

  const totalPurchases = purchases.reduce(
    (sum, p) => sum + Number(p.total),
    0,
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );

  const lowStock = lowStockProducts.filter(
    (p) => p.stockQuantity <= p.lowStockLimit,
  ).length;

  const outOfStock = lowStockProducts.filter(
    (p) => p.stockQuantity <= 0,
  ).length;

  return {
    from: from.toISOString(),
    to: to.toISOString(),

    day: {
      revenue: profitLoss.revenue.total,
      salesCount: salesAgg._count._all,
      salesTotal: Number(salesAgg._sum.total ?? 0),
      purchases: totalPurchases,
      purchasesCount: purchases.length,
      expenses: totalExpenses,
      expensesCount: expenses.length,
      costOfSales: profitLoss.costOfSales.total,
      grossProfit: profitLoss.grossProfit,
      netProfit: profitLoss.netProfit,
    },

    channels,

    vat,

    profitLoss: {
      revenue: profitLoss.revenue,
      costOfSales: profitLoss.costOfSales,
      operatingExpenses: profitLoss.operatingExpenses,
      grossProfit: profitLoss.grossProfit,
      netProfit: profitLoss.netProfit,
    },

    overall: {
      products: productCount,
      lowStock,
      outOfStock,
      customers: customerCount,
      suppliers: supplierCount,
    },
  };
}
