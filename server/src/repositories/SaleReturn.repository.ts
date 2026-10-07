import { Prisma } from "../../generated/prisma/client.js";

// ============================================================
// FIND SALE BY ID
// ============================================================

export async function findSaleById(
  tx: Prisma.TransactionClient,
  saleId: number,
) {
  return tx.sale.findUnique({
    where: {
      id: saleId,
    },

    include: {
      items: {
        include: {
          product: true,
          stockBatch: true,
        },
      },
    },
  });
}

// ============================================================
// CREATE SALE RETURN
// ============================================================

export async function createSaleReturn(
  tx: Prisma.TransactionClient,
  data: {
    saleId: number;
    reason: string;
    notes?: string;
    subtotal: number;
    tax: number;
    total: number;

    items: {
      saleItemId: number;
      productId: number;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
  },
) {
  return tx.saleReturn.create({
    data: {
      saleId: data.saleId,

      reason: data.reason,

      subtotal: new Prisma.Decimal(data.subtotal),

      tax: new Prisma.Decimal(data.tax),

      total: new Prisma.Decimal(data.total),

      ...(data.notes !== undefined
        ? {
            notes: data.notes,
          }
        : {}),

      items: {
        create: data.items.map((item) => ({
          saleItemId: item.saleItemId,

          productId: item.productId,

          quantity: item.quantity,

          unitPrice: new Prisma.Decimal(
            item.unitPrice,
          ),

          lineTotal: new Prisma.Decimal(
            item.lineTotal,
          ),
        })),
      },
    },

    include: {
      items: true,
    },
  });
}

// ============================================================
// UPDATE RETURNED QUANTITY
// ============================================================
//
// Increases the returned quantity on the original SaleItem.
//
// Example:
//
// Original quantity = 2
// Current returned  = 0
// Returning         = 1
//
// New returnedQuantity = 1
//
// ============================================================

export async function updateReturnedQuantity(
  tx: Prisma.TransactionClient,
  saleItemId: number,
  quantity: number,
) {
  if (
    !Number.isInteger(saleItemId) ||
    saleItemId <= 0
  ) {
    throw new Error(
      "Invalid sale item ID",
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Returned quantity must be a positive integer",
    );
  }

  return tx.saleItem.update({
    where: {
      id: saleItemId,
    },

    data: {
      returnedQuantity: {
        increment: quantity,
      },
    },
  });
}

// ============================================================
// INCREASE STOCK BATCH
// ============================================================
//
// Adds returned quantity back to the same stock batch
// from which the product was originally sold.
//
// ============================================================

export async function increaseStockBatch(
  tx: Prisma.TransactionClient,
  stockBatchId: number,
  quantity: number,
) {
  if (
    !Number.isInteger(stockBatchId) ||
    stockBatchId <= 0
  ) {
    throw new Error(
      "Invalid stock batch ID",
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Stock quantity must be a positive integer",
    );
  }

  return tx.stockBatch.update({
    where: {
      id: stockBatchId,
    },

    data: {
      quantity: {
        increment: quantity,
      },
    },
  });
}

// ============================================================
// UPDATE PRODUCT STOCK CACHE
// ============================================================
//
// Product.stockQuantity is a cached total.
//
// It is recalculated from all StockBatch records.
//
// Example:
//
// Batch A = 10
// Batch B = 20
//
// Product.stockQuantity = 30
//
// ============================================================

export async function updateProductStockCache(
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

  const totalQuantity =
    result._sum.quantity ?? 0;

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
// CREATE RETURN STOCK MOVEMENT
// ============================================================
//
// RETURN movement:
//
// quantity = POSITIVE
//
// saleId links the movement back to the original sale.
//
// ============================================================

export async function createStockMovement(
  tx: Prisma.TransactionClient,
  data: {
    productId: number;
    stockBatchId: number;
    saleId?: number | null;
    quantity: number;
    userId?: number | null;
    notes?: string | null;
  },
) {
  if (
    !Number.isInteger(data.productId) ||
    data.productId <= 0
  ) {
    throw new Error(
      "Invalid product ID",
    );
  }

  if (
    !Number.isInteger(data.stockBatchId) ||
    data.stockBatchId <= 0
  ) {
    throw new Error(
      "Invalid stock batch ID",
    );
  }

  if (
    !Number.isInteger(data.quantity) ||
    data.quantity <= 0
  ) {
    throw new Error(
      "Return movement quantity must be a positive integer",
    );
  }

  return tx.stockMovement.create({
    data: {
      productId: data.productId,

      stockBatchId: data.stockBatchId,

      saleId: data.saleId ?? null,

      userId: data.userId ?? null,

      type: "RETURN",

      quantity: Math.abs(data.quantity),

      notes: data.notes ?? null,
    },
  });
}

// ============================================================
// UPDATE SALE STATUS
// ============================================================

export async function updateSaleStatus(
  tx: Prisma.TransactionClient,
  saleId: number,
  status: "RETURNED",
) {
  return tx.sale.update({
    where: {
      id: saleId,
    },

    data: {
      status,
    },
  });
}

// ============================================================
// FIND SALE ITEMS
// ============================================================

export async function findSaleItems(
  tx: Prisma.TransactionClient,
  saleId: number,
) {
  return tx.saleItem.findMany({
    where: {
      saleId,
    },

    include: {
      product: true,
      stockBatch: true,
      returnItems: true,
    },
  });
}

// ============================================================
// FIND STOCK BATCH
// ============================================================
//
// Optional productId check makes sure the batch belongs to
// the same product as the SaleItem.
//
// ============================================================

export async function findStockBatch(
  tx: Prisma.TransactionClient,
  stockBatchId: number,
  productId?: number,
) {
  return tx.stockBatch.findFirst({
    where: {
      id: stockBatchId,

      ...(productId !== undefined
        ? {
            productId,
          }
        : {}),
    },
  });
}