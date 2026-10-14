import {
  createProductSchema,
  importProductRowSchema,
  importProductsSchema,
  updateProductSchema,
} from "../validators/validator.js";

import * as productRepository from "../repositories/product.repository.js";

import { addOpeningStock } from "../repositories/stock.repository.js";

import { prisma } from "../db/prisma.js";

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

export async function createProduct(
  data: unknown,
  userId?: number | null,
) {
  const validatedData = createProductSchema.parse(data);

  const {
    categoryId,
    unitId,
    barcode,
    sellingPrice,
    purchasePrice,
    initialQuantity,
    ...productData
  } = validatedData;

  const quantity = initialQuantity ?? 0;

  if (quantity > 0 && purchasePrice === undefined) {
    throw new Error(
      "Enter the purchase price for the initial quantity.",
    );
  }

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

  if (quantity <= 0) {
    return productRepository.create(createData);
  }

  // The product and its first stock are saved together, or not at all
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: createData,
    });

    await addOpeningStock(
      tx,
      [
        {
          productId: product.id,
          quantity,
          purchasePrice: purchasePrice ?? 0,
        },
      ],
      userId,
    );

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        category: true,
        unit: true,
        stockBatches: true,
      },
    });
  });
}

// ============================================================
// IMPORT PRODUCTS
// ============================================================
//
// Each row is saved on its own, so one bad row does not stop the
// rest. Rows whose barcode or name already exists are skipped.
// Missing categories and units are created. A quantity becomes
// opening stock at the row's purchase price.
// ============================================================

export async function importProducts(
  data: unknown,
  userId?: number | null,
) {
  const { rows } = importProductsSchema.parse(data);

  const existing = await prisma.product.findMany({
    select: { productName: true, barcode: true },
  });

  const names = new Set(
    existing.map((p) => p.productName.trim().toLowerCase()),
  );

  const barcodes = new Set(
    existing.flatMap((p) => (p.barcode ? [p.barcode] : [])),
  );

  const categoryIds = new Map<string, number>();
  const unitIds = new Map<string, number>();

  for (const c of await prisma.category.findMany()) {
    categoryIds.set(c.name.trim().toLowerCase(), c.id);
  }

  for (const u of await prisma.unit.findMany()) {
    unitIds.set(u.name.trim().toLowerCase(), u.id);
  }

  let created = 0;
  const skipped: { row: number; name: string; reason: string }[] = [];

  for (const [index, raw] of rows.entries()) {
    // The file's line number when the client sends one; otherwise
    // assume row 1 is the header line
    const sentRow =
      raw && typeof raw === "object" && "row" in raw
        ? Number(raw.row)
        : NaN;
    const rowNumber = Number.isInteger(sentRow) ? sentRow : index + 2;

    const parsed = importProductRowSchema.safeParse(raw);

    if (!parsed.success) {
      const name =
        raw && typeof raw === "object" && "productName" in raw
          ? String((raw as { productName: unknown }).productName ?? "")
          : "";

      skipped.push({
        row: rowNumber,
        name,
        reason: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const row = parsed.data;
    const nameKey = row.productName.toLowerCase();
    const barcode = row.barcode || null;
    const quantity = row.quantity ?? 0;

    if (barcode && barcodes.has(barcode)) {
      skipped.push({ row: rowNumber, name: row.productName, reason: "Barcode already exists" });
      continue;
    }

    if (names.has(nameKey)) {
      skipped.push({ row: rowNumber, name: row.productName, reason: "Product already exists" });
      continue;
    }

    if (quantity > 0 && row.purchasePrice === undefined) {
      skipped.push({ row: rowNumber, name: row.productName, reason: "Quantity needs a purchase price" });
      continue;
    }

    const categoryKey = row.category.toLowerCase();
    const unitKey = row.unit.toLowerCase();

    try {
      const saved = await prisma.$transaction(async (tx) => {
        const categoryId =
          categoryIds.get(categoryKey) ??
          (await tx.category.create({ data: { name: row.category } })).id;

        const unitId =
          unitIds.get(unitKey) ??
          (await tx.unit.create({ data: { name: row.unit } })).id;

        const product = await tx.product.create({
          data: {
            productName: row.productName,
            barcode,
            sellingPrice: row.sellingPrice ?? 0,
            lowStockLimit: row.lowStockLimit ?? 0,
            vat: row.vat ?? 0,
            categoryId,
            unitId,
          },
        });

        if (quantity > 0) {
          await addOpeningStock(
            tx,
            [
              {
                productId: product.id,
                quantity,
                purchasePrice: row.purchasePrice ?? 0,
              },
            ],
            userId,
          );
        }

        return { categoryId, unitId };
      });

      // Remember new categories and units only once the row is saved
      categoryIds.set(categoryKey, saved.categoryId);
      unitIds.set(unitKey, saved.unitId);
      names.add(nameKey);
      if (barcode) barcodes.add(barcode);
      created++;
    } catch (error) {
      console.error("Product import row failed:", error);
      skipped.push({
        row: rowNumber,
        name: row.productName,
        reason:
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
            ? "Already exists"
            : error instanceof Error && error.constructor === Error
              ? error.message
              : "Could not be saved",
      });
    }
  }

  return { created, skipped };
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