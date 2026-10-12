// server/src/controllers/stockWriteOff.controller.ts

import type { Request, Response } from "express";
import { writeOffExpiredStock } from "../services/stockWriteOff.service.js";
import { ServiceError } from "../services/service-error.js";

// POST /api/stocks/write-off-expired
// Body: { batchIds?: number[] } — leave out to write off every expired batch
export async function writeOffExpiredController(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. User information is missing." });
  }

  const rawIds = (req.body as { batchIds?: unknown } | undefined)?.batchIds;
  if (rawIds !== undefined && !Array.isArray(rawIds)) {
    return res.status(400).json({ message: "batchIds must be a list of batch IDs." });
  }

  try {
    const result = await writeOffExpiredStock(
      Number(userId),
      rawIds === undefined ? undefined : rawIds.map(Number),
    );
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Write-off error:", error);
    return res.status(500).json({ message: "Failed to write off expired stock." });
  }
}
