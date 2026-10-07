import {
  createProductSchema,
  updateProductSchema,
} from "../validators/validator.js";

import * as productRepository from "../repositories/product.repository.js";

import { Prisma } from "../../generated/prisma/client.js";

// ============================================================
// GET ALL PRODUCTS
// ============================================================

export async function getProducts() {
  return productRepository.findAll();
}

// ============================================================
// GET ONE PRODUCT
// ============================================================

export async function getProduct(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid product ID.");
  }

  return productRepository.findById(id);
}

// ============================================================
// CREATE PRODUCT
// ============================================================

export async function createProduct(data: unknown) {
  const validatedData = createProductSchema.parse(data);

  const {
    categoryId,
    unitId,
    barcode,
    sellingPrice,
    ...productData
  } = validatedData;

  // Selling price is set from the purchase form.
  const createData: Prisma.ProductCreateInput = {
    ...productData,

    sellingPrice: sellingPrice ?? 0,

    barcode: barcode ?? null,

    category: {
      connect: {
        id: categoryId,
      },
    },

    unit: {
      connect: {
        id: unitId,
      },
    },
  };

  return productRepository.create(createData);
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function updateProduct(
  id: number,
  data: unknown,
) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid product ID.");
  }

  const validatedData = updateProductSchema.parse(data);

  const updateData: Prisma.ProductUpdateInput = {};

  if (validatedData.productName !== undefined) {
    updateData.productName =
      validatedData.productName;
  }

  if (validatedData.barcode !== undefined) {
    updateData.barcode =
      validatedData.barcode;
  }

  if (validatedData.sellingPrice !== undefined) {
    updateData.sellingPrice =
      validatedData.sellingPrice;
  }

  if (validatedData.lowStockLimit !== undefined) {
    updateData.lowStockLimit =
      validatedData.lowStockLimit;
  }

  if (validatedData.vat !== undefined) {
    updateData.vat =
      validatedData.vat;
  }

  if (validatedData.categoryId !== undefined) {
    updateData.category = {
      connect: {
        id: validatedData.categoryId,
      },
    };
  }

  if (validatedData.unitId !== undefined) {
    updateData.unit = {
      connect: {
        id: validatedData.unitId,
      },
    };
  }

  return productRepository.update(
    id,
    updateData,
  );
}

// ============================================================
// DELETE PRODUCT
// ============================================================

export async function deleteProduct(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid product ID.");
  }

  return productRepository.remove(id);
}