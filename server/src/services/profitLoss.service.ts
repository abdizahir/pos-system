import { ChartAccountType } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

type ProfitLossAccount = {
  id: number;
  code: string;
  name: string;
  amount: number;
};

function getNormalBalance(
  type: ChartAccountType,
  debit: number,
  credit: number,
) {
  switch (type) {
    case ChartAccountType.REVENUE:
      return credit - debit;

    case ChartAccountType.EXPENSE:
      return debit - credit;

    default:
      return 0;
  }
}

export async function getProfitLoss(
  from: Date,
  to: Date,
) {
  // ------------------------------------------------------
  // Load revenue + expense accounts with journal lines
  // that fall inside the date range.
  // ------------------------------------------------------

  const accounts = await prisma.chartAccount.findMany({
    where: {
      isActive: true,
      type: {
        in: [
          ChartAccountType.REVENUE,
          ChartAccountType.EXPENSE,
        ],
      },
    },
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: {
              gte: from,
              lte: to,
            },
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });

  const balances = accounts.map((account) => {
    let debit = 0;
    let credit = 0;

    for (const line of account.journalLines) {
      debit += Number(line.debit);
      credit += Number(line.credit);
    }

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      amount: getNormalBalance(
        account.type,
        debit,
        credit,
      ),
    };
  });

  const revenueAccounts: ProfitLossAccount[] = balances
    .filter(
      (a) => a.type === ChartAccountType.REVENUE,
    )
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amount: a.amount,
    }));

  const costOfSalesAccounts: ProfitLossAccount[] = balances
    .filter(
      (a) =>
        a.type === ChartAccountType.EXPENSE &&
        a.code === "5000",
    )
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amount: a.amount,
    }));

  const operatingExpenseAccounts: ProfitLossAccount[] = balances
    .filter(
      (a) =>
        a.type === ChartAccountType.EXPENSE &&
        a.code !== "5000",
    )
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amount: a.amount,
    }));

  const totalRevenue = revenueAccounts.reduce(
    (sum, a) => sum + a.amount,
    0,
  );

  const totalCostOfSales = costOfSalesAccounts.reduce(
    (sum, a) => sum + a.amount,
    0,
  );

  const grossProfit = totalRevenue - totalCostOfSales;

  const totalOperatingExpenses =
    operatingExpenseAccounts.reduce(
      (sum, a) => sum + a.amount,
      0,
    );

  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    from: from.toISOString(),
    to: to.toISOString(),

    revenue: {
      accounts: revenueAccounts,
      total: totalRevenue,
    },
    costOfSales: {
      accounts: costOfSalesAccounts,
      total: totalCostOfSales,
    },
    operatingExpenses: {
      accounts: operatingExpenseAccounts,
      total: totalOperatingExpenses,
    },
    grossProfit,
    netProfit,
    isProfit: netProfit >= 0,
  };
}