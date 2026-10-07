// server/src/controllers/closeOut.controller.ts

import type { Request, Response } from "express";
import {
  CLOSE_OUT_PERIODS,
  getCloseOut,
  getPeriodRange,
  type CloseOutPeriod,
} from "../services/closeOut.service.js";

export async function getCloseOutController(
  req: Request,
  res: Response,
) {
  try {
    const periodRaw =
      typeof req.query.period === "string" ? req.query.period : "day";

    const dateRaw =
      typeof req.query.date === "string" ? req.query.date : null;

    if (!CLOSE_OUT_PERIODS.includes(periodRaw as CloseOutPeriod)) {
      return res
        .status(400)
        .json({ message: "period must be day, week, month or year" });
    }

    if (!dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return res
        .status(400)
        .json({ message: "date is required in YYYY-MM-DD format" });
    }

    // Local calendar date, same as the dashboard
    const [year = 0, month = 0, day = 0] = dateRaw.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime()) || date.getDate() !== day) {
      return res
        .status(400)
        .json({ message: "date must be a valid calendar date" });
    }

    const period = periodRaw as CloseOutPeriod;
    const { from, to } = getPeriodRange(period, date);

    const result = await getCloseOut(period, from, to);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Close-out error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to build close-out report";

    return res.status(500).json({ message });
  }
}
