import { Router } from "express";
import {
  getBalanceSheetController,
} from "../controllers/balanceSheet.controller.js";

const router = Router();

// GET /api/balance-sheet?asOf=2026-09-21
router.get(
  "/",
  getBalanceSheetController,
);

export default router;