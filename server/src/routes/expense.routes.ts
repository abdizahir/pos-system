import { Router } from "express";

import {
  createExpenseController,
  deleteExpenseController,
  getExpenseByIdController,
  getExpensesController,
  updateExpenseController,
} from "../controllers/expense.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// ============================================================
// EXPENSE ROUTES
// ============================================================

// GET /api/expenses
router.get("/", authenticate, getExpensesController);

// GET /api/expenses/:id
router.get("/:id", authenticate, getExpenseByIdController);

// POST /api/expenses
router.post("/", authenticate, createExpenseController);

// PUT /api/expenses/:id
router.put("/:id", authenticate, updateExpenseController);

// DELETE /api/expenses/:id
router.delete("/:id", authenticate, deleteExpenseController);

export default router;
