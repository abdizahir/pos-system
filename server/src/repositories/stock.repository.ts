import { prisma } from "../db/prisma.js";

import { Prisma } from "../../generated/prisma/client.js";

// ============================================================
// FIND ALL CURRENT STOCK BATCHES
// ============================================================

export async function findAll() {
  return prisma.stockBatch.findMany({
    orderBy: {
      updatedAt: "desc",
    },

    include: {
      product: {
        include: {
          category: true,
          unit: true,
        },
      },

      user: true,

      stockMovements: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

// ============================================================
// FIND ONE STOCK BATCH
// ============================================================

export async function findById(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid stock batch ID.");
  }

  return prisma.stockBatch.findUnique({
    where: {
      id,
    },

    include: {
      product: {
        include: {
          category: true,
          unit: true,
        },
      },

      user: true,

      stockMovements: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

// ============================================================
// CREATE STOCK BATCH
// ============================================================
//
// Creates:
// 1. StockBatch
// 2. PURCHASE movement
// 3. Updates Product.stockQuantity
//
// Everything is atomic.
// ============================================================

export async function create(data: {
  productId: number;
  userId?: number | null;
  quantity: number;
  purchasePrice: number;
  expiryDate?: Date | null;
  notes?: string | null;
}) {
  // ----------------------------------------------------------
  // Validate
  // ----------------------------------------------------------

  if (!Number.isInteger(data.productId) || data.productId <= 0) {
    throw new Error("Invalid product ID.");
  }

  if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
    throw new Error("Stock quantity must be greater than zero.");
  }

  if (!Number.isFinite(data.purchasePrice) || data.purchasePrice < 0) {
    throw new Error("Invalid purchase price.");
  }

  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Check product
    // --------------------------------------------------------

    const product = await tx.product.findUnique({
      where: {
        id: data.productId,
      },

      select: {
        id: true,
      },
    });

    if (!product) {
      throw new Error("Product not found.");
    }

    // --------------------------------------------------------
    // Create batch
    // --------------------------------------------------------

    const stockBatch = await tx.stockBatch.create({
      data: {
        productId: data.productId,

        userId: data.userId ?? null,

        quantity: data.quantity,

        purchasePrice: data.purchasePrice,

        expiryDate: data.expiryDate ?? null,
      },
    });

    // --------------------------------------------------------
    // Update product stock cache
    // --------------------------------------------------------

    await updateProductStockCache(tx, data.productId);

    // --------------------------------------------------------
    // Create PURCHASE movement
    // --------------------------------------------------------

    await tx.stockMovement.create({
      data: {
        productId: data.productId,

        stockBatchId: stockBatch.id,

        userId: data.userId ?? null,

        type: "PURCHASE",

        quantity: data.quantity,

        notes: data.notes?.trim() || null,
      },
    });

    return stockBatch;
  });
}

// ============================================================
// UPDATE STOCK BATCH
// ============================================================
//
// Updates:
// - quantity
// - purchasePrice
// - expiryDate
//
// If quantity changes:
// - Product stock cache is recalculated
// - ADJUSTMENT movement is created
// ============================================================

export async function update(
  id: number,
  data: {
    quantity: number;
    purchasePrice?: number;
    expiryDate?: Date | null;
    userId?: number | null;
    notes?: string | null;
  },
) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid stock batch ID.");
  }

  if (!Number.isInteger(data.quantity) || data.quantity < 0) {
    throw new Error("Stock quantity cannot be negative.");
  }

  if (
    data.purchasePrice !== undefined &&
    (!Number.isFinite(data.purchasePrice) || data.purchasePrice < 0)
  ) {
    throw new Error("Invalid purchase price.");
  }

  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Find existing batch
    // --------------------------------------------------------

    const existingBatch = await tx.stockBatch.findUnique({
      where: {
        id,
      },
    });

    if (!existingBatch) {
      throw new Error("Stock batch not found.");
    }

    // --------------------------------------------------------
    // Calculate quantity difference
    // --------------------------------------------------------

    const quantityDifference = data.quantity - existingBatch.quantity;

    // --------------------------------------------------------
    // Update batch
    // --------------------------------------------------------

    const stockBatch = await tx.stockBatch.update({
      where: {
        id,
      },

      data: {
        quantity: data.quantity,

        ...(data.purchasePrice !== undefined
          ? {
              purchasePrice: data.purchasePrice,
            }
          : {}),

        ...(data.expiryDate !== undefined
          ? {
              expiryDate: data.expiryDate,
            }
          : {}),
      },

      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },

        user: true,
      },
    });

    // --------------------------------------------------------
    // Quantity changed
    // --------------------------------------------------------

    if (quantityDifference !== 0) {
      // Recalculate product stock cache.
      await updateProductStockCache(tx, existingBatch.productId);

      // ------------------------------------------------------
      // Create ADJUSTMENT movement
      // ------------------------------------------------------

      await tx.stockMovement.create({
        data: {
          productId: existingBatch.productId,

          stockBatchId: existingBatch.id,

          userId: data.userId ?? null,

          type: "ADJUSTMENT",

          quantity: quantityDifference,

          notes: data.notes?.trim() || `Stock adjustment for batch ${id}`,
        },
      });
    }

    return stockBatch;
  });
}

// ============================================================
// REMOVE STOCK BATCH
// ============================================================
//
// A StockBatch may already be referenced by SaleItem.
//
// Therefore we MUST NOT delete a batch that has been
// used in a sale.
// ============================================================

export async function remove(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid stock batch ID.");
  }

  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Find batch
    // --------------------------------------------------------

    const stockBatch = await tx.stockBatch.findUnique({
      where: {
        id,
      },
    });

    if (!stockBatch) {
      throw new Error("Stock batch not found.");
    }

    // --------------------------------------------------------
    // Check whether batch was used in a sale
    // --------------------------------------------------------

    const saleItemCount = await tx.saleItem.count({
      where: {
        stockBatchId: id,
      },
    });

    if (saleItemCount > 0) {
      throw new Error(
        "This stock batch has already been used in a sale and cannot be deleted.",
      );
    }

    // --------------------------------------------------------
    // Delete stock movements
    // --------------------------------------------------------

    await tx.stockMovement.deleteMany({
      where: {
        stockBatchId: id,
      },
    });

    // --------------------------------------------------------
    // Delete batch
    // --------------------------------------------------------

    await tx.stockBatch.delete({
      where: {
        id,
      },
    });

    // --------------------------------------------------------
    // Recalculate product stock
    // --------------------------------------------------------

    await updateProductStockCache(tx, stockBatch.productId);

    return {
      success: true,
      message: "Stock batch deleted successfully.",
    };
  });
}

// ============================================================
// RECALCULATE PRODUCT STOCK CACHE
// ============================================================
//
// StockBatch.quantity = REAL STOCK
//
// Product.stockQuantity = CACHE
//
// Therefore:
//
// Product.stockQuantity
//       =
// SUM(all StockBatch.quantity)
// ============================================================

async function updateProductStockCache(
  tx: Prisma.TransactionClient,
  productId: number,
) {
  const result = await tx.stockBatch.aggregate({
    where: {
      productId,
    },

    _sum: {
      quantity: true,
    },
  });

  const totalQuantity = result._sum.quantity ?? 0;

  return tx.product.update({
    where: {
      id: productId,
    },

    data: {
      stockQuantity: totalQuantity,
    },
  });
}

// ============================================================
// CREATE OPENING STOCK
// ============================================================

export async function createOpeningStock(
  items: {
    productId: number;
    quantity: number;
    purchasePrice: number;
    expiryDate?: Date | null;
  }[],
  userId?: number | null,
) {
  return prisma.$transaction(async (tx) => {
    const createdBatches = [];

    // ----------------------------------------------------------
    // Calculate total opening inventory value
    // ----------------------------------------------------------

    const totalValue = items.reduce(
      (total, item) => total + item.quantity * item.purchasePrice,
      0,
    );

    // ----------------------------------------------------------
    // Find Inventory account
    // Code: 1100
    // ----------------------------------------------------------

    const inventoryAccount = await tx.chartAccount.findUnique({
      where: {
        code: "1100",
      },
    });

    if (!inventoryAccount) {
      throw new Error("Chart account 1100 (Inventory) was not found.");
    }

    if (!inventoryAccount.isActive) {
      throw new Error("Chart account 1100 (Inventory) is inactive.");
    }

    // ----------------------------------------------------------
    // Find Owner's Capital account
    // Code: 3000
    // ----------------------------------------------------------

    const ownersCapitalAccount = await tx.chartAccount.findUnique({
      where: {
        code: "3000",
      },
    });

    if (!ownersCapitalAccount) {
      throw new Error("Chart account 3000 (Owner's Capital) was not found.");
    }

    if (!ownersCapitalAccount.isActive) {
      throw new Error("Chart account 3000 (Owner's Capital) is inactive.");
    }

    // ----------------------------------------------------------
    // Create stock batches
    // ----------------------------------------------------------

    for (const item of items) {
      // --------------------------------------------------------
      // Check product exists
      // --------------------------------------------------------

      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      // --------------------------------------------------------
      // Create stock batch
      // --------------------------------------------------------

      const stockBatch = await tx.stockBatch.create({
        data: {
          productId: item.productId,

          userId: userId ?? null,

          supplierId: null,

          purchaseId: null,

          quantity: item.quantity,

          purchasePrice: item.purchasePrice,

          expiryDate: item.expiryDate ?? null,
        },
      });

      // --------------------------------------------------------
      // Update product stock cache
      // --------------------------------------------------------

      await updateProductStockCache(tx, item.productId);

      // --------------------------------------------------------
      // Create OPENING stock movement
      // --------------------------------------------------------

      await tx.stockMovement.create({
        data: {
          productId: item.productId,

          stockBatchId: stockBatch.id,

          userId: userId ?? null,

          type: "OPENING",

          quantity: item.quantity,

          notes: "Opening stock",
        },
      });

      createdBatches.push(stockBatch);
    }

    // ----------------------------------------------------------
    // Create accounting journal entry
    //
    // Dr Inventory
    // Cr Owner's Capital
    // ----------------------------------------------------------

    const journalEntry = await tx.journalEntry.create({
      data: {
        date: new Date(),

        reference: `OPENING-${Date.now()}`,

        description: "Opening stock",

        lines: {
          create: [
            {
              accountId: inventoryAccount.id,

              debit: totalValue,

              credit: 0,
            },
            {
              accountId: ownersCapitalAccount.id,

              debit: 0,

              credit: totalValue,
            },
          ],
        },
      },

      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    // ----------------------------------------------------------
    // Return everything created
    // ----------------------------------------------------------

    return {
      batches: createdBatches,

      journalEntry,
    };
  });
}
