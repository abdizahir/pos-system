import { prisma } from "../db/prisma.js";

export type CreateExpenseInput = {
  title: string;
  category: string;
  amount: number;
  date: Date;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
  userId: number;
};

export type UpdateExpenseInput = {
  title?: string;
  category?: string;
  amount?: number;
  date?: Date;
  paymentMethod?: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
};

export const getExpenses = async () => {
  return prisma.expense.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

export const getExpenseById = async (id: number) => {
  return prisma.expense.findUnique({
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
};

export const createExpense = async (data: CreateExpenseInput) => {
  return prisma.expense.create({
    data: {
      title: data.title,
      category: data.category,
      amount: data.amount,
      date: data.date,
      paymentMethod: data.paymentMethod,
      accountId: data.accountId ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      userId: data.userId,
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
};

export const updateExpense = async (
  id: number,
  data: UpdateExpenseInput,
) => {
  return prisma.expense.update({
    where: {
      id,
    },
    data: {
      ...(data.title !== undefined && {
        title: data.title,
      }),

      ...(data.category !== undefined && {
        category: data.category,
      }),

      ...(data.amount !== undefined && {
        amount: data.amount,
      }),

      ...(data.date !== undefined && {
        date: data.date,
      }),

      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod,
      }),

      ...(data.accountId !== undefined && {
        accountId: data.accountId,
      }),

      ...(data.reference !== undefined && {
        reference: data.reference,
      }),

      ...(data.notes !== undefined && {
        notes: data.notes,
      }),
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
};

export const deleteExpense = async (id: number) => {
  return prisma.expense.delete({
    where: {
      id,
    },
  });
};