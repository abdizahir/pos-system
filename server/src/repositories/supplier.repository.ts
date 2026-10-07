import { prisma } from "../db/prisma.js";

// ============================================================
// GET ALL SUPPLIERS
// ============================================================

export async function findAll() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          purchases: true,
          stockBatches: true,
        },
      },

      // Get unpaid purchase amounts for this supplier
      purchases: {
        where: {
          status: {
            not: "CANCELLED",
          },
          dueAmount: {
            gt: 0,
          },
        },
        select: {
          dueAmount: true,
        },
      },
    },
  });

  return suppliers.map((supplier) => ({
    ...supplier,

    // Total amount still owed to this supplier
    dueAmount: supplier.purchases.reduce(
      (sum, purchase) => sum + Number(purchase.dueAmount),
      0
    ),

    // Do not return the purchase list from the supplier list endpoint
    purchases: undefined,
  }));
}

// ============================================================
// GET SUPPLIER BY ID
// ============================================================

export async function findById(id: number) {
  return prisma.supplier.findUnique({
    where: {
      id,
    },
    include: {
      purchases: {
        orderBy: {
          createdAt: "desc",
        },
      },
      stockBatches: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

// ============================================================
// GET SUPPLIER BY NAME
// ============================================================

export async function findByName(name: string) {
  return prisma.supplier.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });
}

// ============================================================
// GET SUPPLIER BY EMAIL
// ============================================================

export async function findByEmail(email: string) {
  return prisma.supplier.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });
}

// ============================================================
// CREATE SUPPLIER
// ============================================================

export async function create(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return prisma.supplier.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    },
  });
}

// ============================================================
// UPDATE SUPPLIER
// ============================================================

export async function update(
  id: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }
) {
  return prisma.supplier.update({
    where: {
      id,
    },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.email !== undefined && {
        email: data.email || null,
      }),

      ...(data.phone !== undefined && {
        phone: data.phone || null,
      }),

      ...(data.address !== undefined && {
        address: data.address || null,
      }),
    },
  });
}

// ============================================================
// DELETE SUPPLIER
// ============================================================

export async function remove(id: number) {
  return prisma.supplier.delete({
    where: {
      id,
    },
  });
}