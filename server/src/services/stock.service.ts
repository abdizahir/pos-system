import * as stockRepository from "../repositories/stock.repository.js";

export const DIRECT_STOCK_CREATION_DISABLED_MESSAGE =
  "Direct stock creation is disabled because it bypasses accounting. Use the opening stock flow or create a purchase instead.";

// ============================================================
// GET ALL STOCK BATCHES
// ============================================================

export async function getStocks() {
  return stockRepository.findAll();
}

// ============================================================
// GET ONE STOCK BATCH
// ============================================================

export async function getStock(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid stock batch ID.");
  }

  const stockBatch = await stockRepository.findById(id);

  if (!stockBatch) {
    throw new Error("Stock batch not found.");
  }

  return stockBatch;
}

// ============================================================
// CREATE NORMAL STOCK
// ============================================================

export async function createStock(
  _data: unknown,
  userId?: number | null,
) {
  void userId;

  throw new Error(
    DIRECT_STOCK_CREATION_DISABLED_MESSAGE,
  );
}

// ============================================================
// CREATE OPENING STOCK
// ============================================================

export async function createOpeningStock(
  data: unknown,
  userId?: number | null,
) {
  // ----------------------------------------------------------
  // Validate request
  // ----------------------------------------------------------

  if (!data || typeof data !== "object" || !("items" in data)) {
    throw new Error("Opening stock items are required.");
  }

  const items = (data as { items: unknown }).items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      "At least one opening stock item is required.",
    );
  }

  // ----------------------------------------------------------
  // Validate each item
  // ----------------------------------------------------------

  const validatedItems = items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(
        `Invalid opening stock item at row ${index + 1}.`,
      );
    }

    const row = item as {
      productId?: unknown;
      quantity?: unknown;
      purchasePrice?: unknown;
      expiryDate?: unknown;
    };

    const productId = Number(row.productId);
    const quantity = Number(row.quantity);
    const purchasePrice = Number(row.purchasePrice);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(
        `Invalid product at row ${index + 1}.`,
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Quantity must be greater than zero at row ${
          index + 1
        }.`,
      );
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      throw new Error(
        `Invalid purchase price at row ${index + 1}.`,
      );
    }

    let expiryDate: Date | null = null;

    if (
      row.expiryDate !== undefined &&
      row.expiryDate !== null &&
      row.expiryDate !== ""
    ) {
      expiryDate = new Date(
        `${String(row.expiryDate)}T00:00:00`,
      );

      if (Number.isNaN(expiryDate.getTime())) {
        throw new Error(
          `Invalid expiry date at row ${index + 1}.`,
        );
      }
    }

    return {
      productId,
      quantity,
      purchasePrice,
      expiryDate,
    };
  });

  // ----------------------------------------------------------
  // Prevent duplicate products
  // ----------------------------------------------------------

  const productIds = validatedItems.map(
    (item) => item.productId,
  );

  if (new Set(productIds).size !== productIds.length) {
    throw new Error(
      "The same product cannot be added more than once.",
    );
  }

  // ----------------------------------------------------------
  // Calculate opening inventory value
  // ----------------------------------------------------------

  const totalValue = validatedItems.reduce(
    (total, item) =>
      total + item.quantity * item.purchasePrice,
    0,
  );

  // ----------------------------------------------------------
  // Delegate to repository
  // ----------------------------------------------------------

  const result =
    await stockRepository.createOpeningStock(
      validatedItems,
      userId,
    );

  return {
    message: "Opening stock created successfully.",
    totalValue,
    data: result,
  };
}