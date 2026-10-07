// server/src/services/payroll.service.ts
//
// Pay employee salaries. Each payment posts:
//   Dr 5200 Salary/Wages Expense
//   Cr Cash / Bank / Wallet / Merchant   (tagged with the account)

import { prisma } from "../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  getPaymentChartCode,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";
import {
  availableBalance,
  parsePaymentMethod,
} from "../utils/money-source.js";
import {
  ServiceError,
  toServiceError,
  toServiceErrorSync,
} from "./service-error.js";

const SALARY_EXPENSE_CODE = "5200";

export type PayInput = {
  period: string; // "YYYY-MM"
  paidAt?: string; // "YYYY-MM-DD", defaults to today
  paymentMethod: string;
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
  items: { employeeId: number; amount: number }[];
};

const PAYMENT_INCLUDE = {
  employee: {
    select: { id: true, fname: true, lname: true, nationalId: true },
  },
  account: {
    select: { id: true, bankName: true, name: true, number: true, type: true },
  },
} as const;

function assertPeriod(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new ServiceError("Period must be a month like 2026-10.");
  }
}

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

async function chartAccountId(tx: Prisma.TransactionClient, code: string) {
  const account = await tx.chartAccount.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!account) throw new ServiceError(`Chart account ${code} not found`, 500);
  return account.id;
}

// ============================================================
// LIST
// ============================================================

export async function getPayments(period: string) {
  assertPeriod(period);

  return prisma.salaryPayment.findMany({
    where: { period },
    include: PAYMENT_INCLUDE,
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
  });
}

// ============================================================
// PAY
// ============================================================

export async function paySalaries(data: PayInput, userId: number) {
  const period = String(data.period ?? "");
  assertPeriod(period);

  const method = toServiceErrorSync(() =>
    parsePaymentMethod(data.paymentMethod),
  );

  const paidAt = data.paidAt
    ? new Date(`${data.paidAt}T12:00:00`)
    : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    throw new ServiceError("Invalid payment date.");
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    throw new ServiceError("Select at least one employee to pay.");
  }

  const ids = items.map((item) => Number(item.employeeId));
  if (new Set(ids).size !== ids.length) {
    throw new ServiceError("An employee appears twice in this payment.");
  }

  for (const item of items) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ServiceError("Every salary amount must be greater than 0.");
    }
  }

  const accountId =
    method === "CASH" ? null : Number(data.accountId) || null;

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return prisma.$transaction(async (tx) => {
    // ---------------- Employees ----------------
    const employees = await tx.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, fname: true, lname: true },
    });

    if (employees.length !== ids.length) {
      throw new ServiceError("One or more employees were not found.", 404);
    }

    const alreadyPaid = await tx.salaryPayment.findMany({
      where: { period, employeeId: { in: ids } },
      select: { employee: { select: { fname: true, lname: true } } },
    });

    if (alreadyPaid.length > 0) {
      const names = alreadyPaid
        .map((p) => `${p.employee.fname} ${p.employee.lname}`)
        .join(", ");
      throw new ServiceError(
        `Already paid for ${periodLabel(period)}: ${names}.`,
        409,
      );
    }

    // ---------------- Money source ----------------
    const available = await availableBalance(tx, method, accountId).catch(
      toServiceError,
    );

    if (total > available + 0.005) {
      throw new ServiceError(
        `Not enough money. Payroll total is ETB ${total.toFixed(2)} but only ETB ${available.toFixed(2)} is available.`,
      );
    }

    // ---------------- Post ----------------
    const salaryExpenseId = await chartAccountId(tx, SALARY_EXPENSE_CODE);
    const moneyChartId = await chartAccountId(
      tx,
      await getPaymentChartCode(tx, method, accountId),
    );
    const paymentAccountId = paymentAccountIdFor(method, accountId);
    const label = periodLabel(period);

    const created = [];

    for (const item of items) {
      const employee = employees.find((e) => e.id === Number(item.employeeId))!;
      const amount = new Prisma.Decimal(Number(item.amount).toFixed(2));

      const payment = await tx.salaryPayment.create({
        data: {
          employeeId: employee.id,
          period,
          amount,
          paidAt,
          paymentMethod: method,
          accountId,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
          userId,
        },
      });

      await tx.journalEntry.create({
        data: {
          date: paidAt,
          reference: data.reference?.trim() || `SAL-${period}-${employee.id}`,
          description: `Salary ${label} - ${employee.fname} ${employee.lname}`,
          salaryPaymentId: payment.id,
          lines: {
            create: [
              {
                accountId: salaryExpenseId,
                debit: amount,
                credit: 0,
              },
              {
                accountId: moneyChartId,
                paymentAccountId,
                debit: 0,
                credit: amount,
              },
            ],
          },
        },
      });

      created.push(payment.id);
    }

    return tx.salaryPayment.findMany({
      where: { id: { in: created } },
      include: PAYMENT_INCLUDE,
    });
  });
}

// ============================================================
// UNDO
// ============================================================

export async function undoPayment(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("Invalid payment ID.");
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.salaryPayment.findUnique({ where: { id } });
    if (!payment) throw new ServiceError("Salary payment not found.", 404);

    await tx.journalEntry.deleteMany({ where: { salaryPaymentId: id } });
    await tx.salaryPayment.delete({ where: { id } });
  });
}
