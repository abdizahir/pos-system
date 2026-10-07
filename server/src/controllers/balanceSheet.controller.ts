import type { Request, Response } from "express";
import { getBalanceSheet } from "../services/balanceSheet.service.js";
import { parseAsOfDate } from "../utils/report-date.js";

export async function getBalanceSheetController(
  req: Request,
  res: Response,
) {
  try {
    const asOf = parseAsOfDate(req.query.asOf);

    const balanceSheet =
      await getBalanceSheet(asOf);

    return res.status(200).json(balanceSheet);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build balance sheet";

    const status = message.startsWith("asOf must")
      ? 400
      : 500;

    return res
      .status(status)
      .json({ message });
  }
}