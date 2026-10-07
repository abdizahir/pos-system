// server/src/controllers/profitInsights.controller.ts

import type { Request, Response } from "express";
import { getProfitInsights } from "../services/profitInsights.service.js";

// GET /api/reports/profit-insights?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getProfitInsightsController(req: Request, res: Response) {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
      return res.status(400).json({ message: "from and to must be dates like 2026-10-01" });
    }

    const from = new Date(`${fromRaw}T00:00:00.000`);
    const to = new Date(`${toRaw}T23:59:59.999`);

    if (from > to) {
      return res.status(400).json({ message: "from must be before or equal to to" });
    }

    return res.status(200).json(await getProfitInsights(from, to));
  } catch (error) {
    console.error("Profit insights error:", error);
    return res.status(500).json({ message: "Failed to build profit insights" });
  }
}
