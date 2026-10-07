import { prisma } from "../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

export type CreateMoneyTransferData = {
  date: Date;
  reference: string;
  number: string;
  amount: Prisma.Decimal;
  fromAccountId: number;
  toAccountId: number;
  userId: number;
};

const transferInclude = {
  fromAccount: {
    select: {
      id: true,
      bankName: true,
      name: true,
      number: true,
    },
  },
  toAccount: {
    select: {
      id: true,
      bankName: true,
      name: true,
      number: true,
    },
  },
} as const;

export const moneyTransferRepository = {
  async findAll() {
    return prisma.moneyTransfer.findMany({
      include: transferInclude,
      orderBy: [
        {
          date: "desc",
        },
        {
          id: "desc",
        },
      ],
    });
  },

  async create(
    tx: Prisma.TransactionClient,
    data: CreateMoneyTransferData,
  ) {
    return tx.moneyTransfer.create({
      data: {
        date: data.date,
        reference: data.reference,
        number: data.number,
        amount: data.amount,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        userId: data.userId,
      },
      include: transferInclude,
    });
  },
};
