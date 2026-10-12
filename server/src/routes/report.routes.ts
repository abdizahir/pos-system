import { Router } from "express";
import { getProfitLossController } from "../controllers/profitLoss.controller.js";
import { getVatController } from "../controllers/vat.controller.js";
import { getProfitInsightsController } from "../controllers/profitInsights.controller.js";
import { getCloseOutController } from "../controllers/closeOut.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/profit-loss", authenticate, getProfitLossController);
router.get("/vat", authenticate, getVatController);
router.get("/profit-insights", authenticate, getProfitInsightsController);
router.get("/close-out", authenticate, getCloseOutController);

export default router;
