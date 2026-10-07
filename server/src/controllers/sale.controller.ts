import type { Request, Response } from "express";
import * as saleService from "../services/sale.service.js";

// ============================================================
// CREATE SALE
// POST /api/sales
// ============================================================

export async function createSale(
  req: Request,
  res: Response,
) {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Unauthorized. User information is missing.",
      });
    }

    // The cashier is whoever is logged in, never the request body
    const sale =
      await saleService.createSale({
        ...req.body,
        userId,
      });

    return res.status(201).json(sale);
  } catch (error) {
    console.error(
      "Create sale error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create sale";

    return res.status(400).json({
      message,
    });
  }
}

// ============================================================
// GET ALL SALES
// GET /api/sales
// ============================================================

// GET /api/sales/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getSalesSummary(
  req: Request,
  res: Response,
) {
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const fromRaw = String(req.query.from ?? "");
  const toRaw = String(req.query.to ?? "");

  if (!day.test(fromRaw) || !day.test(toRaw)) {
    return res.status(400).json({ message: "from and to must be dates like 2026-10-01" });
  }

  try {
    const sales = await saleService.getSalesSummary(
      new Date(`${fromRaw}T00:00:00.000`),
      new Date(`${toRaw}T23:59:59.999`),
    );
    return res.status(200).json(sales);
  } catch (error) {
    console.error("Get sales summary error:", error);
    return res.status(500).json({ message: "Failed to get sales" });
  }
}

export async function getSales(
  _req: Request,
  res: Response,
) {
  try {
    const sales =
      await saleService.findAll();

    return res.status(200).json(
      sales,
    );
  } catch (error) {
    console.error(
      "Get sales error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get sales";

    return res.status(500).json({
      message,
    });
  }
}

// ============================================================
// GET SALE BY ID
// GET /api/sales/:id
// ============================================================

export async function getSale(
  req: Request,
  res: Response,
) {
  try {
    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message: "Invalid sale ID",
      });
    }

    const sale =
      await saleService.findById(
        id,
      );

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    return res.status(200).json(
      sale,
    );
  } catch (error) {
    console.error(
      "Get sale error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get sale";

    return res.status(500).json({
      message,
    });
  }
}

// ============================================================
// ADD PAYMENT
// POST /api/sales/:id/payments
// ============================================================

export async function addSalePayment(
  req: Request,
  res: Response,
) {
  try {
    const saleId =
      Number(req.params.id);

    if (
      !Number.isInteger(saleId) ||
      saleId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid sale ID",
      });
    }

    const {
      amount,
      method,
      reference,
      accountId,
    } = req.body;

    // ========================================================
    // VALIDATE AMOUNT
    // ========================================================

    if (
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        message:
          "Payment amount is required",
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        message:
          "Payment amount must be greater than zero",
      });
    }

    // ========================================================
    // VALIDATE METHOD
    // ========================================================

    if (!method) {
      return res.status(400).json({
        message:
          "Payment method is required",
      });
    }

    const validMethods = [
      "CASH",
      "CARD",
      "MOBILE",
      "BANK",
    ] as const;

    if (
      !validMethods.includes(
        method,
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid payment method",
      });
    }

    // ========================================================
    // NORMALIZE ACCOUNT ID
    // ========================================================

    let numericAccountId:
      | number
      | null = null;

    if (
      accountId !== undefined &&
      accountId !== null &&
      accountId !== ""
    ) {
      numericAccountId =
        Number(accountId);

      if (
        !Number.isInteger(
          numericAccountId,
        ) ||
        numericAccountId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid account ID",
        });
      }
    }

    // ========================================================
    // ADD PAYMENT
    // ========================================================

    const sale =
      await saleService.addSalePayment(
        saleId,
        {
          amount:
            numericAmount,

          method,

          reference:
            reference ?? null,

          accountId:
            numericAccountId,
        },
      );

    return res.status(200).json(
      sale,
    );
  } catch (error) {
    console.error(
      "Add sale payment error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to add payment";

    return res.status(400).json({
      message,
    });
  }
}

// ============================================================
// CANCEL SALE
// PATCH /api/sales/:id/cancel
// ============================================================

export async function cancelSale(
  req: Request,
  res: Response,
) {
  try {
    const saleId =
      Number(req.params.id);

    if (
      !Number.isInteger(saleId) ||
      saleId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid sale ID",
      });
    }

    const sale =
      await saleService.cancelSale(
        saleId,
      );

    return res.status(200).json({
      message:
        "Sale cancelled successfully",

      sale,
    });
  } catch (error) {
    console.error(
      "Cancel sale error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel sale";

    // ========================================================
    // SALE NOT FOUND
    // ========================================================

    if (
      message ===
      "Sale not found"
    ) {
      return res.status(404).json({
        message,
      });
    }

    // ========================================================
    // OTHER SALE ERRORS
    // ========================================================

    return res.status(400).json({
      message,
    });
  }
}