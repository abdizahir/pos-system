import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

// ============================================================
// TYPES
// ============================================================

type StockMovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT"
  | "RETURN";

type CreateStockMovementData = {
  productId: number;
  stockBatchId?: number | null;
  saleId?: number | null;
  userId?: number | null;
  type: StockMovementType;
  quantity: number;
  notes?: string | null;
};

// ============================================================
// CREATE STOCK MOVEMENT
// ============================================================

export async function create(
  data: CreateStockMovementData,
) {
  return prisma.stockMovement.create({
    data: {
      productId: data.productId,

      stockBatchId:
        data.stockBatchId ?? null,

      saleId:
        data.saleId ?? null,

      userId:
        data.userId ?? null,

      type: data.type,

      quantity: data.quantity,

      notes:
        data.notes ?? null,
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// CREATE STOCK MOVEMENT INSIDE TRANSACTION
// ============================================================

export async function createWithTransaction(
  tx: Prisma.TransactionClient,
  data: CreateStockMovementData,
) {
  return tx.stockMovement.create({
    data: {
      productId: data.productId,

      stockBatchId:
        data.stockBatchId ?? null,

      saleId:
        data.saleId ?? null,

      userId:
        data.userId ?? null,

      type: data.type,

      quantity: data.quantity,

      notes:
        data.notes ?? null,
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// PURCHASE MOVEMENT
// ============================================================

export async function createPurchaseMovement(
  data: {
    productId: number;
    stockBatchId: number;
    userId?: number | null;
    quantity: number;
    notes?: string | null;
  },
) {
  return create({
    productId: data.productId,

    stockBatchId:
      data.stockBatchId,

    userId:
      data.userId ?? null,

    type:
      "PURCHASE",

    quantity:
      Math.abs(data.quantity),

    notes:
      data.notes ?? null,
  });
}

// ============================================================
// SALE MOVEMENT
// ============================================================

export async function createSaleMovement(
  data: {
    productId: number;
    stockBatchId: number;
    saleId: number;
    userId?: number | null;
    quantity: number;
    notes?: string | null;
  },
) {
  return create({
    productId:
      data.productId,

    stockBatchId:
      data.stockBatchId,

    saleId:
      data.saleId,

    userId:
      data.userId ?? null,

    type:
      "SALE",

    quantity:
      -Math.abs(data.quantity),

    notes:
      data.notes ?? null,
  });
}

// ============================================================
// RETURN MOVEMENT
// ============================================================

export async function createReturnMovement(
  data: {
    productId: number;
    stockBatchId: number;
    saleId?: number | null;
    userId?: number | null;
    quantity: number;
    notes?: string | null;
  },
) {
  return create({
    productId:
      data.productId,

    stockBatchId:
      data.stockBatchId,

    saleId:
      data.saleId ?? null,

    userId:
      data.userId ?? null,

    type:
      "RETURN",

    quantity:
      Math.abs(data.quantity),

    notes:
      data.notes ?? null,
  });
}

// ============================================================
// ADJUSTMENT MOVEMENT
// ============================================================

export async function createAdjustmentMovement(
  data: {
    productId: number;
    stockBatchId?: number | null;
    userId?: number | null;
    quantity: number;
    notes?: string | null;
  },
) {
  return create({
    productId:
      data.productId,

    stockBatchId:
      data.stockBatchId ?? null,

    userId:
      data.userId ?? null,

    type:
      "ADJUSTMENT",

    quantity:
      data.quantity,

    notes:
      data.notes ?? null,
  });
}

// ============================================================
// FIND ALL MOVEMENTS
// ============================================================

export async function findAll() {
  return prisma.stockMovement.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: {
        include: {
          category: true,
          unit: true,
        },
      },

      stockBatch: true,

      sale: true,

      user: true,
    },
  });
}

// ============================================================
// FIND MOVEMENT BY ID
// ============================================================

export async function findById(
  id: number,
) {
  return prisma.stockMovement.findUnique({
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

      stockBatch: true,

      sale: true,

      user: true,
    },
  });
}

// ============================================================
// FIND BY PRODUCT
// ============================================================

export async function findByProductId(
  productId: number,
) {
  return prisma.stockMovement.findMany({
    where: {
      productId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// FIND BY STOCK BATCH
// ============================================================

export async function findByStockBatchId(
  stockBatchId: number,
) {
  return prisma.stockMovement.findMany({
    where: {
      stockBatchId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// FIND BY SALE
// ============================================================

export async function findBySaleId(
  saleId: number,
) {
  return prisma.stockMovement.findMany({
    where: {
      saleId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// FIND BY TYPE
// ============================================================

export async function findByType(
  type: StockMovementType,
) {
  return prisma.stockMovement.findMany({
    where: {
      type,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// FIND SALE MOVEMENTS
// ============================================================

export async function findSaleMovements(
  saleId: number,
) {
  return prisma.stockMovement.findMany({
    where: {
      saleId,
      type: "SALE",
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// FIND RETURN MOVEMENTS
// ============================================================

export async function findReturnMovements(
  saleId?: number,
) {
  return prisma.stockMovement.findMany({
    where: {
      type: "RETURN",

      ...(saleId !== undefined
        ? {
            saleId,
          }
        : {}),
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      product: true,
      stockBatch: true,
      sale: true,
      user: true,
    },
  });
}

// ============================================================
// DELETE MOVEMENT
// ============================================================

export async function remove(
  id: number,
) {
  return prisma.stockMovement.delete({
    where: {
      id,
    },
  });
}