import { z } from "zod";

// ============================================================
// AUTH
// ============================================================

export const registerSchema = z.object({
  email: z.email("Invalid email"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  role: z
    .enum(["MANAGER", "CASHIER"])
    .optional(),
});

export const loginSchema = z.object({
  email: z.email("Invalid email"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

// ============================================================
// STOCK
// ============================================================
//
// Stock is now a STOCK BATCH.
//
// Each purchase/opening-stock operation creates a batch containing:
//
// - productId
// - quantity
// - purchasePrice
// - expiryDate
//
// StockMovement records the history of that operation.
//
// Direct POST /stocks creation is blocked because it can
// increase stock without the corresponding accounting entry.
//

export const createStockSchema = z.object({
  productId: z
    .number()
    .int()
    .positive(),

  quantity: z
    .number()
    .int()
    .positive("Stock quantity must be greater than zero"),

  purchasePrice: z
    .number()
    .nonnegative("Purchase price cannot be negative"),

  expiryDate: z
    .string()
    .min(1, "Expiry date is required"),

  notes: z
    .string()
    .nullable()
    .optional(),
});

export const updateStockSchema = z.object({
  quantity: z
    .number()
    .int()
    .nonnegative("Stock quantity cannot be negative")
    .optional(),

  purchasePrice: z
    .number()
    .nonnegative("Purchase price cannot be negative")
    .optional(),

  expiryDate: z
    .string()
    .min(1, "Expiry date is required")
    .nullable()
    .optional(),

  notes: z
    .string()
    .nullable()
    .optional(),
});

// ============================================================
// PRODUCT
// ============================================================

export const createProductSchema = z.object({
  productName: z
    .string()
    .min(1, "Product name is required"),

  barcode: z
    .string()
    .optional(),

  categoryId: z
    .number()
    .int()
    .positive("Category is required"),

  unitId: z
    .number()
    .int()
    .positive("Unit is required"),

  sellingPrice: z
    .number()
    .nonnegative("Selling price cannot be negative")
    .optional(),

  lowStockLimit: z
    .number()
    .int()
    .min(0),

  vat: z
    .number()
    .min(0)
    .max(100),

  // Create only: the first stock the shop already has on hand
  purchasePrice: z
    .number()
    .nonnegative("Purchase price cannot be negative")
    .optional(),

  initialQuantity: z
    .number()
    .int("Initial quantity must be a whole number")
    .min(0, "Initial quantity cannot be negative")
    .optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ purchasePrice: true, initialQuantity: true })
  .partial();

// One row of a product import file. Category and unit are names.
export const importProductRowSchema = z.object({
  // Line number in the file, echoed back in the skipped list
  row: z.number().int().positive().optional(),
  productName: z.string().trim().min(1, "Product name is required"),
  barcode: z.string().trim().optional(),
  category: z.string().trim().min(1, "Category is required"),
  unit: z.string().trim().min(1, "Unit is required"),
  purchasePrice: z.number().nonnegative("Purchase price cannot be negative").optional(),
  sellingPrice: z.number().nonnegative("Selling price cannot be negative").optional(),
  quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative").optional(),
  lowStockLimit: z.number().int("Low stock limit must be a whole number").min(0, "Low stock limit cannot be negative").optional(),
  vat: z.number().min(0, "VAT must be between 0 and 100").max(100, "VAT must be between 0 and 100").optional(),
});

export const importProductsSchema = z.object({
  rows: z
    .array(z.unknown())
    .min(1, "The file has no products")
    .max(2000, "Import at most 2000 products at a time"),
});

// ============================================================
// SALE
// ============================================================

export const createSaleSchema = z.object({
  userId: z
    .number()
    .int()
    .positive(),

  items: z
    .array(
      z.object({
        productId: z
          .number()
          .int()
          .positive(),

        quantity: z
          .number()
          .int()
          .positive(),

        unitPrice: z
          .number()
          .nonnegative(),

        discount: z
          .number()
          .nonnegative()
          .optional(),

        tax: z
          .number()
          .nonnegative()
          .optional(),

        lineTotal: z
          .number()
          .nonnegative()
          .optional(),
      }),
    )
    .min(1),

  payments: z
    .array(
      z.object({
        method: z.enum([
          "CASH",
          "CARD",
          "MOBILE",
          "BANK",
        ]),

        amount: z
          .number()
          .nonnegative(),

        reference: z
          .string()
          .optional()
          .nullable(),
      }),
    )
    .optional(),

  discount: z
    .number()
    .nonnegative()
    .optional(),

  tax: z
    .number()
    .nonnegative()
    .optional(),

  paidAmount: z
    .number()
    .nonnegative()
    .optional(),

  status: z
    .enum([
      "PENDING",
      "COMPLETED",
      "CANCELLED",
      "RETURNED",
    ])
    .optional(),
});

// ============================================================
// SALE RETURN
// ============================================================

export const createSaleReturnSchema = z.object({
  saleId: z
    .number()
    .int()
    .positive(),

  reason: z
    .string()
    .min(1, "Return reason is required"),

  notes: z
    .string()
    .optional(),

  items: z
    .array(
      z.object({
        saleItemId: z
          .number()
          .int()
          .positive(),

        productId: z
          .number()
          .int()
          .positive(),

        quantity: z
          .number()
          .int()
          .positive(),

        unitPrice: z
          .number()
          .nonnegative(),
      }),
    )
    .min(1),

  subtotal: z
    .number()
    .nonnegative(),

  tax: z
    .number()
    .nonnegative(),

  total: z
    .number()
    .nonnegative(),
});