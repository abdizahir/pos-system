// server/src/services/income.service.ts
//
// Income that is not a sale (service fees, commissions, rent received...).
// Each income posts:
//   Dr Cash / Bank / Wallet / Merchant   (tagged with the account)
//   Cr 4100 Other Income

import { prisma } from "../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  getPaymentChartCode,
  isMobileAccountType,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";

const OTHER_INCOME_CODE = "4100";

const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE", "BANK"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type IncomeInput = {
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
};

const INCOME_INCLUDE = {
  account: {
    select: {
      id: true,
      bankName: true,
      name: true,
      number: true,
      type: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

// ============================================================
// VALIDATION
// ============================================================

function cleanInput(data: IncomeInput) {
  const title = String(data.title ?? "").trim();
  const category = String(data.category ?? "").trim();
  const amount = Number(data.amount);
  // "YYYY-MM-DD" means that local day, not UTC midnight
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(data.date))
    ? new Date(`${data.date}T00:00:00`)
    : new Date(data.date);
  const paymentMethod = String(data.paymentMethod ?? "").toUpperCase();

  if (!title) throw new Error("Title is required");
  if (!category) throw new Error("Category is required");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (!data.date || Number.isNaN(date.getTime())) {
    throw new Error("A valid date is required");
  }

  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const accountId =
    paymentMethod === "CASH" ||
    data.accountId === null ||
    data.accountId === undefined
      ? null
      : Number(data.accountId);

  return {
    title,
    category,
    amount: new Prisma.Decimal(amount.toFixed(2)),
    date,
    paymentMethod: paymentMethod as PaymentMethod,
    accountId,
    reference: data.reference?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

async function validateAccount(
  tx: Prisma.TransactionClient,
  paymentMethod: PaymentMethod,
  accountId: number | null,
) {
  if (paymentMethod === "CASH") return;

  if (accountId === null || !Number.isInteger(accountId) || accountId <= 0) {
    throw new Error(
      `${paymentMethod === "MOBILE" ? "Mobile" : paymentMethod} income requires an account`,
    );
  }

  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { type: true, status: true },
  });

  if (!account) throw new Error("Selected account not found");
  if (account.status !== "ACTIVE") throw new Error("Selected account is inactive");

  if (
    (paymentMethod === "BANK" || paymentMethod === "CARD") &&
    account.type !== "BANK"
  ) {
    throw new Error(`${paymentMethod} income must use a bank account`);
  }

  if (paymentMethod === "MOBILE" && !isMobileAccountType(account.type)) {
    throw new Error("Mobile income must use a wallet or merchant account");
  }
}

// ============================================================
// JOURNAL
// ============================================================

async function chartAccountId(tx: Prisma.TransactionClient, code: string) {
  const account = await tx.chartAccount.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!account) throw new Error(`Chart account ${code} not found`);
  return account.id;
}

async function postIncomeJournal(
  tx: Prisma.TransactionClient,
  income: {
    id: number;
    title: string;
    category: string;
    amount: Prisma.Decimal;
    date: Date;
    paymentMethod: PaymentMethod;
    accountId: number | null;
    reference: string | null;
  },
) {
  const moneyAccountId = await chartAccountId(
    tx,
    await getPaymentChartCode(tx, income.paymentMethod, income.accountId),
  );
  const otherIncomeId = await chartAccountId(tx, OTHER_INCOME_CODE);

  await tx.journalEntry.create({
    data: {
      date: income.date,
      reference: income.reference ?? `INC-${income.id}`,
      description: `Income: ${income.title} - ${income.category}`,
      incomeId: income.id,
      lines: {
        create: [
          {
            accountId: moneyAccountId,
            paymentAccountId: paymentAccountIdFor(
              income.paymentMethod,
              income.accountId,
            ),
            debit: income.amount,
            credit: 0,
          },
          {
            accountId: otherIncomeId,
            debit: 0,
            credit: income.amount,
          },
        ],
      },
    },
  });
}

// ============================================================
// SERVICE
// ============================================================

export async function getIncomes(
  range: { from?: Date | undefined; to?: Date | undefined } = {},
) {
  return prisma.income.findMany({
    where: {
      date: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    },
    include: INCOME_INCLUDE,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

export async function getIncomeById(id: number) {
  const income = await prisma.income.findUnique({
    where: { id },
    include: INCOME_INCLUDE,
  });

  if (!income) throw new Error("Income not found");
  return income;
}

export async function createIncome(data: IncomeInput, userId: number) {
  const clean = cleanInput(data);

  return prisma.$transaction(async (tx) => {
    await validateAccount(tx, clean.paymentMethod, clean.accountId);

    const income = await tx.income.create({
      data: { ...clean, userId },
    });

    await postIncomeJournal(tx, { ...income, paymentMethod: clean.paymentMethod });

    return tx.income.findUniqueOrThrow({
      where: { id: income.id },
      include: INCOME_INCLUDE,
    });
  });
}

export async function updateIncome(id: number, data: IncomeInput) {
  const clean = cleanInput(data);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.income.findUnique({ where: { id } });
    if (!existing) throw new Error("Income not found");

    await validateAccount(tx, clean.paymentMethod, clean.accountId);

    const income = await tx.income.update({
      where: { id },
      data: clean,
    });

    // Rebuild the posting so the ledger always matches the record
    await tx.journalEntry.deleteMany({ where: { incomeId: id } });
    await postIncomeJournal(tx, { ...income, paymentMethod: clean.paymentMethod });

    return tx.income.findUniqueOrThrow({
      where: { id },
      include: INCOME_INCLUDE,
    });
  });
}

export async function deleteIncome(id: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.income.findUnique({ where: { id } });
    if (!existing) throw new Error("Income not found");

    await tx.journalEntry.deleteMany({ where: { incomeId: id } });
    await tx.income.delete({ where: { id } });
  });
}
