import { ChartAccountType } from "../../generated/prisma/client.js";
import * as balanceSheetRepository from "../repositories/balance-sheet.repository.js";

// ============================================================
// TYPES
// ============================================================

type Balance = {
  code: string;
  name: string;
  type: ChartAccountType;
  amount: number;
};

// ============================================================
// NORMAL BALANCE
// ============================================================

const normalBalance = (
  type: ChartAccountType,
  debit: number,
  credit: number,
): number => {
  switch (type) {
    case ChartAccountType.ASSET:
    case ChartAccountType.EXPENSE:
      return debit - credit;

    case ChartAccountType.LIABILITY:
    case ChartAccountType.EQUITY:
    case ChartAccountType.REVENUE:
      return credit - debit;

    default:
      return 0;
  }
};

// ============================================================
// SUM BALANCES
// ============================================================

const sum = (
  balances: Balance[],
  predicate: (balance: Balance) => boolean,
): number => {
  return balances
    .filter(predicate)
    .reduce(
      (total, balance) => total + balance.amount,
      0,
    );
};

// ============================================================
// GET BALANCE SHEET
// ============================================================

export async function getBalanceSheet(asOf: Date) {
  // ============================================================
  // GET CHART ACCOUNTS + JOURNAL LINES
  // ============================================================

  const accounts =
    await balanceSheetRepository.getBalanceSheetAccounts(asOf);

  // ============================================================
  // CALCULATE EACH ACCOUNT BALANCE
  // ============================================================

  const balances: Balance[] = accounts.map((account) => {
    let debit = 0;
    let credit = 0;

    for (const line of account.journalLines) {
      debit += Number(line.debit);
      credit += Number(line.credit);
    }

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      amount: normalBalance(
        account.type,
        debit,
        credit,
      ),
    };
  });

  // ============================================================
  // FIND ACCOUNT BY CODE
  // ============================================================

  const byCode = (code: string): number => {
    return (
      balances.find(
        (balance) => balance.code === code,
      )?.amount ?? 0
    );
  };

  // ============================================================
  // ASSETS
  // ============================================================

  // 1000 - Cash
  const cashBalance = byCode("1000");

  // 1010 - Bank Accounts
  const bankBalance = byCode("1010");

  // 1020 - Mobile Wallets
  const mobileWalletBalance = byCode("1020");

  // 1030 - Merchant Accounts
  const merchantBalance = byCode("1030");

  // 1100 - Inventory
  const inventoryValue = byCode("1100");

  // 1200 - Accounts Receivable
  const accountsReceivable = byCode("1200");

  // Other asset accounts
  const otherAssets = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.ASSET &&
      ![
        "1000",
        "1010",
        "1020",
        "1030",
        "1100",
        "1200",
      ].includes(balance.code),
  );

  // Total assets
  const totalAssets =
    cashBalance +
    bankBalance +
    mobileWalletBalance +
    merchantBalance +
    inventoryValue +
    accountsReceivable +
    otherAssets;

  // ============================================================
  // LIABILITIES
  // ============================================================

  // 2000 - Accounts Payable / Supplier Payables
  const supplierPayables = byCode("2000");

  // Loan accounts
  const loans = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.LIABILITY &&
      /loan/i.test(
        `${balance.code} ${balance.name}`,
      ),
  );

  // Other liability accounts
  const otherDebts = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.LIABILITY &&
      balance.code !== "2000" &&
      !/loan/i.test(
        `${balance.code} ${balance.name}`,
      ),
  );

  // Total liabilities
  const totalLiabilities =
    supplierPayables +
    loans +
    otherDebts;

  // ============================================================
  // EQUITY
  // ============================================================

  // 3000 - Owner Capital
  const ownersCapital = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.EQUITY &&
      (
        balance.code === "3000" ||
        /owner|capital/i.test(balance.name)
      ),
  );

  // Other equity accounts
  const otherEquity = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.EQUITY &&
      balance.code !== "3000" &&
      !/owner|capital/i.test(
        balance.name,
      ),
  );

  // ============================================================
  // PROFIT / LOSS
  // ============================================================

  // Revenue has a normal credit balance
  const revenue = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.REVENUE,
  );

  // Expenses have a normal debit balance
  // This includes COGS if COGS is ChartAccountType.EXPENSE
  const expenses = sum(
    balances,
    (balance) =>
      balance.type === ChartAccountType.EXPENSE,
  );

  // Net profit = Revenue - Expenses
  const retainedProfit =
    revenue - expenses;

  // ============================================================
  // TOTAL EQUITY
  // ============================================================

  const totalEquity =
    ownersCapital +
    otherEquity +
    retainedProfit;

  // ============================================================
  // LIABILITIES + EQUITY
  // ============================================================

  const liabilitiesAndEquity =
    totalLiabilities +
    totalEquity;

  // ============================================================
  // BALANCE CHECK
  // ============================================================

  const balanceDifference =
    totalAssets -
    liabilitiesAndEquity;

  const isBalanced =
    Math.abs(balanceDifference) < 0.01;

  // ============================================================
  // RETURN
  // ============================================================

  return {
    asOf: asOf.toISOString(),

    assets: {
      cash: cashBalance,
      bankAccounts: bankBalance,
      mobileWallets: mobileWalletBalance,
      merchantAccounts: merchantBalance,
      inventory: inventoryValue,
      accountsReceivable,
      otherAssets,
      total: totalAssets,
    },

    liabilities: {
      supplierPayables,
      loans,
      otherDebts,
      total: totalLiabilities,
    },

    equity: {
      ownersCapital,
      otherEquity,
      retainedProfit,
      total: totalEquity,
    },

    liabilitiesAndEquity,

    balanceDifference,

    isBalanced,

    accountBalances: balances.sort(
      (a, b) =>
        a.code.localeCompare(b.code),
    ),
  };
}