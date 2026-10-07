import { Router } from "express";

import {
  createIncomeController,
  deleteIncomeController,
  getIncomeByIdController,
  getIncomesController,
  updateIncomeController,
} from "../controllers/income.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// ============================================================
// INCOME ROUTES
// ============================================================

// GET /api/incomes
router.get("/", authenticate, getIncomesController);

// GET /api/incomes/:id
router.get("/:id", authenticate, getIncomeByIdController);

// POST /api/incomes
router.post("/", authenticate, createIncomeController);

// PUT /api/incomes/:id
router.put("/:id", authenticate, updateIncomeController);

// DELETE /api/incomes/:id
router.delete("/:id", authenticate, deleteIncomeController);

export default router;
