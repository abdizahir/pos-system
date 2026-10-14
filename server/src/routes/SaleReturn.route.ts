import { Router } from "express";

import {
  createSaleReturn,
  getSaleReturns,
  getSaleReturn,
} from "../controllers/SaleReturn.controller.js";
import { authenticate, requireManagement } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/sale-returns
router.get(
  "/",
  authenticate,
  getSaleReturns,
);

// GET /api/sale-returns/:id
router.get(
  "/:id",
  authenticate,
  getSaleReturn,
);

// Returns pay money back, so only the manager can do them
router.post("/:id", authenticate, requireManagement, createSaleReturn);

export default router;
