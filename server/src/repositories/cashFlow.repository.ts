// server/src/repositories/cashFlow.repository.ts

import { prisma } from "../db/prisma.js";

// ------------------------------------------------------------
// All cash movements in a date window
// ------------------------------------------------------------

export async function getSalesInRange(from: Date, to: Date) {
  return prisma.sale.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ["COMPLETED", "PENDING"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      paidAmount: true,
    },
  });
}

export async function getPurchasesInRange(from: Date, to: Date) {
  return prisma.purchase.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ["COMPLETED", "PENDING"] },
    },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      paidAmount: true,
    },
  });
}

export async function getExpensesInRange(from: Date, to: Date) {
  return prisma.expense.findMany({
    where: {
      date: { gte: from, lte: to },
    },
    select: {
      id: true,
      title: true,
      category: true,
      date: true,
      amount: true,
      paymentMethod: true,
    },
  });
}

export async function getPaymentsInRange(from: Date, to: Date) {
  return prisma.payment.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      saleId: true,
      method: true,
      amount: true,
      createdAt: true,
    },
  });
}

export async function getMoneyTransfersInRange(from: Date, to: Date) {
  return prisma.moneyTransfer.findMany({
    where: {
      date: { gte: from, lte: to },
    },
    select: {
      id: true,
      number: true,
      date: true,
      amount: true,
      fromAccountId: true,
      toAccountId: true,
    },
  });
}