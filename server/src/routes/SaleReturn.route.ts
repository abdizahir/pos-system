import { Router } from "express";

import {
  createSaleReturn,
  getSaleReturns,
  getSaleReturn,
} from "../controllers/SaleReturn.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

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

router.post("/:id", authenticate, createSaleReturn);

export default router;
