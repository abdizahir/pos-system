import { prisma } from "../db/prisma.js";
import * as customerRepo from "../repositories/customer.repository.js";

// ============================================================
// ERROR
// ============================================================

export class ServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ============================================================
// GET ALL
// ============================================================

export async function getAll() {
  return customerRepo.findAll();
}

// ============================================================
// GET BY ID
// ============================================================

export async function getById(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("Invalid customer ID.", 400);
  }

  const customer = await customerRepo.findById(id);
  if (!customer) {
    throw new ServiceError("Customer not found.", 404);
  }

  return customer;
}

// ============================================================
// CREATE
// ============================================================

export async function create(input: {
  fname?: string;
  lname?: string;
  phone?: string;
  address?: string;
}) {
  const fname = input?.fname?.trim() ?? "";
  const lname = input?.lname?.trim() ?? "";
  const phone = input?.phone?.trim() ?? "";
  const address = input?.address?.trim() ?? "";

  if (!fname) {
    throw new ServiceError("First name is required.", 400);
  }
  if (!lname) {
    throw new ServiceError("Last name is required.", 400);
  }
  if (!phone) {
    throw new ServiceError("Phone number is required.", 400);
  }

  const existing = await customerRepo.findByPhone(phone);
  if (existing) {
    throw new ServiceError(
      "A customer with this phone already exists.",
      409,
    );
  }

  return customerRepo.create({
    fname,
    lname,
    phone,
    address,
  });
}

// ============================================================
// UPDATE
// ============================================================

export async function update(
  id: number,
  input: {
    fname?: string;
    lname?: string;
    phone?: string;
    address?: string;
  },
) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("Invalid customer ID.", 400);
  }

  const existing = await customerRepo.findById(id);
  if (!existing) {
    throw new ServiceError("Customer not found.", 404);
  }

  const fname = input?.fname?.trim();
  const lname = input?.lname?.trim();
  const phone = input?.phone?.trim();
  const address = input?.address?.trim();

  if (fname !== undefined && !fname) {
    throw new ServiceError("First name is required.", 400);
  }
  if (lname !== undefined && !lname) {
    throw new ServiceError("Last name is required.", 400);
  }
  if (phone !== undefined && !phone) {
    throw new ServiceError("Phone number is required.", 400);
  }

  if (phone !== undefined) {
    const duplicate = await customerRepo.findByPhone(phone);
    if (duplicate && duplicate.id !== id) {
      throw new ServiceError(
        "A customer with this phone already exists.",
        409,
      );
    }
  }

  return customerRepo.update(id, {
    ...(fname !== undefined && { fname }),
    ...(lname !== undefined && { lname }),
    ...(phone !== undefined && { phone }),
    ...(address !== undefined && { address }),
  });
}

// ============================================================
// DELETE
// ============================================================

export async function remove(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("Invalid customer ID.", 400);
  }

  const existing = await customerRepo.findById(id);
  if (!existing) {
    throw new ServiceError("Customer not found.", 404);
  }

  // Deleting would unlink their sales (and any amount they still owe)
  const salesCount = await prisma.sale.count({ where: { customerId: id } });
  if (salesCount > 0) {
    throw new ServiceError(
      `This customer has ${salesCount} sale${salesCount === 1 ? "" : "s"} and cannot be deleted.`,
      409,
    );
  }

  await customerRepo.remove(id);
}