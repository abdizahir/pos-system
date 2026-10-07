// server/src/utils/money-source.ts
//
// Shared checks for money leaving the business (payroll, owner withdrawals).

import type { Prisma } from "../../generated/prisma/client.js";
import { getLedgerBalance, isMobileAccountType } from "./payment-accounts.js";

export const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE", "BANK"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class MoneySourceError extends Error {}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value ?? "").toUpperCase();

  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    throw new MoneySourceError("Invalid payment method.");
  }

  return method as PaymentMethod;
}

// Validates the account for the method and returns the ledger
// balance available to spend.
export async function availableBalance(
  tx: Prisma.TransactionClient,
  method: PaymentMethod,
  accountId: number | null,
) {
  if (method === "CASH") {
    const cash = await tx.journalLine.aggregate({
      where: { account: { code: "1000" } },
      _sum: { debit: true, credit: true },
    });

    return Number(cash._sum.debit ?? 0) - Number(cash._sum.credit ?? 0);
  }

  if (!accountId) {
    throw new MoneySourceError(
      `Select a ${method === "MOBILE" ? "wallet or merchant" : "bank"} account.`,
    );
  }

  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { type: true, status: true },
  });

  if (!account) throw new MoneySourceError("Selected account not found.");
  if (account.status !== "ACTIVE") {
    throw new MoneySourceError("Selected account is inactive.");
  }
  if ((method === "BANK" || method === "CARD") && account.type !== "BANK") {
    throw new MoneySourceError(`${method} payment must use a bank account.`);
  }
  if (method === "MOBILE" && !isMobileAccountType(account.type)) {
    throw new MoneySourceError(
      "Mobile payment must use a wallet or merchant account.",
    );
  }

  return getLedgerBalance(tx, accountId);
}
