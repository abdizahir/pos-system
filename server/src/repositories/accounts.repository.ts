import { prisma } from "../db/prisma.js";

import {
  AccountStatus,
  AccountType,
} from "../../generated/prisma/client.js";

export interface CreateAccountData {
  bankName?: string | null;
  name: string;
  number: string;
  type: AccountType;
  status?: AccountStatus;
}

export interface UpdateAccountData {
  bankName?: string | null;
  name?: string;
  number?: string;
  type?: AccountType;
  status?: AccountStatus;
}

export const accountRepository = {
  // ---------------------------------------------
  // FIND ALL
  // ---------------------------------------------
  async findAll() {
    return prisma.account.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  // ---------------------------------------------
  // FIND BY ID
  // ---------------------------------------------
  async findById(id: number) {
    return prisma.account.findUnique({
      where: {
        id,
      },
    });
  },

  // ---------------------------------------------
  // FIND MANY BY IDS
  // ---------------------------------------------
  async findManyByIds(ids: number[]) {
    return prisma.account.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  },

  // ---------------------------------------------
  // HAS POSTED JOURNAL LINES
  // ---------------------------------------------
  async hasJournalLines(id: number) {
    const line = await prisma.journalLine.findFirst({
      where: {
        paymentAccountId: id,
      },
      select: {
        id: true,
      },
    });

    return line !== null;
  },

  // ---------------------------------------------
  // LEDGER (CHART ACCOUNT) STATEMENT
  // ---------------------------------------------
  async findChartAccountByCode(code: string) {
    return prisma.chartAccount.findUnique({
      where: {
        code,
      },
    });
  },

  // Balance (debit - credit) per chart code
  async sumLedgerByChartCodes(codes: string[]) {
    const chartAccounts = await prisma.chartAccount.findMany({
      where: {
        code: {
          in: codes,
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    const sums = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: {
          in: chartAccounts.map((account) => account.id),
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const balances = new Map<string, number>();

    for (const chartAccount of chartAccounts) {
      const sum = sums.find((row) => row.accountId === chartAccount.id);

      balances.set(
        chartAccount.code,
        Number(sum?._sum.debit ?? 0) - Number(sum?._sum.credit ?? 0),
      );
    }

    return balances;
  },

  async sumLedgerBefore(
    chartAccountId: number,
    before: Date,
    paymentAccountIds?: number[],
  ) {
    return prisma.journalLine.aggregate({
      where: {
        accountId: chartAccountId,
        ...(paymentAccountIds
          ? { paymentAccountId: { in: paymentAccountIds } }
          : {}),
        journalEntry: {
          date: {
            lt: before,
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });
  },

  async findLedgerLines(
    chartAccountId: number,
    from?: Date,
    to?: Date,
    paymentAccountIds?: number[],
  ) {
    return prisma.journalLine.findMany({
      where: {
        accountId: chartAccountId,
        ...(paymentAccountIds
          ? { paymentAccountId: { in: paymentAccountIds } }
          : {}),
        journalEntry: {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        },
      },
      select: {
        id: true,
        debit: true,
        credit: true,
        paymentAccount: {
          select: {
            id: true,
            bankName: true,
            name: true,
            number: true,
          },
        },
        journalEntry: {
          select: {
            id: true,
            date: true,
            reference: true,
            description: true,
            saleId: true,
            purchaseId: true,
            expenseId: true,
            incomeId: true,
            salaryPaymentId: true,
            ownerWithdrawalId: true,
            vatPaymentId: true,
            saleReturnId: true,
          },
        },
      },
      orderBy: [
        {
          journalEntry: {
            date: "asc",
          },
        },
        {
          id: "asc",
        },
      ],
    });
  },

  // ---------------------------------------------
  // FIND BY ACCOUNT NUMBER
  // ---------------------------------------------
  async findByNumber(number: string) {
    return prisma.account.findUnique({
      where: {
        number,
      },
    });
  },

  // ---------------------------------------------
  // CREATE
  // ---------------------------------------------
  async create(data: CreateAccountData) {
    return prisma.account.create({
      data: {
        bankName: data.bankName ?? null,
        name: data.name,
        number: data.number,
        type: data.type,
        status: data.status ?? AccountStatus.ACTIVE,
      },
    });
  },

  // ---------------------------------------------
  // UPDATE
  // ---------------------------------------------
  async update(
    id: number,
    data: UpdateAccountData
  ) {
    const updateData: {
      bankName?: string | null;
      name?: string;
      number?: string;
      type?: AccountType;
      status?: AccountStatus;
    } = {};

    if (data.bankName !== undefined) {
      updateData.bankName = data.bankName;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.number !== undefined) {
      updateData.number = data.number;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return prisma.account.update({
      where: {
        id,
      },
      data: updateData,
    });
  },

  // ---------------------------------------------
  // DELETE
  // ---------------------------------------------
  async delete(id: number) {
    return prisma.account.delete({
      where: {
        id,
      },
    });
  },
};