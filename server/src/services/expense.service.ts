import { prisma } from "../db/prisma.js";
import {
  getPaymentChartCode,
  isMobileAccountType,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";

import {
  getExpenseById as getExpenseByIdRepository,
  getExpenses as getExpensesRepository,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "../repositories/expense.repository.js";

import { Prisma } from "../../generated/prisma/client.js";
import { availableBalance } from "../utils/money-source.js";

// ============================================================
// PAYMENT METHODS
// ============================================================

const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "MOBILE",
  "BANK",
] as const;

type PaymentMethod =
  (typeof PAYMENT_METHODS)[number];

const isPaymentMethod = (
  value: string,
): value is PaymentMethod => {
  return PAYMENT_METHODS.includes(
    value as PaymentMethod,
  );
};

// ============================================================
// GET CHART ACCOUNT ID
// ============================================================

async function getChartAccountId(
  tx: Prisma.TransactionClient,
  code: string,
) {
  const account =
    await tx.chartAccount.findUnique({
      where: {
        code,
      },

      select: {
        id: true,
        code: true,
        name: true,
      },
    });

  if (!account) {
    throw new Error(
      `Chart account ${code} not found`,
    );
  }

  return account.id;
}

// ============================================================
// GET EXPENSE ACCOUNT
// ============================================================
//
// Currently all expenses go to:
// 5100 - Operating Expenses
//
// Later, you can create more specific accounts such as:
// 5110 Rent Expense
// 5120 Electricity Expense
// 5130 Salary Expense
// 5140 Transport Expense
// etc.
// ============================================================

async function getExpenseAccountId(
  tx: Prisma.TransactionClient,
) {
  return getChartAccountId(
    tx,
    "5100",
  );
}

// ============================================================
// GET PAYMENT ACCOUNT
// ============================================================
//
// CASH   -> 1000 Cash
// BANK   -> 1010 Bank Accounts
// CARD   -> 1010 Bank Accounts
// MOBILE -> 1020 Mobile Wallets / 1030 Merchant Accounts
// ============================================================

async function getPaymentAccountId(
  tx: Prisma.TransactionClient,
  paymentMethod: PaymentMethod,
  accountId?: number | null,
) {
  return getChartAccountId(
    tx,
    await getPaymentChartCode(
      tx,
      paymentMethod,
      accountId,
    ),
  );
}

// ============================================================
// VALIDATE ACTUAL PAYMENT ACCOUNT
// ============================================================

async function validateActualPaymentAccount(
  tx: Prisma.TransactionClient,
  paymentMethod: PaymentMethod,
  accountId: number | null | undefined,
) {
  if (paymentMethod === "CASH") {
    if (
      accountId !== undefined &&
      accountId !== null
    ) {
      throw new Error(
        "Cash payment cannot have an account.",
      );
    }

    return null;
  }

  if (
    typeof accountId !== "number" ||
    !Number.isInteger(accountId) ||
    accountId <= 0
  ) {
    throw new Error(
      `${
        paymentMethod === "MOBILE"
          ? "Mobile"
          : paymentMethod
      } payment requires a valid account.`,
    );
  }

  const account =
    await tx.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        type: true,
        status: true,
      },
    });

  if (!account) {
    throw new Error(
      "Selected account not found.",
    );
  }

  if (account.status !== "ACTIVE") {
    throw new Error(
      "Selected account is inactive.",
    );
  }

  if (
    (paymentMethod === "BANK" ||
      paymentMethod === "CARD") &&
    account.type !== "BANK"
  ) {
    throw new Error(
      `${paymentMethod} payment must use a bank account.`,
    );
  }

  if (
    paymentMethod === "MOBILE" &&
    !isMobileAccountType(account.type)
  ) {
    throw new Error(
      "Mobile payment must use a wallet or merchant account.",
    );
  }

  return account.id;
}

// ============================================================
// UPDATE ACTUAL ACCOUNT BALANCE
// ============================================================

async function updateActualAccountBalance(
  tx: Prisma.TransactionClient,
  paymentMethod: PaymentMethod,
  accountId: number | null,
  amount: Prisma.Decimal | number,
  direction: "increment" | "decrement",
) {
  if (
    paymentMethod === "CASH" ||
    accountId === null
  ) {
    return;
  }

  await tx.account.update({
    where: {
      id: accountId,
    },
    data: {
      currentBalance: {
        [direction]:
          amount instanceof Prisma.Decimal
            ? amount
            : new Prisma.Decimal(amount),
      },
    },
  });
}

// ============================================================
// CREATE EXPENSE JOURNAL
// ============================================================

async function createExpenseJournal(
  tx: Prisma.TransactionClient,
  expense: {
    id: number;
    title: string;
    category: string;
    amount: Prisma.Decimal;
    date: Date;
    paymentMethod: string;
    accountId: number | null;
    reference: string | null;
  },
) {
  // ----------------------------------------------------------
  // VALIDATE PAYMENT METHOD
  // ----------------------------------------------------------

  if (
    !isPaymentMethod(
      expense.paymentMethod,
    )
  ) {
    throw new Error(
      "Invalid payment method",
    );
  }

  // ----------------------------------------------------------
  // ENOUGH MONEY?
  // ----------------------------------------------------------
  // On edit the old entry is already removed, so its amount is
  // back in the balance here.

  const available = await availableBalance(
    tx,
    expense.paymentMethod,
    expense.accountId,
  ).catch((error: unknown) => {
    throw new Error(error instanceof Error ? error.message : "Invalid payment account");
  });

  if (Number(expense.amount) > available + 0.005) {
    throw new Error(
      `Not enough money. Expense is ETB ${Number(expense.amount).toFixed(2)} but only ETB ${available.toFixed(2)} is available.`,
    );
  }

  // ----------------------------------------------------------
  // GET ACCOUNTS
  // ----------------------------------------------------------

  const expenseAccountId =
    await getExpenseAccountId(
      tx,
    );

  const paymentAccountId =
    await getPaymentAccountId(
      tx,
      expense.paymentMethod,
      expense.accountId,
    );

  // ----------------------------------------------------------
  // AMOUNT
  // ----------------------------------------------------------

  const amount = Number(
    expense.amount,
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Expense amount must be greater than 0",
    );
  }

  // ----------------------------------------------------------
  // JOURNAL LINES
  // ----------------------------------------------------------

  const journalLines = [
    {
      accountId:
        expenseAccountId,

      paymentAccountId: null,

      debit: amount,

      credit: 0,
    },

    {
      accountId:
        paymentAccountId,

      paymentAccountId:
        paymentAccountIdFor(
          expense.paymentMethod,
          expense.accountId,
        ),

      debit: 0,

      credit: amount,
    },
  ];

  // ----------------------------------------------------------
  // VERIFY BALANCE
  // ----------------------------------------------------------

  const totalDebit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.debit,
      0,
    );

  const totalCredit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.credit,
      0,
    );

  if (
    Math.abs(
      totalDebit -
        totalCredit,
    ) > 0.01
  ) {
    throw new Error(
      `Expense journal is not balanced. Debit: ${totalDebit.toFixed(
        2,
      )}, Credit: ${totalCredit.toFixed(2)}`,
    );
  }

  // ----------------------------------------------------------
  // CREATE JOURNAL ENTRY
  // ----------------------------------------------------------

  await tx.journalEntry.create({
    data: {
      date: expense.date,

      reference:
        expense.reference,

      description:
        `Expense: ${expense.title} - ${expense.category}`,

      expenseId:
        expense.id,

      lines: {
        create:
          journalLines.map(
            (line) => ({
              accountId:
                line.accountId,

              paymentAccountId:
                line.paymentAccountId ?? null,

              debit:
                new Prisma.Decimal(
                  line.debit,
                ),

              credit:
                new Prisma.Decimal(
                  line.credit,
                ),
            }),
          ),
      },
    },
  });
}

// ============================================================
// GET ALL EXPENSES
// ============================================================

export const getExpenses =
  async () => {
    return getExpensesRepository();
  };

// ============================================================
// GET EXPENSE BY ID
// ============================================================

export const getExpenseById =
  async (
    id: number,
  ) => {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        "Invalid expense ID.",
      );
    }

    const expense =
      await getExpenseByIdRepository(
        id,
      );

    if (!expense) {
      throw new Error(
        "Expense not found.",
      );
    }

    return expense;
  };

// ============================================================
// CREATE EXPENSE
// ============================================================

export const createExpense =
  async (
    data: CreateExpenseInput,
  ) => {
    // --------------------------------------------------------
    // VALIDATE TITLE
    // --------------------------------------------------------

    const title =
      data.title?.trim();

    if (!title) {
      throw new Error(
        "Expense title is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE CATEGORY
    // --------------------------------------------------------

    const category =
      data.category?.trim();

    if (!category) {
      throw new Error(
        "Expense category is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------------

    if (
      !Number.isFinite(
        data.amount,
      ) ||
      data.amount <= 0
    ) {
      throw new Error(
        "Expense amount must be greater than 0.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE DATE
    // --------------------------------------------------------

    if (
      !(data.date instanceof Date) ||
      Number.isNaN(
        data.date.getTime(),
      )
    ) {
      throw new Error(
        "A valid expense date is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE PAYMENT METHOD
    // --------------------------------------------------------

    if (
      !isPaymentMethod(
        data.paymentMethod,
      )
    ) {
      throw new Error(
        "Invalid payment method.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE USER
    // --------------------------------------------------------

    if (
      !Number.isInteger(
        data.userId,
      ) ||
      data.userId <= 0
    ) {
      throw new Error(
        "Invalid user ID.",
      );
    }

    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    const user =
      await prisma.user.findUnique({
        where: {
          id: data.userId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!user) {
      throw new Error(
        "User not found.",
      );
    }

    if (!user.isActive) {
      throw new Error(
        "User account is inactive.",
      );
    }

    // --------------------------------------------------------
    // CLEAN DATA
    // --------------------------------------------------------

    const reference =
      data.reference?.trim() ||
      null;

    const notes =
      data.notes?.trim() ||
      null;

    // ========================================================
    // DATABASE TRANSACTION
    // ========================================================

    return prisma.$transaction(
      async (tx) => {
        const accountId =
          await validateActualPaymentAccount(
            tx,
            data.paymentMethod,
            data.accountId,
          );

        // ------------------------------------------------------
        // CREATE EXPENSE
        // ------------------------------------------------------

        const expense =
          await tx.expense.create({
            data: {
              title,

              category,

              amount:
                new Prisma.Decimal(
                  data.amount,
                ),

              date:
                data.date,

              paymentMethod:
                data.paymentMethod,

              accountId,

              reference,

              notes,

              userId:
                data.userId,
            },
          });

        // ------------------------------------------------------
        // CREATE ACCOUNTING JOURNAL
        // ------------------------------------------------------

        await createExpenseJournal(
          tx,
          expense,
        );

        // ------------------------------------------------------
        // REDUCE ACTUAL PAYMENT ACCOUNT BALANCE
        // ------------------------------------------------------

        await updateActualAccountBalance(
          tx,
          data.paymentMethod,
          accountId,
          expense.amount,
          "decrement",
        );

        // ------------------------------------------------------
        // RETURN EXPENSE
        // ------------------------------------------------------

        return tx.expense.findUnique({
          where: {
            id: expense.id,
          },

          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });
      },
    );
  };

// ============================================================
// UPDATE EXPENSE
// ============================================================

export const updateExpense =
  async (
    id: number,
    data: UpdateExpenseInput,
  ) => {
    // --------------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------------

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        "Invalid expense ID.",
      );
    }

    // --------------------------------------------------------
    // FIND EXISTING EXPENSE
    // --------------------------------------------------------

    const existingExpense =
      await getExpenseByIdRepository(
        id,
      );

    if (!existingExpense) {
      throw new Error(
        "Expense not found.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE TITLE
    // --------------------------------------------------------

    if (
      data.title !==
        undefined &&
      !data.title.trim()
    ) {
      throw new Error(
        "Expense title is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE CATEGORY
    // --------------------------------------------------------

    if (
      data.category !==
        undefined &&
      !data.category.trim()
    ) {
      throw new Error(
        "Expense category is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------------

    if (
      data.amount !==
        undefined &&
      (!Number.isFinite(
        data.amount,
      ) ||
        data.amount <= 0)
    ) {
      throw new Error(
        "Expense amount must be greater than 0.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE DATE
    // --------------------------------------------------------

    if (
      data.date !==
        undefined &&
      (!(data.date instanceof Date) ||
        Number.isNaN(
          data.date.getTime(),
        ))
    ) {
      throw new Error(
        "A valid expense date is required.",
      );
    }

    // --------------------------------------------------------
    // VALIDATE PAYMENT METHOD
    // --------------------------------------------------------

    if (
      data.paymentMethod !==
        undefined &&
      !isPaymentMethod(
        data.paymentMethod,
      )
    ) {
      throw new Error(
        "Invalid payment method.",
      );
    }

    // --------------------------------------------------------
    // PREPARE UPDATE DATA
    // --------------------------------------------------------

    const updateData:
      UpdateExpenseInput = {};

    if (
      data.title !==
      undefined
    ) {
      updateData.title =
        data.title.trim();
    }

    if (
      data.category !==
      undefined
    ) {
      updateData.category =
        data.category.trim();
    }

    if (
      data.amount !==
      undefined
    ) {
      updateData.amount =
        data.amount;
    }

    if (
      data.date !==
      undefined
    ) {
      updateData.date =
        data.date;
    }

    if (
      data.paymentMethod !==
      undefined
    ) {
      updateData.paymentMethod =
        data.paymentMethod;
    }

    if (
      data.accountId !==
      undefined
    ) {
      updateData.accountId =
        data.accountId === null
          ? null
          : data.accountId;
    }

    if (
      data.reference !==
      undefined
    ) {
      updateData.reference =
        data.reference?.trim() ||
        null;
    }

    if (
      data.notes !==
      undefined
    ) {
      updateData.notes =
        data.notes?.trim() ||
        null;
    }

    // ========================================================
    // DATABASE TRANSACTION
    // ========================================================

    return prisma.$transaction(
      async (tx) => {
        const paymentMethod =
          updateData.paymentMethod ??
          existingExpense.paymentMethod;

        if (
          !isPaymentMethod(
            paymentMethod,
          )
        ) {
          throw new Error(
            "Invalid payment method.",
          );
        }

        const requestedAccountId =
          updateData.accountId !==
          undefined
            ? updateData.accountId
            : paymentMethod === "CASH"
              ? null
              : existingExpense.accountId;

        const accountId =
          await validateActualPaymentAccount(
            tx,
            paymentMethod,
            requestedAccountId,
          );

        if (
          existingExpense.accountId !==
          undefined
        ) {
          await updateActualAccountBalance(
            tx,
            existingExpense.paymentMethod,
            existingExpense.accountId,
            existingExpense.amount,
            "increment",
          );
        }

        // ------------------------------------------------------
        // UPDATE EXPENSE
        // ------------------------------------------------------

        const updatedExpense =
          await tx.expense.update({
            where: {
              id,
            },

            data: {
              ...updateData,
              paymentMethod,
              accountId,
            },
          });

        // ------------------------------------------------------
        // DELETE OLD JOURNAL
        // ------------------------------------------------------

        await tx.journalEntry.deleteMany({
          where: {
            expenseId: id,
          },
        });

        // ------------------------------------------------------
        // CREATE NEW JOURNAL
        // ------------------------------------------------------

        await createExpenseJournal(
          tx,
          updatedExpense,
        );

        // ------------------------------------------------------
        // REDUCE NEW ACTUAL PAYMENT ACCOUNT BALANCE
        // ------------------------------------------------------

        await updateActualAccountBalance(
          tx,
          paymentMethod,
          accountId,
          updatedExpense.amount,
          "decrement",
        );

        // ------------------------------------------------------
        // RETURN UPDATED EXPENSE
        // ------------------------------------------------------

        return tx.expense.findUnique({
          where: {
            id,
          },

          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });
      },
    );
  };

// ============================================================
// DELETE EXPENSE
// ============================================================

export const deleteExpense =
  async (
    id: number,
  ) => {
    // --------------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------------

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        "Invalid expense ID.",
      );
    }

    // --------------------------------------------------------
    // FIND EXPENSE
    // --------------------------------------------------------

    const existingExpense =
      await getExpenseByIdRepository(
        id,
      );

    if (!existingExpense) {
      throw new Error(
        "Expense not found.",
      );
    }

    // ========================================================
    // DATABASE TRANSACTION
    // ========================================================

    return prisma.$transaction(
      async (tx) => {
        await updateActualAccountBalance(
          tx,
          existingExpense.paymentMethod,
          existingExpense.accountId,
          existingExpense.amount,
          "increment",
        );

        // ------------------------------------------------------
        // DELETE JOURNAL
        // ------------------------------------------------------

        await tx.journalEntry.deleteMany({
          where: {
            expenseId: id,
          },
        });

        // ------------------------------------------------------
        // DELETE EXPENSE
        // ------------------------------------------------------

        return tx.expense.delete({
          where: {
            id,
          },
        });
      },
    );
  };