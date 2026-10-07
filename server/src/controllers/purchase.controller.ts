import type { Request, Response } from "express";
import { purchaseService } from "../services/purchase.service.js";

// ============================================================
// GET ALL PURCHASES
// ============================================================

export const getPurchasesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const purchases = await purchaseService.getPurchases();

    return res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch purchases",
    });
  }
};

// ============================================================
// GET PURCHASE BY ID
// ============================================================

export const getPurchaseByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await purchaseService.getPurchaseById(id);

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Get purchase error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch purchase";

    if (message === "Purchase not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ============================================================
// CREATE PURCHASE
// ============================================================

export const createPurchaseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = Number((req as any).user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      supplierId,
      discount,
      tax,
      paidAmount,
      paymentMethod,
      accountId,
      notes,
      items,
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Supplier is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    let normalizedPaymentMethod:
      | "CASH"
      | "CARD"
      | "MOBILE"
      | "BANK"
      | undefined;

    if (
      paymentMethod !== undefined &&
      paymentMethod !== null &&
      paymentMethod !== ""
    ) {
      if (
        paymentMethod !== "CASH" &&
        paymentMethod !== "CARD" &&
        paymentMethod !== "MOBILE" &&
        paymentMethod !== "BANK"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }

      normalizedPaymentMethod = paymentMethod;
    }

    let normalizedAccountId:
      | number
      | null
      | undefined;

    if (
      accountId !== undefined &&
      accountId !== null &&
      accountId !== ""
    ) {
      const numericAccountId =
        Number(accountId);

      if (
        !Number.isInteger(
          numericAccountId,
        ) ||
        numericAccountId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      normalizedAccountId =
        numericAccountId;
    } else if (accountId !== undefined) {
      normalizedAccountId = null;
    }

    const purchase = await purchaseService.createPurchase({
      supplierId: Number(supplierId),
      userId,

      ...(discount !== undefined && {
        discount: Number(discount),
      }),

      ...(tax !== undefined && {
        tax: Number(tax),
      }),

      ...(paidAmount !== undefined && {
        paidAmount: Number(paidAmount),
      }),

      ...(normalizedPaymentMethod !== undefined && {
        paymentMethod:
          normalizedPaymentMethod,
      }),

      ...(normalizedAccountId !== undefined && {
        accountId:
          normalizedAccountId,
      }),

      ...(notes !== undefined && {
        notes,
      }),

      items: items.map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),

        ...(item.sellingPrice !== undefined &&
        item.sellingPrice !== null &&
        item.sellingPrice !== "" && {
          sellingPrice: Number(item.sellingPrice),
        }),

        ...(item.discount !== undefined &&
        item.discount !== null &&
        item.discount !== "" && {
          discount: Number(item.discount),
        }),

        ...(item.tax !== undefined &&
        item.tax !== null &&
        item.tax !== "" && {
          tax: Number(item.tax),
        }),

        ...(item.expiryDate !== undefined &&
        item.expiryDate !== null &&
        item.expiryDate !== "" && {
          expiryDate: item.expiryDate,
        }),
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: purchase,
    });
  } catch (error) {
    console.error("Create purchase error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create purchase";

    if (
      message.includes("Supplier not found") ||
      message.includes("User not found") ||
      message.includes("product") &&
        message.includes("not found")
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

// ============================================================
// PAY SUPPLIER
// ============================================================

export const paySupplierController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      supplierId,
      amount,
      paymentMethod,
      accountId,
    } = req.body;

    const numericSupplierId =
      Number(supplierId);
    const numericAmount =
      Number(amount);

    if (
      paymentMethod !== "CASH" &&
      paymentMethod !== "CARD" &&
      paymentMethod !== "MOBILE" &&
      paymentMethod !== "BANK"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    let normalizedAccountId:
      | number
      | null
      | undefined;

    if (
      accountId !== undefined &&
      accountId !== null &&
      accountId !== ""
    ) {
      const numericAccountId =
        Number(accountId);

      if (
        !Number.isInteger(
          numericAccountId,
        ) ||
        numericAccountId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      normalizedAccountId =
        numericAccountId;
    } else {
      normalizedAccountId = null;
    }

    const result =
      await purchaseService.paySupplier({
        supplierId:
          numericSupplierId,
        amount: numericAmount,
        paymentMethod,
        accountId:
          normalizedAccountId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Supplier payable paid successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Pay supplier error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to pay supplier";

    if (
      message === "Supplier not found" ||
      message === "Invalid supplier ID" ||
      message ===
        "This supplier has no outstanding payable balance" ||
      message ===
        "Invalid payment method" ||
      message ===
        "Payment amount must be greater than 0" ||
      message ===
        "Invalid account ID" ||
      message.includes(
        "Payment amount cannot exceed",
      ) ||
      message.includes(
        "requires a valid account",
      ) ||
      message.includes(
        "Selected account",
      ) ||
      message.includes(
        "must use a bank account",
      ) ||
      message.includes(
        "must use a wallet account",
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ============================================================
// UPDATE PURCHASE
// ============================================================

export const updatePurchaseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const {
      supplierId,
      discount,
      tax,
      paidAmount,
      paymentMethod,
      accountId,
      notes,
      items,
    } = req.body;

    let normalizedPaymentMethod:
      | "CASH"
      | "CARD"
      | "MOBILE"
      | "BANK"
      | null
      | undefined;

    if (paymentMethod !== undefined) {
      if (
        paymentMethod === null ||
        paymentMethod === ""
      ) {
        normalizedPaymentMethod = null;
      } else {
        if (
          paymentMethod !== "CASH" &&
          paymentMethod !== "CARD" &&
          paymentMethod !== "MOBILE" &&
          paymentMethod !== "BANK"
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid payment method",
          });
        }

        normalizedPaymentMethod =
          paymentMethod;
      }
    }

    let normalizedAccountId:
      | number
      | null
      | undefined;

    if (accountId !== undefined) {
      if (
        accountId === null ||
        accountId === ""
      ) {
        normalizedAccountId = null;
      } else {
        const numericAccountId =
          Number(accountId);

        if (
          !Number.isInteger(
            numericAccountId,
          ) ||
          numericAccountId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid account ID",
          });
        }

        normalizedAccountId =
          numericAccountId;
      }
    }

    const purchase = await purchaseService.updatePurchase(id, {
      ...(supplierId !== undefined &&
        supplierId !== null && {
          supplierId: Number(supplierId),
        }),

      ...(discount !== undefined &&
        discount !== null && {
          discount: Number(discount),
        }),

      ...(tax !== undefined &&
        tax !== null && {
          tax: Number(tax),
        }),

      ...(paidAmount !== undefined &&
        paidAmount !== null && {
          paidAmount: Number(paidAmount),
        }),

      ...(normalizedPaymentMethod !== undefined && {
        paymentMethod:
          normalizedPaymentMethod,
      }),

      ...(normalizedAccountId !== undefined && {
        accountId:
          normalizedAccountId,
      }),

      ...(notes !== undefined && {
        notes,
      }),

      ...(items !== undefined && {
        items: items.map((item: any) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice),

          ...(item.sellingPrice !== undefined &&
          item.sellingPrice !== null &&
          item.sellingPrice !== "" && {
            sellingPrice: Number(item.sellingPrice),
          }),

          ...(item.discount !== undefined &&
          item.discount !== null &&
          item.discount !== "" && {
            discount: Number(item.discount),
          }),

          ...(item.tax !== undefined &&
          item.tax !== null &&
          item.tax !== "" && {
            tax: Number(item.tax),
          }),

          ...(item.expiryDate !== undefined &&
          item.expiryDate !== null &&
          item.expiryDate !== "" && {
            expiryDate: item.expiryDate,
          }),
        })),
      }),
    });

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: purchase,
    });
  } catch (error) {
    console.error("Update purchase error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update purchase";

    if (message === "Purchase not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

// ============================================================
// CANCEL PURCHASE
// ============================================================

export const cancelPurchaseController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await purchaseService.cancelPurchase(id);

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully",
      data: purchase,
    });
  } catch (error) {
    console.error("Cancel purchase error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel purchase";

    if (message === "Purchase not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }
};
