import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as trialBalanceService from "../services/trial-balance.service.js";

export async function getTrialBalance(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const asOf =
      typeof req.query.asOf === "string"
        ? req.query.asOf
        : undefined;

    if (!asOf) {
      return res.status(400).json({
        message: "asOf date is required",
      });
    }

    const result =
      await trialBalanceService.getTrialBalance(asOf);

    return res.status(200).json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("asOf must")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
}