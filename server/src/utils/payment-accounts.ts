import type {
  AccountType,
  PaymentMethod,
  Prisma,
} from "../../generated/prisma/client.js";

// ============================================================
// PAYMENT METHOD ↔ ACCOUNT RULES
// ============================================================
//
// CASH   -> 1000 Cash (no account)
// BANK   -> 1010 Bank Accounts      (BANK account)
// CARD   -> 1010 Bank Accounts      (BANK account)
// MOBILE -> 1020 Mobile Wallets     (WALLET account)
//        -> 1030 Merchant Accounts  (MERCHANT account)
// ============================================================

export const CHART_CODE_BY_ACCOUNT_TYPE: Record<AccountType, string> = {
  BANK: "1010",
  WALLET: "1020",
  MERCHANT: "1030",
};

export function isMobileAccountType(type: AccountType) {
  return type === "WALLET" || type === "MERCHANT";
}

// Record-only: cash purchases, supplier payments and expenses are
// treated as paid from outside the till, so they are booked against
// Owner's Capital and never take money out of the Cash Register.
export const RECORD_ONLY_CHART_CODE = "3000";

// Chart code for a payment method. MOBILE depends on whether the
// selected account is a wallet or a merchant account.
export async function getPaymentChartCode(
  tx: Prisma.TransactionClient,
  method: PaymentMethod,
  accountId?: number | null,
) {
  switch (method) {
    case "CASH":
      return "1000";

    case "BANK":
    case "CARD":
      return "1010";

    case "MOBILE": {
      if (!accountId) return CHART_CODE_BY_ACCOUNT_TYPE.WALLET;

      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { type: true },
      });

      return account?.type === "MERCHANT"
        ? CHART_CODE_BY_ACCOUNT_TYPE.MERCHANT
        : CHART_CODE_BY_ACCOUNT_TYPE.WALLET;
    }

    default:
      throw new Error("Invalid payment method");
  }
}

// ============================================================
// LEDGER BALANCES (posted journal lines are the source of truth)
// ============================================================

// Account a payment journal line belongs to. Cash has no account.
export function paymentAccountIdFor(
  method: string | null | undefined,
  accountId: number | null | undefined,
) {
  if (!method || method === "CASH") return null;
  return accountId ?? null;
}

// Balance of one bank / wallet / merchant account
export async function getLedgerBalance(
  tx: Prisma.TransactionClient,
  accountId: number,
) {
  const sums = await tx.journalLine.aggregate({
    where: { paymentAccountId: accountId },
    _sum: { debit: true, credit: true },
  });

  return Number(sums._sum.debit ?? 0) - Number(sums._sum.credit ?? 0);
}

// Balances for many accounts at once
export async function getLedgerBalances(
  tx: Prisma.TransactionClient,
  accountIds?: number[],
) {
  const rows = await tx.journalLine.groupBy({
    by: ["paymentAccountId"],
    where: {
      paymentAccountId: accountIds ? { in: accountIds } : { not: null },
    },
    _sum: { debit: true, credit: true },
  });

  const balances = new Map<number, number>();

  for (const row of rows) {
    if (row.paymentAccountId === null) continue;

    balances.set(
      row.paymentAccountId,
      Number(row._sum.debit ?? 0) - Number(row._sum.credit ?? 0),
    );
  }

  return balances;
}
