import { prisma } from "../db/prisma.js";

export const purchaseRepository = {
  // ============================================================
  // GET ALL PURCHASES
  // ============================================================

  async findAll() {
    return prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        supplier: true,

        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },

        items: {
          include: {
            product: true,
            stockBatch: true,
          },
        },

        stockBatches: {
          include: {
            product: true,
            supplier: true,
          },
        },
      },
    });
  },

  // ============================================================
  // GET PURCHASE BY ID
  // ============================================================

  async findById(id: number) {
    return prisma.purchase.findUnique({
      where: {
        id,
      },

      include: {
        supplier: true,

        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },

        items: {
          include: {
            product: true,
            stockBatch: true,
          },
        },

        stockBatches: {
          include: {
            product: true,
            supplier: true,
          },
        },
      },
    });
  },

  // ============================================================
  // FIND PURCHASE BY REFERENCE
  // ============================================================

  async findByReference(reference: string) {
    return prisma.purchase.findUnique({
      where: {
        reference,
      },

      include: {
        supplier: true,

        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },

        items: {
          include: {
            product: true,
            stockBatch: true,
          },
        },

        stockBatches: {
          include: {
            product: true,
            supplier: true,
          },
        },
      },
    });
  },

  // ============================================================
  // DELETE PURCHASE
  // ============================================================

  async delete(id: number) {
    return prisma.purchase.delete({
      where: {
        id,
      },
    });
  },
};