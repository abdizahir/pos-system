// server/src/services/closeOut.service.ts
//
// End-of-period close-out (EOD / EOW / EOM / EOY) for one day, week,
// month or year:
// - sales, payments by method, returns and cancellations
// - profit from posted journal lines (same numbers as Profit / Loss)
// - expenses, purchases and VAT
// - money channels: opening, in, out and closing balance
// - cashiers, top products and a sales breakdown for the period

import { prisma } from "../db/prisma.js";
import { getProfitLoss } from "./profitLoss.service.js";
import { getVatSummary } from "./vat.service.js";
import { LEDGER_CODE_BY_TYPE } from "./accounts.service.js";

// ============================================================
// TYPES
// ============================================================

// "custom" is any start / end date the user picks
export const CLOSE_OUT_PERIODS = ["day", "week", "month", "year", "custom"] as const;

export type CloseOutPeriod = (typeof CLOSE_OUT_PERIODS)[number];

type ChannelKey = keyof typeof LEDGER_CODE_BY_TYPE;

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  CASH: "Cash Register",
  BANK: "Bank",
  WALLET: "Wallet",
  MERCHANT: "Merchant",
};

const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE", "BANK"] as const;

type PaymentMethodKey = (typeof PAYMENT_METHODS)[number];

// ============================================================
// PERIOD RANGE
// ============================================================

// Local start / end of the day, week (Mon–Sun), month or year
// that contains the given date.
export function getPeriodRange(
  period: Exclude<CloseOutPeriod, "custom">,
  date: Date,
) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (period === "day") {
    return {
      from: new Date(year, month, day, 0, 0, 0, 0),
      to: new Date(year, month, day, 23, 59, 59, 999),
    };
  }

  if (period === "week") {
    // getDay(): 0 = Sunday … 6 = Saturday → weeks start on Monday
    const offset = (date.getDay() + 6) % 7;
    return {
      from: new Date(year, month, day - offset, 0, 0, 0, 0),
      to: new Date(year, month, day - offset + 6, 23, 59, 59, 999),
    };
  }

  if (period === "month") {
    return {
      from: new Date(year, month, 1, 0, 0, 0, 0),
      to: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

// ============================================================
// BREAKDOWN BUCKETS
// ============================================================

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Bucket = "hour" | "day" | "month";

// Day → hours, week / month → days, year → months. A custom range
// uses hours for one day, days up to about three months, then months.
function bucketFor(period: CloseOutPeriod, from: Date, to: Date): Bucket {
  if (period === "day") return "hour";
  if (period === "year") return "month";
  if (period !== "custom") return "day";

  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days <= 1) return "hour";
  return days <= 92 ? "day" : "month";
}

function bucketKey(bucket: Bucket, date: Date) {
  if (bucket === "hour") return pad(date.getHours());
  if (bucket === "month") return dayKey(date).slice(0, 7);
  return dayKey(date);
}

function allBuckets(bucket: Bucket, from: Date, to: Date) {
  const keys: string[] = [];

  if (bucket === "hour") {
    for (let hour = 0; hour < 24; hour += 1) keys.push(pad(hour));
    return keys;
  }

  if (bucket === "month") {
    const month = new Date(from.getFullYear(), from.getMonth(), 1);
    while (month <= to) {
      keys.push(dayKey(month).slice(0, 7));
      month.setMonth(month.getMonth() + 1);
    }
    return keys;
  }

  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

// ============================================================
// GET CLOSE-OUT
// ============================================================

export async function getCloseOut(
  period: CloseOutPeriod,
  from: Date,
  to: Date,
) {
  const range = { gte: from, lte: to };

  const chartAccounts = await prisma.chartAccount.findMany({
    where: { code: { in: Object.values(LEDGER_CODE_BY_TYPE) } },
    select: { id: true, code: true },
  });
  const chartIds = chartAccounts.map((account) => account.id);

  const [
    profitLoss,
    vat,
    sales,
    cancelledSales,
    payments,
    saleReturns,
    expenses,
    purchases,
    periodLines,
    openingLines,
  ] = await Promise.all([
    getProfitLoss(from, to),

    getVatSummary(from, to),

    prisma.sale.findMany({
      where: {
        createdAt: range,
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        createdAt: true,
        subtotal: true,
        discount: true,
        tax: true,
        total: true,
        paidAmount: true,
        dueAmount: true,
        user: { select: { id: true, email: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            returnedQuantity: true,
            unitPrice: true,
            product: { select: { productName: true, sku: true } },
          },
        },
      },
    }),

    prisma.sale.aggregate({
      where: {
        createdAt: range,
        status: "CANCELLED",
      },
      _count: { _all: true },
      _sum: { total: true },
    }),

    // Money received in the period, including collections on
    // earlier credit sales. Amounts are already net of change.
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: range,
        sale: { status: { not: "CANCELLED" } },
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),

    prisma.saleReturn.findMany({
      where: { createdAt: range },
      select: {
        total: true,
        tax: true,
        refundMethod: true,
      },
    }),

    prisma.expense.findMany({
      where: { date: range },
      select: {
        category: true,
        amount: true,
        paymentMethod: true,
      },
    }),

    prisma.purchase.aggregate({
      where: {
        createdAt: range,
        status: { not: "CANCELLED" },
      },
      _count: { _all: true },
      _sum: { total: true, paidAmount: true, dueAmount: true },
    }),

    // Money in / out during the period
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: chartIds },
        journalEntry: { date: range },
      },
      _sum: { debit: true, credit: true },
    }),

    // Balance before the period starts
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: chartIds },
        journalEntry: { date: { lt: from } },
      },
      _sum: { debit: true, credit: true },
    }),
  ]);

  // ----------------------------------------------------------
  // Sales, cashiers, products, breakdown
  // ----------------------------------------------------------

  const bucket = bucketFor(period, from, to);

  const breakdown = new Map(
    allBuckets(bucket, from, to).map((key) => [key, { count: 0, total: 0 }]),
  );

  const cashiers = new Map<
    number,
    { userId: number; email: string; count: number; total: number }
  >();

  const products = new Map<
    number,
    { productId: number; name: string; sku: string; quantity: number; revenue: number }
  >();

  let gross = 0;
  let discounts = 0;
  let tax = 0;
  let total = 0;
  let paid = 0;
  let due = 0;
  let itemsSold = 0;

  for (const sale of sales) {
    const saleTotal = Number(sale.total);
    const subtotal = Number(sale.subtotal);

    gross += subtotal;
    discounts += Number(sale.discount);
    tax += Number(sale.tax);
    total += saleTotal;
    paid += Number(sale.paidAmount);
    due += Number(sale.dueAmount);

    const bucketRow = breakdown.get(bucketKey(bucket, sale.createdAt));
    if (bucketRow) {
      bucketRow.count += 1;
      bucketRow.total += saleTotal;
    }

    const cashier = cashiers.get(sale.user.id) ?? {
      userId: sale.user.id,
      email: sale.user.email,
      count: 0,
      total: 0,
    };
    cashier.count += 1;
    cashier.total += saleTotal;
    cashiers.set(sale.user.id, cashier);

    // Spread the sale-level discount across its lines
    const discountRate = subtotal > 0 ? Number(sale.discount) / subtotal : 0;

    for (const item of sale.items) {
      const quantity = item.quantity - item.returnedQuantity;
      if (quantity <= 0) continue;

      itemsSold += quantity;

      const row = products.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.productName,
        sku: item.product.sku,
        quantity: 0,
        revenue: 0,
      };
      row.quantity += quantity;
      row.revenue += Number(item.unitPrice) * quantity * (1 - discountRate);
      products.set(item.productId, row);
    }
  }

  // ----------------------------------------------------------
  // Payments and refunds by method
  // ----------------------------------------------------------

  const paymentsByMethod = PAYMENT_METHODS.map((method) => {
    const row = payments.find((p) => p.method === method);
    return {
      method,
      count: row?._count._all ?? 0,
      amount: Number(row?._sum.amount ?? 0),
    };
  });

  const refundsByMethod = new Map<PaymentMethodKey | "NONE", number>();
  let returnsTotal = 0;
  let returnsTax = 0;

  for (const saleReturn of saleReturns) {
    const amount = Number(saleReturn.total);
    returnsTotal += amount;
    returnsTax += Number(saleReturn.tax);

    const key = saleReturn.refundMethod ?? "NONE";
    refundsByMethod.set(key, (refundsByMethod.get(key) ?? 0) + amount);
  }

  // ----------------------------------------------------------
  // Expenses
  // ----------------------------------------------------------

  const expensesByCategory = new Map<string, number>();
  const expensesByMethod = new Map<PaymentMethodKey, number>();
  let expensesTotal = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    expensesTotal += amount;
    expensesByCategory.set(
      expense.category,
      (expensesByCategory.get(expense.category) ?? 0) + amount,
    );
    expensesByMethod.set(
      expense.paymentMethod,
      (expensesByMethod.get(expense.paymentMethod) ?? 0) + amount,
    );
  }

  // ----------------------------------------------------------
  // Money channels
  // ----------------------------------------------------------

  const sumsFor = (rows: typeof periodLines, code: string) => {
    const chartId = chartAccounts.find((a) => a.code === code)?.id;
    const row = rows.find((r) => r.accountId === chartId);
    return {
      debit: Number(row?._sum.debit ?? 0),
      credit: Number(row?._sum.credit ?? 0),
    };
  };

  const channels = (Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((key) => {
    const code = LEDGER_CODE_BY_TYPE[key];
    const during = sumsFor(periodLines, code);
    const before = sumsFor(openingLines, code);
    const opening = before.debit - before.credit;

    return {
      key,
      label: CHANNEL_LABELS[key],
      opening,
      moneyIn: during.debit,
      moneyOut: during.credit,
      closing: opening + during.debit - during.credit,
    };
  });

  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    generatedAt: new Date().toISOString(),

    sales: {
      count: sales.length,
      itemsSold,
      gross,
      discounts,
      tax,
      total,
      paid,
      due,
      average: sales.length > 0 ? total / sales.length : 0,
      cancelledCount: cancelledSales._count._all,
      cancelledTotal: Number(cancelledSales._sum.total ?? 0),
    },

    returns: {
      count: saleReturns.length,
      total: returnsTotal,
      tax: returnsTax,
      byMethod: Array.from(refundsByMethod, ([method, amount]) => ({
        method,
        amount,
      })),
    },

    netSales: total - returnsTotal,

    payments: paymentsByMethod,

    paymentsTotal: paymentsByMethod.reduce((sum, row) => sum + row.amount, 0),

    profit: {
      revenue: profitLoss.revenue.total,
      costOfSales: profitLoss.costOfSales.total,
      grossProfit: profitLoss.grossProfit,
      operatingExpenses: profitLoss.operatingExpenses.total,
      netProfit: profitLoss.netProfit,
    },

    expenses: {
      count: expenses.length,
      total: expensesTotal,
      byCategory: Array.from(expensesByCategory, ([category, amount]) => ({
        category,
        amount,
      })).sort((a, b) => b.amount - a.amount),
      byMethod: Array.from(expensesByMethod, ([method, amount]) => ({
        method,
        amount,
      })),
    },

    purchases: {
      count: purchases._count._all,
      total: Number(purchases._sum.total ?? 0),
      paid: Number(purchases._sum.paidAmount ?? 0),
      due: Number(purchases._sum.dueAmount ?? 0),
    },

    vat,

    channels,

    cashiers: Array.from(cashiers.values()).sort((a, b) => b.total - a.total),

    topProducts: Array.from(products.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),

    breakdown: Array.from(breakdown, ([key, value]) => ({
      key,
      count: value.count,
      total: value.total,
    })),
  };
}
