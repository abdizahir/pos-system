import { prisma } from "../db/prisma.js";
import { isMobileAccountType } from "../utils/payment-accounts.js";
import { Prisma, PaymentMethod } from "../../generated/prisma/client.js";

type ItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  lineTotal?: number;
};

type PaymentInput = {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  accountId?: number | null;
};

export type AddSalePaymentData = {
  saleId: number;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  accountId?: number | null;
};

// ============================================================
// CREATE SALE
// ============================================================
//
// Stock is stored in StockBatch.
//
// Flow:
// 1. Validate sale items
// 2. Find stock batches using FEFO
// 3. Allocate requested quantity across batches
// 4. Decrease each batch
// 5. Create Sale
// 6. Create SaleItems linked to their exact batches
// 7. Create payments
// 8. Create SALE stock movements
//
// Everything happens inside one transaction.
// ============================================================

export async function createSale(payload: {
  userId: number;
  customerId?: number | null;
  items: ItemInput[];
  payments: PaymentInput[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  status?: string;
}) {
  const {
    userId,
    customerId,
    items,
    payments,
    subtotal,
    discount,
    tax,
    total,
    paidAmount,
    dueAmount,
    changeAmount,
    status,
  } = payload;

  return prisma.$transaction(async (tx) => {
    // ========================================================
    // VALIDATE CUSTOMER
    // ========================================================

    if (customerId !== undefined && customerId !== null) {
      if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new Error("Invalid customer ID");
      }

      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });

      if (!customer) {
        throw new Error("Selected customer not found");
      }
    }

    // Credit sales must have a customer
    if (dueAmount > 0 && (customerId === undefined || customerId === null)) {
      throw new Error("Customer is required for credit sales");
    }

    // ========================================================
    // VALIDATE SALE
    // ========================================================

    if (!items || items.length === 0) {
      throw new Error("Sale must contain at least one item");
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new Error("Invalid subtotal");
    }

    if (!Number.isFinite(discount) || discount < 0) {
      throw new Error("Invalid discount");
    }

    if (!Number.isFinite(tax) || tax < 0) {
      throw new Error("Invalid tax");
    }

    if (!Number.isFinite(total) || total < 0) {
      throw new Error("Invalid total");
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new Error("Invalid paid amount");
    }

    if (!Number.isFinite(dueAmount) || dueAmount < 0) {
      throw new Error("Invalid due amount");
    }

    if (!Number.isFinite(changeAmount) || changeAmount < 0) {
      throw new Error("Invalid change amount");
    }

    // ========================================================
    // VALIDATE ITEMS
    // ========================================================

    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new Error("Invalid product ID");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}`);
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new Error(`Invalid unit price for product ${item.productId}`);
      }

      if (
        item.discount !== undefined &&
        (!Number.isFinite(item.discount) || item.discount < 0)
      ) {
        throw new Error(`Invalid discount for product ${item.productId}`);
      }

      if (
        item.tax !== undefined &&
        (!Number.isFinite(item.tax) || item.tax < 0)
      ) {
        throw new Error(`Invalid tax for product ${item.productId}`);
      }
    }

    // ========================================================
    // ALLOCATE STOCK
    // ========================================================
    //
    // SaleItem.stockBatchId is required.
    //
    // FEFO:
    // earliest expiry date first.
    //
    // Products without expiry dates are placed last.
    // ========================================================

    type Allocation = {
      productId: number;
      batchId: number;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      lineTotal: number;
    };

    const allocations: Allocation[] = [];

    for (const item of items) {
      let remainingQuantity = item.quantity;

      // --------------------------------------------------------
      // Find available batches
      // --------------------------------------------------------

      const batches = await tx.stockBatch.findMany({
        where: {
          productId: item.productId,
          quantity: {
            gt: 0,
          },
        },

        orderBy: [
          {
            expiryDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

      // --------------------------------------------------------
      // No stock
      // --------------------------------------------------------

      if (batches.length === 0) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },

          select: {
            productName: true,
          },
        });

        throw new Error(
          `No stock available for ${
            product?.productName ?? `product ${item.productId}`
          }`,
        );
      }

      // --------------------------------------------------------
      // Check total available stock
      // --------------------------------------------------------

      const totalAvailable = batches.reduce(
        (sum, batch) => sum + batch.quantity,
        0,
      );

      if (totalAvailable < item.quantity) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },

          select: {
            productName: true,
          },
        });

        throw new Error(
          `Insufficient stock for ${
            product?.productName ?? `product ${item.productId}`
          }. Available stock: ${totalAvailable}. Requested: ${item.quantity}.`,
        );
      }

      // ========================================================
      // CONSUME FROM BATCHES
      // ========================================================

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const quantityFromBatch = Math.min(batch.quantity, remainingQuantity);

        // ------------------------------------------------------
        // Decrease batch quantity
        // ------------------------------------------------------

        await tx.stockBatch.update({
          where: {
            id: batch.id,
          },

          data: {
            quantity: {
              decrement: quantityFromBatch,
            },
          },
        });

        // ------------------------------------------------------
        // Calculate allocation values
        // ------------------------------------------------------

        const unitPrice = Number(item.unitPrice);
        const discount = Number(item.discount ?? 0);
        const tax = Number(item.tax ?? 0);

        const allocationLineTotal =
          unitPrice * quantityFromBatch - discount + tax;

        // ------------------------------------------------------
        // Store allocation
        // ------------------------------------------------------

        allocations.push({
          productId: item.productId,
          batchId: batch.id,
          quantity: quantityFromBatch,
          unitPrice,
          discount,
          tax,
          lineTotal: Math.max(allocationLineTotal, 0),
        });

        remainingQuantity -= quantityFromBatch;
      }
    }

    // ========================================================
    // VALIDATE PAYMENT ACCOUNTS
    // ========================================================

    for (const payment of payments) {
      // CASH does not use an account
      if (payment.method === "CASH") {
        if (payment.accountId !== undefined && payment.accountId !== null) {
          throw new Error("Cash payment cannot have an account");
        }

        continue;
      }

      // BANK, CARD, and MOBILE require an account
      if (payment.accountId === undefined || payment.accountId === null) {
        throw new Error(`${payment.method} payment requires an account`);
      }

      const account = await tx.account.findUnique({
        where: {
          id: payment.accountId,
        },
      });

      if (!account) {
        throw new Error("Selected account not found");
      }

      if (account.status !== "ACTIVE") {
        throw new Error("Selected account is inactive");
      }

      // BANK and CARD must use BANK accounts
      if (
        (payment.method === "BANK" || payment.method === "CARD") &&
        account.type !== "BANK"
      ) {
        throw new Error(`${payment.method} payment must use a bank account`);
      }

      // MOBILE must use WALLET
      if (payment.method === "MOBILE" && !isMobileAccountType(account.type)) {
        throw new Error("Mobile payment must use a wallet or merchant account");
      }
    }

    // ========================================================
    // SYNC PRODUCT STOCK QUANTITY (important)
    // ========================================================
    // We already decremented batches above; now decrement product.stockQuantity
    const soldByProduct = new Map<number, number>();

    for (const allocation of allocations) {
      soldByProduct.set(
        allocation.productId,
        (soldByProduct.get(allocation.productId) ?? 0) + allocation.quantity,
      );
    }

    for (const [productId, soldQty] of soldByProduct) {
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: { decrement: soldQty },
        },
      });
    }

    // ========================================================
    // CREATE SALE
    // ========================================================

    const sale = await tx.sale.create({
      data: {
        invoiceNumber: `INV${Date.now()}`,
        userId,
        customerId: customerId ?? null,
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        paidAmount: new Prisma.Decimal(paidAmount),
        dueAmount: new Prisma.Decimal(dueAmount),
        changeAmount: new Prisma.Decimal(changeAmount),

        ...(status !== undefined
          ? {
              status: status as
                | "PENDING"
                | "COMPLETED"
                | "CANCELLED"
                | "RETURNED",
            }
          : {}),

        items: {
          create: allocations.map((allocation) => ({
            productId: allocation.productId,
            stockBatchId: allocation.batchId,
            quantity: allocation.quantity,
            unitPrice: new Prisma.Decimal(allocation.unitPrice),
            discount: new Prisma.Decimal(allocation.discount),
            tax: new Prisma.Decimal(allocation.tax),
            lineTotal: new Prisma.Decimal(allocation.lineTotal),
          })),
        },

        payments: {
          create: payments.map((payment) => ({
            method: payment.method,
            amount: new Prisma.Decimal(payment.amount),
            reference: payment.reference ?? null,
            accountId: payment.accountId ?? null,
          })),
        },
      },

      include: {
        items: {
          include: {
            product: true,
            stockBatch: true,
          },
        },
        payments: true,
      },
    });

    // ========================================================
    // CREATE STOCK MOVEMENTS
    // ========================================================

    for (const allocation of allocations) {
      await tx.stockMovement.create({
        data: {
          productId: allocation.productId,

          stockBatchId: allocation.batchId,

          saleId: sale.id,

          userId,

          type: "SALE",

          quantity: -allocation.quantity,

          notes: `Sale ${sale.invoiceNumber}`,
        },
      });
    }

    return sale;
  });
}

// ============================================================
// FIND SALE BY ID
// ============================================================

export async function findById(id: number) {
  return prisma.sale.findUnique({
    where: {
      id,
    },

    include: {
      items: {
        include: {
          product: true,
          stockBatch: true,
          returnItems: true,
        },
      },

      payments: true,

      customer: true,

      user: true,

      returns: {
        include: {
          items: true,
        },
      },
    },
  });
}

// ============================================================
// FIND ALL SALES
// ============================================================

export async function findAll() {
  return prisma.sale.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      items: {
        include: {
          product: true,
          stockBatch: true,
          returnItems: true,
        },
      },

      payments: true,

      customer: true,

      user: true,

      returns: {
        include: {
          items: true,
        },
      },
    },
  });
}

// ============================================================
// ADD PAYMENT
// ============================================================

export async function addPayment(data: AddSalePaymentData) {
  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Find sale
    // --------------------------------------------------------

    const sale = await tx.sale.findUnique({
      where: {
        id: data.saleId,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    // --------------------------------------------------------
    // Only pending sales can receive payments
    // --------------------------------------------------------

    if (sale.status !== "PENDING") {
      throw new Error("Only pending sales can receive payments");
    }

    // --------------------------------------------------------
    // Validate amount
    // --------------------------------------------------------

    const amount = Number(data.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    // --------------------------------------------------------
    // Calculate remaining due
    // --------------------------------------------------------

    const total = Number(sale.total);

    const alreadyPaid = Number(sale.paidAmount);

    const due = Math.max(total - alreadyPaid, 0);

    if (amount > due) {
      throw new Error(
        `Payment amount cannot exceed the remaining due of ${due.toFixed(2)}`,
      );
    }

    const newPaidAmount = alreadyPaid + amount;

    const newDueAmount = Math.max(total - newPaidAmount, 0);

    const newStatus = newDueAmount === 0 ? "COMPLETED" : "PENDING";

    // ========================================================
// VALIDATE PAYMENT ACCOUNT
// ========================================================

if (data.method === "CASH") {
  if (data.accountId !== undefined && data.accountId !== null) {
    throw new Error("Cash payment cannot have an account");
  }
} else {
  if (data.accountId === undefined || data.accountId === null) {
    throw new Error(`${data.method} payment requires an account`);
  }

  const account = await tx.account.findUnique({
    where: {
      id: data.accountId,
    },
  });

  if (!account) {
    throw new Error("Selected account not found");
  }

  if (account.status !== "ACTIVE") {
    throw new Error("Selected account is inactive");
  }

  // BANK and CARD → BANK account
  if (
    (data.method === "BANK" || data.method === "CARD") &&
    account.type !== "BANK"
  ) {
    throw new Error(`${data.method} payment must use a bank account`);
  }

  // MOBILE → WALLET account
  if (data.method === "MOBILE" && !isMobileAccountType(account.type)) {
    throw new Error("Mobile payment must use a wallet or merchant account");
  }
}

    // ========================================================
    // CREATE PAYMENT
    // ========================================================

    await tx.payment.create({
      data: {
        saleId: sale.id,
        method: data.method,
        amount: new Prisma.Decimal(amount),
        reference: data.reference ?? null,
        accountId: data.accountId ?? null,
      },
    });

    // ========================================================
    // UPDATE SALE
    // ========================================================

    return tx.sale.update({
      where: {
        id: sale.id,
      },

      data: {
        paidAmount: new Prisma.Decimal(newPaidAmount),

        dueAmount: new Prisma.Decimal(newDueAmount),

        changeAmount: new Prisma.Decimal(0),

        status: newStatus,
      },

      include: {
        items: {
          include: {
            product: true,
            stockBatch: true,
            returnItems: true,
          },
        },

        payments: true,

        customer: true,

        user: true,
      },
    });
  });
}

// ============================================================
// CANCEL SALE
// ============================================================
//
// Only PENDING sales can be cancelled.
//
// We restore the EXACT stock batches that were consumed by
// this sale.
//
// Example:
//
// Batch A → sold 5
// Batch B → sold 7
//
// Cancel:
//
// Batch A → +5
// Batch B → +7
// ============================================================

export async function cancelSale(saleId: number) {
  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Find sale
    // --------------------------------------------------------

    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },

      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    // --------------------------------------------------------
    // Already cancelled
    // --------------------------------------------------------

    if (sale.status === "CANCELLED") {
      throw new Error("Sale is already cancelled");
    }

    // --------------------------------------------------------
    // Completed sales cannot be cancelled
    // --------------------------------------------------------

    if (sale.status === "COMPLETED") {
      throw new Error("Completed sales cannot be cancelled");
    }

    // ========================================================
    // FIND SALE MOVEMENTS
    // ========================================================

    const saleMovements = await tx.stockMovement.findMany({
      where: {
        saleId: sale.id,
        type: "SALE",
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    // ========================================================
    // RESTORE EXACT BATCHES
    // ========================================================

    for (const movement of saleMovements) {
      if (!movement.stockBatchId) {
        throw new Error(
          `Sale movement ${movement.id} is missing its stock batch`,
        );
      }

      const restoredQuantity = Math.abs(movement.quantity);

      await tx.stockBatch.update({
        where: { id: movement.stockBatchId },
        data: {
          quantity: { increment: restoredQuantity },
        },
      });

      // ------------------------------------------------------
      // Record RETURN movement
      // ------------------------------------------------------

      // restore product aggregate stock too
      await tx.product.update({
        where: { id: movement.productId },
        data: {
          stockQuantity: { increment: restoredQuantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: movement.productId,
          stockBatchId: movement.stockBatchId,
          saleId: sale.id,
          userId: sale.userId,
          type: "RETURN",
          quantity: restoredQuantity,
          notes: `Cancelled sale ${sale.invoiceNumber}`,
        },
      });
    }

    // ========================================================
    // MARK SALE CANCELLED
    // ========================================================

    return tx.sale.update({
      where: {
        id: saleId,
      },

      data: {
        status: "CANCELLED",
      },

      include: {
        items: {
          include: {
            product: true,
            stockBatch: true,
            returnItems: true,
          },
        },

        payments: true,

        customer: true,

        user: true,
      },
    });
  });
}
