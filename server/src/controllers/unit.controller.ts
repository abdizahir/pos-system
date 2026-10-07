import type { NextFunction, Request, Response } from "express";
import * as unitService from "../services/unit.service.js";

export async function getUnits(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const units = await unitService.getUnits();
    res.status(200).json(units);
  } catch (error) {
    next(error);
  }
}