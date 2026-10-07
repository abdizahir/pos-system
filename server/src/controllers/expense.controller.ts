import type { Request, Response } from "express";

import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  updateExpense,
} from "../services/expense.service.js";

// ============================================================
// GET ALL EXPENSES
// GET /api/expenses
// ============================================================

export const getExpensesController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const expenses = await getExpenses();

    return res.status(200).json(expenses);
  } catch (error: unknown) {
    console.error("Failed to get expenses:", error);

    return res.status(500).json({
      message: "Failed to get expenses.",
    });
  }
};

// ============================================================
// GET EXPENSE BY ID
// GET /api/expenses/:id
// ============================================================

export const getExpenseByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    const expense = await getExpenseById(id);

    return res.status(200).json(expense);
  } catch (error: unknown) {
    console.error("Failed to get expense:", error);

    if (error instanceof Error && error.message === "Expense not found.") {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === "Invalid expense ID.") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to get expense.",
    });
  }
};

// ============================================================
// CREATE EXPENSE
// POST /api/expenses
// ============================================================

export const createExpenseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      title,
      category,
      amount,
      date,
      paymentMethod,
      accountId,
      reference,
      notes,
    } = req.body;

    // ----------------------------------------------------------
    // USER ID
    // ----------------------------------------------------------

    const user = req.user;

    if (!user?.id) {
      return res.status(401).json({
        message: "Unauthorized. User information is missing.",
      });
    }

    // ----------------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------------

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Expense title is required.",
      });
    }

    if (typeof category !== "string" || !category.trim()) {
      return res.status(400).json({
        message: "Expense category is required.",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Expense amount must be greater than 0.",
      });
    }

    if (typeof date !== "string" || !date.trim()) {
      return res.status(400).json({
        message: "Expense date is required.",
      });
    }

    const expenseDate = new Date(date);

    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid expense date.",
      });
    }

    if (
      paymentMethod !== "CASH" &&
      paymentMethod !== "CARD" &&
      paymentMethod !== "MOBILE" &&
      paymentMethod !== "BANK"
    ) {
      return res.status(400).json({
        message: "Invalid payment method.",
      });
    }

    let normalizedAccountId: number | null | undefined;

    if (accountId !== undefined && accountId !== null && accountId !== "") {
      const numericAccountId = Number(accountId);

      if (!Number.isInteger(numericAccountId) || numericAccountId <= 0) {
        return res.status(400).json({
          message: "Invalid account ID.",
        });
      }

      normalizedAccountId = numericAccountId;
    } else {
      normalizedAccountId = null;
    }

    // ----------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------

    const expense = await createExpense({
      title: title.trim(),
      category: category.trim(),
      amount: numericAmount,
      date: expenseDate,
      paymentMethod,
      accountId: normalizedAccountId,
      reference:
        typeof reference === "string" && reference.trim()
          ? reference.trim()
          : null,
      notes:
        typeof notes === "string" && notes.trim()
          ? notes.trim()
          : null,
      userId: Number(user.id),
    });

    return res.status(201).json(expense);
  } catch (error: unknown) {
    console.error("Failed to create expense:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create expense.",
    });
  }
};

// ============================================================
// UPDATE EXPENSE
// PUT /api/expenses/:id
// ============================================================

export const updateExpenseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    const {
      title,
      category,
      amount,
      date,
      paymentMethod,
      accountId,
      reference,
      notes,
    } = req.body;

    // ----------------------------------------------------------
    // BUILD UPDATE DATA
    // ----------------------------------------------------------

    const updateData: {
      title?: string;
      category?: string;
      amount?: number;
      date?: Date;
      paymentMethod?: "CASH" | "CARD" | "MOBILE" | "BANK";
      accountId?: number | null;
      reference?: string | null;
      notes?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Expense title cannot be empty.",
        });
      }

      updateData.title = title.trim();
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          message: "Expense category cannot be empty.",
        });
      }

      updateData.category = category.trim();
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          message: "Expense amount must be greater than 0.",
        });
      }

      updateData.amount = numericAmount;
    }

    if (date !== undefined) {
      if (typeof date !== "string" || !date.trim()) {
        return res.status(400).json({
          message: "Expense date cannot be empty.",
        });
      }

      const expenseDate = new Date(date);

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({
          message: "Invalid expense date.",
        });
      }

      updateData.date = expenseDate;
    }

    if (paymentMethod !== undefined) {
      if (
        paymentMethod !== "CASH" &&
        paymentMethod !== "CARD" &&
        paymentMethod !== "MOBILE" &&
        paymentMethod !== "BANK"
      ) {
        return res.status(400).json({
          message: "Invalid payment method.",
        });
      }

      updateData.paymentMethod = paymentMethod;
    }

    if (accountId !== undefined) {
      if (accountId === null || accountId === "") {
        updateData.accountId = null;
      } else {
        const numericAccountId = Number(accountId);

        if (!Number.isInteger(numericAccountId) || numericAccountId <= 0) {
          return res.status(400).json({
            message: "Invalid account ID.",
          });
        }

        updateData.accountId = numericAccountId;
      }
    }

    if (reference !== undefined) {
      updateData.reference =
        typeof reference === "string" && reference.trim()
          ? reference.trim()
          : null;
    }

    if (notes !== undefined) {
      updateData.notes =
        typeof notes === "string" && notes.trim()
          ? notes.trim()
          : null;
    }

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------

    const expense = await updateExpense(id, updateData);

    return res.status(200).json(expense);
  } catch (error: unknown) {
    console.error("Failed to update expense:", error);

    if (error instanceof Error) {
      if (error.message === "Expense not found.") {
        return res.status(404).json({
          message: error.message,
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update expense.",
    });
  }
};

// ============================================================
// DELETE EXPENSE
// DELETE /api/expenses/:id
// ============================================================

export const deleteExpenseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    await deleteExpense(id);

    return res.status(200).json({
      message: "Expense deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Failed to delete expense:", error);

    if (error instanceof Error) {
      if (error.message === "Expense not found.") {
        return res.status(404).json({
          message: error.message,
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to delete expense.",
    });
  }
};