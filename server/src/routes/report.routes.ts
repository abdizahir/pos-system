import { Router } from "express";
import { getBalanceSheetController } from "../controllers/balanceSheet.controller.js";
import { getProfitLossController } from "../controllers/profitLoss.controller.js";
import {
  createVatPaymentController,
  getVatController,
  listVatPaymentsController,
  undoVatPaymentController,
  vatPayableController,
} from "../controllers/vat.controller.js";
import { getProfitInsightsController } from "../controllers/profitInsights.controller.js";
import { getCloseOutController } from "../controllers/closeOut.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/balance-sheet", authenticate, getBalanceSheetController);
router.get("/profit-loss", authenticate, getProfitLossController);
router.get("/vat", authenticate, getVatController);
router.get("/vat/payable", authenticate, vatPayableController);
router.get("/vat/payments", authenticate, listVatPaymentsController);
router.post("/vat/payments", authenticate, createVatPaymentController);
router.delete("/vat/payments/:id", authenticate, undoVatPaymentController);
router.get("/profit-insights", authenticate, getProfitInsightsController);
router.get("/close-out", authenticate, getCloseOutController);

export default router;
