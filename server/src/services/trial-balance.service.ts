import { prisma } from "../db/prisma.js";
import { parseAsOfDate } from "../utils/report-date.js";

export async function getTrialBalance(asOf: string) {
  const endDate = parseAsOfDate(asOf);

  // Get all active chart accounts
  const accounts = await prisma.chartAccount.findMany({
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
              lte: endDate,
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

  let totalDebit = 0;
  let totalCredit = 0;

  const trialBalanceAccounts = accounts.map((account) => {
    let totalAccountDebit = 0;
    let totalAccountCredit = 0;

    for (const line of account.journalLines) {
      totalAccountDebit += Number(line.debit);
      totalAccountCredit += Number(line.credit);
    }

    // Calculate the account's ending balance.
    // Only the side with the remaining balance is shown.
    const balance = totalAccountDebit - totalAccountCredit;

    let debit = 0;
    let credit = 0;

    if (balance > 0) {
      debit = balance;
    } else if (balance < 0) {
      credit = Math.abs(balance);
    }

    totalDebit += debit;
    totalCredit += credit;

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit,
      credit,
    };
  });

  return {
    asOf,
    accounts: trialBalanceAccounts,
    totalDebit,
    totalCredit,
    isBalanced:
      Math.abs(totalDebit - totalCredit) < 0.01,
    balanceDifference: Math.abs(
      totalDebit - totalCredit,
    ),
  };
}