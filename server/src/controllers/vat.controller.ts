// server/src/controllers/vat.controller.ts

import type { Request, Response } from "express";
import { getVatStatement } from "../services/vat.service.js";

// GET /api/reports/vat?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getVatController(req: Request, res: Response) {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from : null;
    const toRaw = typeof req.query.to === "string" ? req.query.to : null;

    if (!fromRaw || !toRaw) {
      return res.status(400).json({ message: "from and to are required" });
    }

    // Local start / end of day
    const from = new Date(`${fromRaw}T00:00:00.000`);
    const to = new Date(`${toRaw}T23:59:59.999`);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res
        .status(400)
        .json({ message: "from and to must be valid dates" });
    }

    if (from.getTime() > to.getTime()) {
      return res
        .status(400)
        .json({ message: "from must be before or equal to to" });
    }

    return res.status(200).json(await getVatStatement(from, to));
  } catch (error) {
    console.error("VAT report error:", error);

    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to build VAT report",
    });
  }
}
