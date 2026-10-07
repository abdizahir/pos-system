import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as saleReturnService from "../services/SaleReturn.service.js";

// ============================================================
// CREATE SALE RETURN
// ============================================================

// ============================================================
// GET ALL SALE RETURNS
// ============================================================

export async function getSaleReturns(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result =
      await saleReturnService.getSaleReturns();

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET ONE SALE RETURN
// ============================================================

export async function getSaleReturn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message: "Invalid return ID",
      });
    }

    const result =
      await saleReturnService.getSaleReturnById(
        id,
      );

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSaleReturn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // ==========================================================
    // 1. VALIDATE SALE ID
    // ==========================================================

    const saleId = Number(req.params.id);

    if (
      !Number.isInteger(saleId) ||
      saleId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid sale ID",
      });
    }

    // ==========================================================
    // 2. READ BODY
    // ==========================================================

    const {
      reason,
      notes,
      refundMethod,
      accountId,
      items,
    } = req.body;

    // ==========================================================
    // 3. VALIDATE REASON
    // ==========================================================

    if (
      typeof reason !== "string" ||
      reason.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Return reason is required",
      });
    }

    // ==========================================================
    // 4. VALIDATE NOTES
    // ==========================================================

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        message: "Notes must be a string",
      });
    }

    // ==========================================================
    // 5. VALIDATE REFUND METHOD
    // ==========================================================

    const validRefundMethods = [
      "CASH",
      "BANK",
      "CARD",
      "MOBILE",
    ];

    if (
      refundMethod !== undefined &&
      refundMethod !== null &&
      !validRefundMethods.includes(refundMethod)
    ) {
      return res.status(400).json({
        message: "Invalid refund method",
      });
    }

    // ==========================================================
    // 6. VALIDATE ACCOUNT ID
    // ==========================================================

    if (
      accountId !== undefined &&
      accountId !== null &&
      (
        !Number.isInteger(accountId) ||
        accountId <= 0
      )
    ) {
      return res.status(400).json({
        message: "Invalid account ID",
      });
    }

    // ==========================================================
    // 7. VALIDATE ITEMS ARRAY
    // ==========================================================

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "At least one return item is required",
      });
    }

    // ==========================================================
    // 8. VALIDATE EACH ITEM
    // ==========================================================

    for (const item of items) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return res.status(400).json({
          message: "Invalid return item",
        });
      }

      // --------------------------------------------------------
      // saleItemId
      // --------------------------------------------------------

      if (
        !Number.isInteger(item.saleItemId) ||
        item.saleItemId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid sale item ID",
        });
      }

      // --------------------------------------------------------
      // productId
      // --------------------------------------------------------

      if (
        !Number.isInteger(item.productId) ||
        item.productId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      // --------------------------------------------------------
      // quantity
      // --------------------------------------------------------

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Return quantity must be a positive integer",
        });
      }
    }

    // ==========================================================
    // 9. CALL SERVICE
    // ==========================================================

    const result =
      await saleReturnService.createSaleReturn({
        saleId,

        reason: reason.trim(),

        ...(notes !== undefined &&
        notes !== null
          ? {
              notes: notes.trim(),
            }
          : {}),

        ...(refundMethod !== undefined &&
        refundMethod !== null
          ? {
              refundMethod,
            }
          : {}),

        ...(accountId !== undefined &&
        accountId !== null
          ? {
              accountId,
            }
          : {}),

        items: items.map(
          (item: {
            saleItemId: number;
            productId: number;
            quantity: number;
          }) => ({
            saleItemId: item.saleItemId,
            productId: item.productId,
            quantity: item.quantity,
          }),
        ),
      });

    // ==========================================================
    // 10. RESPONSE
    // ==========================================================

    return res.status(201).json({
      message:
        "Sale return created successfully",

      data: result,
    });
  } catch (error) {
    next(error);
  }
}
