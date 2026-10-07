import { prisma } from "../db/prisma.js";

// ============================================================
// GET JOURNAL LINES FOR TRIAL BALANCE
// ============================================================

export async function getTrialBalanceLines(
  from: Date,
  to: Date,
) {
  return prisma.journalLine.findMany({
    where: {
      journalEntry: {
        date: {
          gte: from,
          lte: to,
        },
      },
    },

    include: {
      account: true,
      journalEntry: true,
    },

    orderBy: {
      accountId: "asc",
    },
  });
}