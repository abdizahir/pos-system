// server/src/controllers/stockAdjustment.controller.ts

import type { Request, Response } from "express";
import { adjustStock } from "../services/stockAdjustment.service.js";
import { ServiceError } from "../services/service-error.js";

// POST /api/stocks/adjust
// Body: { productId, countedQuantity, reason, notes? }
export async function adjustStockController(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. User information is missing." });
  }

  try {
    return res.status(201).json(await adjustStock(req.body, Number(userId)));
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Stock adjustment error:", error);
    return res.status(500).json({ message: "Failed to adjust stock." });
  }
}
