import { Router } from "express";

import {
  createOpeningStock,
  createStock,
  deleteStock,
  getStock,
  getStocks,
  updateStock,
} from "../controllers/stock.controller.js";

const router = Router();

router.get("/", getStocks);

// IMPORTANT: this must come BEFORE /:id
router.post("/opening", createOpeningStock);

router.get("/:id", getStock);

router.post("/", createStock);

router.patch("/:id", updateStock);

router.delete("/:id", deleteStock);

export default router;