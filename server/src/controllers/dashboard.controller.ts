// server/src/controllers/dashboard.controller.ts

import type { Request, Response } from "express";
import { getDashboard } from "../services/dashboard.service.js";
import { clientMessage } from "../utils/clientMessage.js";

export async function getDashboardController(
  req: Request,
  res: Response,
) {
  try {
    const dateRaw =
      typeof req.query.date === "string" ? req.query.date : null;

    if (!dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return res
        .status(400)
        .json({ message: "date is required in YYYY-MM-DD format" });
    }

    // Snap to the full local day, same as the other reports.
    const [year = 0, month = 0, day = 0] = dateRaw.split("-").map(Number);
    const from = new Date(year, month - 1, day, 0, 0, 0, 0);
    const to = new Date(year, month - 1, day, 23, 59, 59, 999);

    if (isNaN(from.getTime()) || from.getDate() !== day) {
      return res
        .status(400)
        .json({ message: "date must be a valid calendar date" });
    }

    const result = await getDashboard(from, to);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Dashboard error:", error);

    const message =
      clientMessage(error, "Failed to build dashboard");

    return res.status(500).json({ message });
  }
}
