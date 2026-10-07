// server/src/services/vatPayment.service.ts
//
// Paying VAT to the tax authority. Each payment posts:
//   Dr 2100 VAT Payable
//   Cr Cash / Bank / Wallet / Merchant   (tagged with the account)

import { prisma } from "../db/prisma.js";
import { Prisma, TaxAuthority } from "../../generated/prisma/client.js";
import {
  getPaymentChartCode,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";
import { availableBalance, parsePaymentMethod } from "../utils/money-source.js";
import { TAX_AUTHORITY_LABELS, VAT_PAYABLE_CODE } from "./vat.service.js";
import {
  ServiceError,
  toServiceError,
  toServiceErrorSync,
} from "./service-error.js";

export type VatPaymentInput = {
  authority: string;
  amount: number;
  date?: string; // "YYYY-MM-DD", defaults to today
  paymentMethod: string;
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
};

const PAYMENT_INCLUDE = {
  account: {
    select: { id: true, bankName: true, name: true, number: true, type: true },
  },
  user: { select: { id: true, email: true } },
} as const;

function withLabel<T extends { authority: TaxAuthority }>(payment: T) {
  return { ...payment, authorityName: TAX_AUTHORITY_LABELS[payment.authority] };
}

// VAT still owed, from posted lines on 2100
async function vatPayable(tx: Prisma.TransactionClient) {
  const sums = await tx.journalLine.aggregate({
    where: { account: { code: VAT_PAYABLE_CODE } },
    _sum: { debit: true, credit: true },
  });

  return Number(sums._sum.credit ?? 0) - Number(sums._sum.debit ?? 0);
}

// ============================================================
// LIST
// ============================================================

export async function getVatPayments(range: { from?: Date | undefined; to?: Date | undefined } = {}) {
  const payments = await prisma.vatPayment.findMany({
    where: {
      date: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    },
    include: PAYMENT_INCLUDE,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return payments.map(withLabel);
}

export async function getVatPayableNow() {
  return { payable: await vatPayable(prisma) };
}

// ============================================================
// PAY
// ============================================================

export async function createVatPayment(data: VatPaymentInput, userId: number) {
  const authority = String(data.authority ?? "").toUpperCase();
  if (!(authority in TaxAuthority)) {
    throw new ServiceError("Choose who the VAT is paid to.");
  }

  const method = toServiceErrorSync(() => parsePaymentMethod(data.paymentMethod));
  const amountValue = Number(data.amount);

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new ServiceError("Amount must be greater than 0.");
  }

  const date = data.date ? new Date(`${data.date}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) throw new ServiceError("Invalid date.");

  const accountId = method === "CASH" ? null : Number(data.accountId) || null;
  const amount = new Prisma.Decimal(amountValue.toFixed(2));
  const authorityKey = authority as TaxAuthority;

  return prisma.$transaction(async (tx) => {
    const owed = await vatPayable(tx);

    if (owed <= 0.005) {
      throw new ServiceError("There is no VAT payable right now.");
    }
    if (amountValue > owed + 0.005) {
      throw new ServiceError(
        `You only owe ETB ${owed.toFixed(2)} in VAT. Lower the amount.`,
      );
    }

    const available = await availableBalance(tx, method, accountId).catch(toServiceError);
    if (amountValue > available + 0.005) {
      throw new ServiceError(
        `Not enough money. Payment is ETB ${amountValue.toFixed(2)} but only ETB ${available.toFixed(2)} is available.`,
      );
    }

    const payment = await tx.vatPayment.create({
      data: {
        authority: authorityKey,
        amount,
        date,
        paymentMethod: method,
        accountId,
        reference: data.reference?.trim() || null,
        notes: data.notes?.trim() || null,
        userId,
      },
    });

    const vatChart = await tx.chartAccount.findUnique({
      where: { code: VAT_PAYABLE_CODE },
      select: { id: true },
    });
    const moneyChart = await tx.chartAccount.findUnique({
      where: { code: await getPaymentChartCode(tx, method, accountId) },
      select: { id: true },
    });

    if (!vatChart || !moneyChart) {
      throw new ServiceError("Chart of accounts is missing an account.", 500);
    }

    await tx.journalEntry.create({
      data: {
        date,
        reference: payment.reference ?? `VATPAY-${payment.id}`,
        description: `VAT paid to ${TAX_AUTHORITY_LABELS[authorityKey]}`,
        vatPaymentId: payment.id,
        lines: {
          create: [
            { accountId: vatChart.id, debit: amount, credit: 0 },
            {
              accountId: moneyChart.id,
              paymentAccountId: paymentAccountIdFor(method, accountId),
              debit: 0,
              credit: amount,
            },
          ],
        },
      },
    });

    const created = await tx.vatPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: PAYMENT_INCLUDE,
    });
    return withLabel(created);
  });
}

// ============================================================
// UNDO
// ============================================================

export async function undoVatPayment(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ServiceError("Invalid payment ID.");

  await prisma.$transaction(async (tx) => {
    const payment = await tx.vatPayment.findUnique({ where: { id } });
    if (!payment) throw new ServiceError("VAT payment not found.", 404);

    await tx.journalEntry.deleteMany({ where: { vatPaymentId: id } });
    await tx.vatPayment.delete({ where: { id } });
  });
}
