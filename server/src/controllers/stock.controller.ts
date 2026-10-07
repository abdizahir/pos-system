import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as stockService from "../services/stock.service.js";

// ============================================================
// GET ALL STOCK
// ============================================================

export async function getStocks(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stocks =
      await stockService.getStocks();

    res.status(200).json(stocks);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET ONE STOCK
// ============================================================

export async function getStock(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stockId =
      Number(req.params.id);

    if (
      !Number.isInteger(stockId) ||
      stockId <= 0
    ) {
      res.status(400).json({
        message: "Invalid stock ID",
      });
      return;
    }

    const stock =
      await stockService.getStock(
        stockId,
      );

    if (!stock) {
      res.status(404).json({
        message: "Stock not found",
      });
      return;
    }

    res.status(200).json(stock);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CREATE STOCK
// ============================================================

export async function createStock(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stock =
      await stockService.createStock(
        req.body,
      );

    res.status(201).json(stock);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        stockService.DIRECT_STOCK_CREATION_DISABLED_MESSAGE
    ) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    next(error);
  }
}

// ============================================================
// CREATE OPENING STOCK
// ============================================================

export async function createOpeningStock(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result =
      await stockService.createOpeningStock(
        req.body,
      );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// UPDATE STOCK
// ============================================================

export async function updateStock(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stockId =
      Number(req.params.id);

    if (
      !Number.isInteger(stockId) ||
      stockId <= 0
    ) {
      res.status(400).json({
        message: "Invalid stock ID",
      });
      return;
    }

    const stock =
      await stockService.updateStock(
        stockId,
        req.body,
      );

    res.status(200).json(stock);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// DELETE STOCK
// ============================================================

export async function deleteStock(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stockId =
      Number(req.params.id);

    if (
      !Number.isInteger(stockId) ||
      stockId <= 0
    ) {
      res.status(400).json({
        message: "Invalid stock ID",
      });
      return;
    }

    const result =
      await stockService.deleteStock(
        stockId,
      );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}