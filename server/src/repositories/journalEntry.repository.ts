import { prisma } from "../db/prisma.js";

export const createJournalEntry = async (data: {
  date?: Date;
  reference?: string;
  description?: string;
  lines: {
    accountId: number;
    paymentAccountId?: number | null;
    debit?: number;
    credit?: number;
  }[];
}) => {
  return prisma.journalEntry.create({
    data: {
      date: data.date ?? new Date(),
      reference: data.reference ?? null,
      description: data.description ?? null,

      lines: {
        create: data.lines.map((line) => ({
          accountId: line.accountId,
          paymentAccountId: line.paymentAccountId ?? null,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
        })),
      },
    },

    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
};

export const getJournalEntries = async () => {
  return prisma.journalEntry.findMany({
    orderBy: {
      date: "desc",
    },

    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
};

export const getJournalEntryById = async (id: number) => {
  return prisma.journalEntry.findUnique({
    where: {
      id,
    },

    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
};

export const deleteJournalEntry = async (id: number) => {
  return prisma.journalEntry.delete({
    where: {
      id,
    },
  });
};
