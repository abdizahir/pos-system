import { prisma } from "../db/prisma.js";

// ============================================================
// GET ALL CUSTOMERS
// ============================================================

export async function findAll() {
  const customers = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sales: {
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

  return customers.map((customer) => ({
    id: customer.id,
    fname: customer.fname,
    lname: customer.lname,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,

    dueAmount: customer.sales.reduce(
      (sum, sale) => sum + Number(sale.dueAmount),
      0,
    ),
  }));
}

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

export async function findById(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
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

  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    fname: customer.fname,
    lname: customer.lname,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,

    dueAmount: customer.sales.reduce(
      (sum, sale) => sum + Number(sale.dueAmount),
      0,
    ),
  };
}

// ============================================================
// GET CUSTOMER BY PHONE
// ============================================================

export async function findByPhone(phone: string) {
  return prisma.customer.findFirst({
    where: {
      phone: {
        equals: phone,
        mode: "insensitive",
      },
    },
  });
}

// ============================================================
// CREATE CUSTOMER
// ============================================================

export async function create(data: {
  fname: string;
  lname: string;
  phone: string;
  address?: string;
}) {
  return prisma.customer.create({
    data: {
      fname: data.fname,
      lname: data.lname,
      phone: data.phone,
      address: data.address || null,
    },
  });
}

// ============================================================
// UPDATE CUSTOMER
// ============================================================

export async function update(
  id: number,
  data: {
    fname?: string;
    lname?: string;
    phone?: string;
    address?: string;
  },
) {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.fname !== undefined && { fname: data.fname }),
      ...(data.lname !== undefined && { lname: data.lname }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && {
        address: data.address || null,
      }),
    },
  });
}

// ============================================================
// DELETE CUSTOMER
// ============================================================

export async function remove(id: number) {
  return prisma.customer.delete({
    where: { id },
  });
}