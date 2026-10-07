import { prisma } from "../db/prisma.js";

export async function getBalanceSheetAccounts(asOf: Date) {
  return prisma.chartAccount.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      code: "asc",
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: {
              lte: asOf,
            },
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });
}