// server/src/controllers/closeOut.controller.ts

import type { Request, Response } from "express";
import {
  CLOSE_OUT_PERIODS,
  getCloseOut,
  getPeriodRange,
  type CloseOutPeriod,
} from "../services/closeOut.service.js";
import { clientMessage } from "../utils/clientMessage.js";

// A local calendar date from YYYY-MM-DD, or null when invalid
function parseDay(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return isNaN(date.getTime()) || date.getDate() !== day ? null : date;
}

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
        .json({ message: "period must be day, week, month, year or custom" });
    }

    // Custom range: from / to dates, both days included
    if (periodRaw === "custom") {
      const from = parseDay(req.query.from);
      const to = parseDay(req.query.to);

      if (!from || !to) {
        return res
          .status(400)
          .json({ message: "from and to are required in YYYY-MM-DD format" });
      }

      if (from > to) {
        return res
          .status(400)
          .json({ message: "The start date must be on or before the end date" });
      }

      to.setHours(23, 59, 59, 999);

      const result = await getCloseOut("custom", from, to);

      return res.status(200).json(result);
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

    const period = periodRaw as Exclude<CloseOutPeriod, "custom">;
    const { from, to } = getPeriodRange(period, date);

    const result = await getCloseOut(period, from, to);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Close-out error:", error);

    const message =
      clientMessage(error, "Failed to build close-out report");

    return res.status(500).json({ message });
  }
}
