import { Router } from "express";

import {
  cancelSale,
  createSale,
  getSale,
  getSales,
  getSalesSummary,
  addSalePayment
} from "../controllers/sale.controller.js";
import { getOverdueSales } from "../controllers/overdueSales.controller.js";

import { authenticate, requireManagement } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createSale);

router.get("/", authenticate, getSales);

// Before "/:id"
router.get("/summary", authenticate, getSalesSummary);
router.get("/overdue", authenticate, requireManagement, getOverdueSales);

router.post("/:id/payments", authenticate, addSalePayment);

router.get("/:id", authenticate, getSale);

router.patch("/:id/cancel", authenticate, cancelSale);


export default router;
