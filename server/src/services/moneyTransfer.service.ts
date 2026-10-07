import { Prisma } from "../../generated/prisma/client.js";
import { getLedgerBalance } from "../utils/payment-accounts.js";
import { prisma } from "../db/prisma.js";
import { moneyTransferRepository } from "../repositories/moneyTransfer.repository.js";

// ============================================================
// TYPES
// ============================================================

type CreateMoneyTransferInput = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  userId: number;
};

// ============================================================
// CONSTANTS
// ============================================================

const REFERENCE_PREFIX = "REF";
const NUMBER_PREFIX = "TRF";

// Chart of accounts codes used for each account type.
// Adjust these if your chart uses different codes.
const CHART_CODE = {
  CASH: "1000",
  BANK: "1010",
  WALLET: "1020",
  MERCHANT: "1030",
} as const;

// ============================================================
// HELPERS
// ============================================================

function getTransferTimestamp() {
  return Date.now();
}

function createTransferReference(timestamp: number) {
  return `${REFERENCE_PREFIX}-${timestamp}`;
}

function createTransferNumber(timestamp: number) {
  return `${NUMBER_PREFIX}-${timestamp}`;
}

function chartCodeFor(type: keyof typeof CHART_CODE) {
  return CHART_CODE[type];
}

// ============================================================
// SERVICE
// ============================================================

export const moneyTransferService = {
  async getMoneyTransfers() {
    return moneyTransferRepository.findAll();
  },

  async createMoneyTransfer(data: CreateMoneyTransferInput) {
    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (
      !Number.isInteger(data.fromAccountId) ||
      data.fromAccountId <= 0
    ) {
      throw new Error("Invalid from account ID.");
    }

    if (
      !Number.isInteger(data.toAccountId) ||
      data.toAccountId <= 0
    ) {
      throw new Error("Invalid to account ID.");
    }

    if (data.fromAccountId === data.toAccountId) {
      throw new Error(
        "From account and to account must be different.",
      );
    }

    if (
      !Number.isFinite(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error(
        "Transfer amount must be greater than 0.",
      );
    }

    if (
      !Number.isInteger(data.userId) ||
      data.userId <= 0
    ) {
      throw new Error("Invalid user ID.");
    }

    const transferAmount = new Prisma.Decimal(data.amount);
    const transferDate = new Date();

    // --------------------------------------------------------
    // Transaction
    // --------------------------------------------------------

    return prisma.$transaction(async (tx) => {
      // ------------------------------------------------------
      // 1. Load accounts
      // ------------------------------------------------------

      const fromAccount = await tx.account.findUnique({
        where: { id: data.fromAccountId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      });

      if (!fromAccount) {
        throw new Error("From account not found.");
      }

      if (fromAccount.status !== "ACTIVE") {
        throw new Error("From account is inactive.");
      }

      const toAccount = await tx.account.findUnique({
        where: { id: data.toAccountId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      });

      if (!toAccount) {
        throw new Error("To account not found.");
      }

      if (toAccount.status !== "ACTIVE") {
        throw new Error("To account is inactive.");
      }

      // ------------------------------------------------------
      // 2. Check balance
      // ------------------------------------------------------

      const fromBalance = await getLedgerBalance(
        tx,
        fromAccount.id,
      );

      if (
        new Prisma.Decimal(fromBalance).lessThan(transferAmount)
      ) {
        throw new Error(
          "Insufficient balance in from account.",
        );
      }

      // ------------------------------------------------------
      // 3. Create transfer row
      // ------------------------------------------------------

      const timestamp = getTransferTimestamp();
      const reference = createTransferReference(timestamp);
      const number = createTransferNumber(timestamp);

      const transfer = await moneyTransferRepository.create(
        tx,
        {
          date: transferDate,
          reference,
          number,
          amount: transferAmount,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          userId: data.userId,
        },
      );

      // ------------------------------------------------------
      // 4. Move cached balances
      // ------------------------------------------------------

      await tx.account.update({
        where: { id: data.fromAccountId },
        data: {
          currentBalance: {
            decrement: transferAmount,
          },
        },
      });

      await tx.account.update({
        where: { id: data.toAccountId },
        data: {
          currentBalance: {
            increment: transferAmount,
          },
        },
      });

      // ------------------------------------------------------
      // 5. Post to the general ledger
      // ------------------------------------------------------
      //
      // Transferring X from `from` → `to` means:
      //   Dr  to   X    (money comes INTO the to-account)
      //   Cr  from X    (money goes OUT of the from-account)

      const fromChart = await tx.chartAccount.findUnique({
        where: { code: chartCodeFor(fromAccount.type) },
        select: { id: true },
      });

      const toChart = await tx.chartAccount.findUnique({
        where: { code: chartCodeFor(toAccount.type) },
        select: { id: true },
      });

      if (!fromChart || !toChart) {
        throw new Error(
          "Chart of accounts is missing the bank/wallet entries.",
        );
      }

      await tx.journalEntry.create({
        data: {
          date: transferDate,
          reference: number,
          description:
            `Money transfer ${number} — ` +
            `${fromAccount.name} → ${toAccount.name}`,

          lines: {
            create: [
              {
                accountId: toChart.id,
                paymentAccountId: toAccount.id,
                debit: transferAmount,
                credit: 0,
              },
              {
                accountId: fromChart.id,
                paymentAccountId: fromAccount.id,
                debit: 0,
                credit: transferAmount,
              },
            ],
          },
        },
      });

      // ------------------------------------------------------
      // 6. Done
      // ------------------------------------------------------

      return transfer;
    });
  },
};