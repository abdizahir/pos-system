// server/src/services/vat.service.ts

import { prisma } from "../db/prisma.js";

export const VAT_PAYABLE_CODE = "2100";
export const VAT_RATE = 0.15;

// ============================================================
// VAT STATEMENT
// ============================================================
// Built from posted journal lines on 2100 VAT Payable.
// Credits = VAT collected on sales (owed),
// debits  = VAT reversed by returns / cancellations, or paid
//           to the tax authority (VatPayment).

export const TAX_AUTHORITY_LABELS = {
  SOMALI_REGIONAL_STATE_REVENUE_BUREAU: "Somali Regional State Revenue Bureau",
  JIGJIGA_CITY_REVENUE_BUREAU: "Jigjiga City Revenue Bureau",
} as const;

export async function getVatStatement(from: Date, to: Date) {
  const chartAccount = await prisma.chartAccount.findUnique({
    where: { code: VAT_PAYABLE_CODE },
  });

  if (!chartAccount) {
    throw new Error("VAT Payable account (2100) not found");
  }

  const before = await prisma.journalLine.aggregate({
    where: {
      accountId: chartAccount.id,
      journalEntry: { date: { lt: from } },
    },
    _sum: { debit: true, credit: true },
  });

  const openingBalance =
    Number(before._sum.credit ?? 0) - Number(before._sum.debit ?? 0);

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: chartAccount.id,
      journalEntry: { date: { gte: from, lte: to } },
    },
    select: {
      id: true,
      debit: true,
      credit: true,
      journalEntry: {
        select: {
          id: true,
          date: true,
          reference: true,
          description: true,
          sale: {
            select: { id: true, invoiceNumber: true, total: true, tax: true },
          },
          saleReturn: {
            select: {
              id: true,
              total: true,
              tax: true,
              sale: { select: { invoiceNumber: true } },
            },
          },
          vatPayment: {
            select: { id: true, authority: true, reference: true },
          },
        },
      },
    },
    orderBy: [{ journalEntry: { date: "asc" } }, { id: "asc" }],
  });

  let balance = openingBalance;
  let outputVat = 0;
  let reversedVat = 0;
  let paidVat = 0;
  let taxableSales = 0;

  const transactions = lines.map((line) => {
    const entry = line.journalEntry;
    const credit = Number(line.credit);
    const debit = Number(line.debit);
    const vat = credit - debit;

    let source = "Journal";
    let reference = entry.reference;
    let taxableAmount: number | null = null;

    if (entry.vatPayment) {
      source = "VAT Payment";
      reference = entry.vatPayment.reference ?? `VATPAY-${entry.vatPayment.id}`;
    } else if (entry.saleReturn) {
      source = "Sale Return";
      reference = entry.saleReturn.sale.invoiceNumber;
      taxableAmount = -(
        Number(entry.saleReturn.total) - Number(entry.saleReturn.tax)
      );
    } else if (entry.sale) {
      const net = Number(entry.sale.total) - Number(entry.sale.tax);
      source = debit > 0 ? "Sale Cancelled" : "Sale";
      reference = entry.sale.invoiceNumber;
      taxableAmount = debit > 0 ? -net : net;
    }

    balance += vat;
    outputVat += credit;
    if (entry.vatPayment) paidVat += debit;
    else reversedVat += debit;
    taxableSales += taxableAmount ?? 0;

    return {
      id: line.id,
      date: entry.date.toISOString(),
      source,
      reference,
      description: entry.description ?? "",
      saleId: entry.sale?.id ?? null,
      vatPaymentId: entry.vatPayment?.id ?? null,
      authority: entry.vatPayment
        ? TAX_AUTHORITY_LABELS[entry.vatPayment.authority]
        : null,
      taxableAmount,
      vat,
      balance,
    };
  });

  // Newest first
  transactions.reverse();

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    rate: VAT_RATE,
    summary: {
      openingBalance,
      taxableSales,
      outputVat,
      reversedVat,
      netVat: outputVat - reversedVat,
      paidVat,
      closingBalance: balance,
    },
    transactions,
  };
}

// Day summary for the dashboard
export async function getVatSummary(from: Date, to: Date) {
  const chartAccount = await prisma.chartAccount.findUnique({
    where: { code: VAT_PAYABLE_CODE },
    select: { id: true },
  });

  if (!chartAccount) {
    return { collected: 0, reversed: 0, paid: 0, net: 0, payable: 0 };
  }

  const inDay = { date: { gte: from, lte: to } };

  const [day, paidDay, total] = await Promise.all([
    prisma.journalLine.aggregate({
      where: { accountId: chartAccount.id, journalEntry: inDay },
      _sum: { debit: true, credit: true },
    }),
    prisma.journalLine.aggregate({
      where: {
        accountId: chartAccount.id,
        journalEntry: { ...inDay, vatPaymentId: { not: null } },
      },
      _sum: { debit: true },
    }),
    prisma.journalLine.aggregate({
      where: {
        accountId: chartAccount.id,
        journalEntry: { date: { lte: to } },
      },
      _sum: { debit: true, credit: true },
    }),
  ]);

  const collected = Number(day._sum.credit ?? 0);
  const paid = Number(paidDay._sum.debit ?? 0);
  const reversed = Number(day._sum.debit ?? 0) - paid;

  return {
    collected,
    reversed,
    paid,
    net: collected - reversed,
    payable: Number(total._sum.credit ?? 0) - Number(total._sum.debit ?? 0),
  };
}
