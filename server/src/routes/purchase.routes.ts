import { Router } from "express";

import {
  getPurchasesController,
  getPurchaseByIdController,
  createPurchaseController,
  updatePurchaseController,
  cancelPurchaseController,
} from "../controllers/purchase.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// ============================================================
// PURCHASE ROUTES
// ============================================================

// GET /api/purchases
router.get(
  "/",
  authenticate,
  getPurchasesController,
);

// GET /api/purchases/:id
router.get(
  "/:id",
  authenticate,
  getPurchaseByIdController,
);

// POST /api/purchases
router.post(
  "/",
  authenticate,
  createPurchaseController,
);

// PATCH /api/purchases/:id
router.patch(
  "/:id",
  authenticate,
  updatePurchaseController,
);

// PATCH /api/purchases/:id/cancel
router.patch(
  "/:id/cancel",
  authenticate,
  cancelPurchaseController,
);

export default router;
