import { Router } from "express";

import {
  createOpeningStock,
  createStock,
  deleteStock,
  getStock,
  getStocks,
  updateStock,
} from "../controllers/stock.controller.js";
import { writeOffExpiredController } from "../controllers/stockWriteOff.controller.js";
import { adjustStockController } from "../controllers/stockAdjustment.controller.js";

const router = Router();

router.get("/", getStocks);

// IMPORTANT: these must come BEFORE /:id
router.post("/opening", createOpeningStock);
router.post("/write-off-expired", writeOffExpiredController);
router.post("/adjust", adjustStockController);

router.get("/:id", getStock);

router.post("/", createStock);

router.patch("/:id", updateStock);

router.delete("/:id", deleteStock);

export default router;