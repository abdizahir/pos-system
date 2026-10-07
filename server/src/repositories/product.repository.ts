import { prisma } from "../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

// ============================================================
// GET ALL PRODUCTS
// ============================================================

export async function findAll() {
  return prisma.product.findMany({
    include: {
      category: true,
      unit: true,

      stockBatches: {
        orderBy: {
          expiryDate: "asc",
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

// ============================================================
// GET ONE PRODUCT
// ============================================================

export async function findById(id: number) {
  return prisma.product.findUnique({
    where: {
      id,
    },

    include: {
      category: true,
      unit: true,

      stockBatches: {
        orderBy: {
          expiryDate: "asc",
        },
      },
    },
  });
}

// ============================================================
// CREATE PRODUCT
// ============================================================

export async function create(
  data: Prisma.ProductCreateInput,
) {
  return prisma.product.create({
    data,

    include: {
      category: true,
      unit: true,
      stockBatches: true,
    },
  });
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function update(
  id: number,
  data: Prisma.ProductUpdateInput,
) {
  return prisma.product.update({
    where: {
      id,
    },

    data,

    include: {
      category: true,
      unit: true,

      stockBatches: {
        orderBy: {
          expiryDate: "asc",
        },
      },
    },
  });
}

// ============================================================
// DELETE PRODUCT
// ============================================================
//
// IMPORTANT:
// A product can be referenced by:
// - StockBatch
// - StockMovement
// - SaleItem
// - SaleReturnItem
//
// Because your Prisma schema does NOT use onDelete: Cascade
// on these Product relations, deleting a product that already
// has related records can fail with a foreign-key constraint.
//
// Therefore we check first and give a clear error.
// ============================================================

export async function remove(id: number) {
  const product =
    await prisma.product.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            stockBatches: true,
            stockMovements: true,
            saleItems: true,
            returnItems: true,
          },
        },
      },
    });

  if (!product) {
    throw new Error(
      "Product not found.",
    );
  }

  const {
    stockBatches,
    stockMovements,
    saleItems,
    returnItems,
  } = product._count;

  if (
    stockBatches > 0 ||
    stockMovements > 0 ||
    saleItems > 0 ||
    returnItems > 0
  ) {
    throw new Error(
      "This product cannot be deleted because it has inventory or sales history.",
    );
  }

  return prisma.product.delete({
    where: {
      id,
    },
  });
}