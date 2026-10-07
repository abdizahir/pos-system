// server/src/controllers/cashFlow.controller.ts

import type { Request, Response } from "express";
import { getCashFlow } from "../services/cashFlow.service.js";

export async function getCashFlowController(
  req: Request,
  res: Response,
) {
  try {
    const fromRaw =
      typeof req.query.from === "string" ? req.query.from : null;

    const toRaw =
      typeof req.query.to === "string" ? req.query.to : null;

    if (!fromRaw || !toRaw) {
      return res
        .status(400)
        .json({ message: "from and to are required" });
    }

    const from = new Date(fromRaw);
    const to = new Date(toRaw);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res
        .status(400)
        .json({ message: "from and to must be valid dates" });
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (from.getTime() > to.getTime()) {
      return res
        .status(400)
        .json({ message: "from must be before or equal to to" });
    }

    const result = await getCashFlow(from, to);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Cash flow error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to build cash flow";

    return res.status(500).json({ message });
  }
}