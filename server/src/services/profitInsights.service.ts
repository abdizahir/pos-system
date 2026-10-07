// server/src/services/profitInsights.service.ts
//
// POS-style profit analytics for a date range:
// - totals and a day/month trend from posted journal lines
// - order stats and product / category profit from sale items
// - expense breakdown by category

import { ChartAccountType } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

const COGS_CODE = "5000";
const SALARY_CODE = "5200";
const GENERAL_EXPENSE_CODE = "5100";

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date: Date) {
  return dayKey(date).slice(0, 7);
}

// Every bucket in the range, so the chart has no gaps
function buckets(from: Date, to: Date, granularity: "day" | "month") {
  const keys: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), granularity === "day" ? from.getDate() : 1);

  while (cursor <= to) {
    keys.push(granularity === "day" ? dayKey(cursor) : monthKey(cursor));
    if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}

export async function getProfitInsights(from: Date, to: Date) {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const granularity: "day" | "month" = days > 62 ? "month" : "day";

  const [lines, sales, expenses] = await Promise.all([
    // Revenue and expense postings in range
    prisma.journalLine.findMany({
      where: {
        account: {
          type: { in: [ChartAccountType.REVENUE, ChartAccountType.EXPENSE] },
        },
        journalEntry: { date: { gte: from, lte: to } },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { code: true, name: true, type: true } },
        journalEntry: { select: { date: true } },
      },
    }),

    // Sales in range with item costs
    prisma.sale.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        subtotal: true,
        discount: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            returnedQuantity: true,
            unitPrice: true,
            stockBatch: { select: { purchasePrice: true } },
            product: {
              select: {
                productName: true,
                sku: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { category: true, amount: true },
    }),
  ]);

  // ----------------------------------------------------------
  // Totals + trend (ledger)
  // ----------------------------------------------------------
  const trendMap = new Map(
    buckets(from, to, granularity).map((key) => [
      key,
      { revenue: 0, cogs: 0, expenses: 0 },
    ]),
  );

  const opexByAccount = new Map<string, { name: string; amount: number }>();
  let revenue = 0;
  let cogs = 0;
  let opex = 0;

  for (const line of lines) {
    const key =
      granularity === "day"
        ? dayKey(line.journalEntry.date)
        : monthKey(line.journalEntry.date);
    const bucket = trendMap.get(key);
    const debit = Number(line.debit);
    const credit = Number(line.credit);

    if (line.account.type === ChartAccountType.REVENUE) {
      const value = credit - debit;
      revenue += value;
      if (bucket) bucket.revenue += value;
      continue;
    }

    const value = debit - credit;

    if (line.account.code === COGS_CODE) {
      cogs += value;
      if (bucket) bucket.cogs += value;
    } else {
      opex += value;
      if (bucket) bucket.expenses += value;

      const current = opexByAccount.get(line.account.code);
      opexByAccount.set(line.account.code, {
        name: line.account.name,
        amount: (current?.amount ?? 0) + value,
      });
    }
  }

  const fullTrend = Array.from(trendMap, ([period, value]) => ({
    period,
    revenue: value.revenue,
    cogs: value.cogs,
    expenses: value.expenses,
    profit: value.revenue - value.cogs - value.expenses,
  }));

  // Skip empty periods before the first activity (e.g. "all time")
  const firstActive = fullTrend.findIndex(
    (row) => row.revenue !== 0 || row.cogs !== 0 || row.expenses !== 0,
  );
  const trend =
    granularity === "month" && firstActive > 0 ? fullTrend.slice(firstActive) : fullTrend;

  // ----------------------------------------------------------
  // Products, categories, orders (sale items)
  // ----------------------------------------------------------
  type ProductRow = {
    productId: number;
    name: string;
    sku: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
  };

  const products = new Map<number, ProductRow>();
  let ordersRevenue = 0;
  let itemsSold = 0;
  let orderCount = 0;

  for (const sale of sales) {
    const subtotal = Number(sale.subtotal);
    // Spread the sale-level discount across its lines
    const discountRate = subtotal > 0 ? Number(sale.discount) / subtotal : 0;
    let saleHasItems = false;

    for (const item of sale.items) {
      const quantity = item.quantity - item.returnedQuantity;
      if (quantity <= 0) continue;

      saleHasItems = true;
      const lineRevenue = Number(item.unitPrice) * quantity * (1 - discountRate);
      const lineCost = Number(item.stockBatch.purchasePrice) * quantity;

      const row = products.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.productName,
        sku: item.product.sku,
        category: item.product.category.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
      };

      row.quantity += quantity;
      row.revenue += lineRevenue;
      row.cost += lineCost;
      products.set(item.productId, row);

      ordersRevenue += lineRevenue;
      itemsSold += quantity;
    }

    if (saleHasItems) orderCount += 1;
  }

  const productList = Array.from(products.values())
    .map((row) => ({
      ...row,
      profit: row.revenue - row.cost,
      margin: row.revenue > 0 ? (row.revenue - row.cost) / row.revenue : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  const categoryMap = new Map<string, { revenue: number; profit: number; quantity: number }>();
  for (const product of productList) {
    const current = categoryMap.get(product.category) ?? { revenue: 0, profit: 0, quantity: 0 };
    current.revenue += product.revenue;
    current.profit += product.profit;
    current.quantity += product.quantity;
    categoryMap.set(product.category, current);
  }

  const categories = Array.from(categoryMap, ([name, value]) => ({
    name,
    ...value,
    margin: value.revenue > 0 ? value.profit / value.revenue : 0,
  })).sort((a, b) => b.profit - a.profit);

  const itemsProfit = productList.reduce((sum, product) => sum + product.profit, 0);

  // ----------------------------------------------------------
  // Expense breakdown: expense categories + other expense accounts
  // ----------------------------------------------------------
  const expenseMap = new Map<string, number>();
  for (const expense of expenses) {
    expenseMap.set(expense.category, (expenseMap.get(expense.category) ?? 0) + Number(expense.amount));
  }

  const recordedExpenses = Array.from(expenseMap.values()).reduce((a, b) => a + b, 0);

  for (const [code, account] of opexByAccount) {
    if (code === GENERAL_EXPENSE_CODE) {
      // Anything posted to 5100 that isn't an expense record
      const rest = account.amount - recordedExpenses;
      if (Math.abs(rest) > 0.005) expenseMap.set("Other", (expenseMap.get("Other") ?? 0) + rest);
      continue;
    }

    const label = code === SALARY_CODE ? "Salaries" : account.name;
    expenseMap.set(label, (expenseMap.get(label) ?? 0) + account.amount);
  }

  const expenseBreakdown = Array.from(expenseMap, ([name, amount]) => ({ name, amount }))
    .filter((row) => Math.abs(row.amount) > 0.005)
    .sort((a, b) => b.amount - a.amount);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
    totals: {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      expenses: opex,
      netProfit: revenue - cogs - opex,
    },
    orders: {
      count: orderCount,
      itemsSold,
      revenue: ordersRevenue,
      profit: itemsProfit,
      averageOrderValue: orderCount ? ordersRevenue / orderCount : 0,
      averageProfitPerOrder: orderCount ? itemsProfit / orderCount : 0,
    },
    trend,
    products: productList,
    categories,
    expenses: expenseBreakdown,
  };
}
