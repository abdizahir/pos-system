import { prisma } from "../db/prisma.js";
import {
  Prisma,
  SaleStatus,
  PaymentMethod,
} from "../../generated/prisma/client.js";

import * as saleRepository from "../repositories/sale.repository.js";
import {
  getPaymentChartCode,
  isMobileAccountType,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";

const VAT_PAYABLE_CODE = "2100";

// The most a cashier can discount a sale, as a percent of its
// subtotal. Each shop can change it with MAX_CASHIER_DISCOUNT_PERCENT.
function cashierDiscountLimit() {
  const value = Number(process.env.MAX_CASHIER_DISCOUNT_PERCENT ?? 10);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 100) : 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

type SaleItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  lineTotal?: number;
};

type SalePaymentInput = {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  accountId?: number | null;
};

type CreateSaleInput = {
  userId: number;

  items: SaleItemInput[];

  payments: SalePaymentInput[];

  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  paidAmount: number;
  dueAmount: number;
  changeAmount: number;

  status?: SaleStatus;

  // ==========================================================
  // CUSTOMER
  // ==========================================================
  customerId?: number | null;
};

// ============================================================
// RECALCULATE PRODUCT STOCK CACHE
// ============================================================

async function recalcProductStockCache(
  tx: Prisma.TransactionClient,
  productId: number,
) {
  const agg = await tx.stockBatch.aggregate({
    where: {
      productId,
    },
    _sum: {
      quantity: true,
    },
  });

  await tx.product.update({
    where: {
      id: productId,
    },
    data: {
      stockQuantity: agg._sum.quantity ?? 0,
    },
  });
}

async function recalcManyProductStockCache(
  tx: Prisma.TransactionClient,
  productIds: number[],
) {
  const uniqueIds = [...new Set(productIds)];

  for (const productId of uniqueIds) {
    await recalcProductStockCache(
      tx,
      productId,
    );
  }
}

// ============================================================
// GET CHART ACCOUNT ID
// ============================================================

async function getChartAccountId(
  tx: Prisma.TransactionClient,
  code: string,
) {
  const account = await tx.chartAccount.findUnique({
    where: {
      code,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!account) {
    throw new Error(
      `Chart account ${code} not found`,
    );
  }

  return account.id;
}

// ============================================================
// GET PAYMENT CHART ACCOUNT ID
// ============================================================

async function getPaymentChartAccountId(
  tx: Prisma.TransactionClient,
  method: PaymentMethod,
  accountId?: number | null,
) {
  return getChartAccountId(
    tx,
    await getPaymentChartCode(
      tx,
      method,
      accountId,
    ),
  );
}

// ============================================================
// FIND ALL
// ============================================================

export async function findAll() {
  return saleRepository.findAll();
}

// ============================================================
// FIND BY ID
// ============================================================

export async function findById(
  id: number,
) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Invalid sale ID",
    );
  }

  const sale =
    await saleRepository.findById(id);

  if (!sale) {
    throw new Error(
      "Sale not found",
    );
  }

  return sale;
}

// ============================================================
// CREATE SALE
// ============================================================

export async function createSale(
  data: CreateSaleInput,
) {
  return prisma.$transaction(
    async (tx) => {
      // ======================================================
      // VALIDATE USER
      // ======================================================

      const user =
        await tx.user.findUnique({
          where: {
            id: data.userId,
          },
          select: {
            id: true,
            isActive: true,
            role: true,
          },
        });

      if (!user) {
        throw new Error(
          "User not found",
        );
      }

      if (!user.isActive) {
        throw new Error(
          "User account is inactive",
        );
      }

      // ======================================================
      // VALIDATE CUSTOMER
      // ======================================================

      let customerId: number | null =
        data.customerId ?? null;

      if (
        customerId !== null
      ) {
        if (
          !Number.isInteger(
            customerId,
          ) ||
          customerId <= 0
        ) {
          throw new Error(
            "Invalid customer ID",
          );
        }

        const customer =
          await tx.customer.findUnique({
            where: {
              id: customerId,
            },
            select: {
              id: true,
            },
          });

        if (!customer) {
          throw new Error(
            "Customer not found",
          );
        }
      }

      // ======================================================
      // VALIDATE ITEMS
      // ======================================================

      if (
        !data.items ||
        data.items.length === 0
      ) {
        throw new Error(
          "Sale must contain at least one item",
        );
      }

      // ======================================================
      // VALIDATE SALE TOTALS
      // ======================================================

      if (
        !Number.isFinite(
          data.subtotal,
        ) ||
        data.subtotal < 0
      ) {
        throw new Error(
          "Invalid subtotal",
        );
      }

      if (
        !Number.isFinite(
          data.discount,
        ) ||
        data.discount < 0
      ) {
        throw new Error(
          "Invalid discount",
        );
      }

      if (
        !Number.isFinite(
          data.tax,
        ) ||
        data.tax < 0
      ) {
        throw new Error(
          "Invalid tax",
        );
      }

      if (
        !Number.isFinite(
          data.total,
        ) ||
        data.total < 0
      ) {
        throw new Error(
          "Invalid total",
        );
      }

      if (
        !Number.isFinite(
          data.paidAmount,
        ) ||
        data.paidAmount < 0
      ) {
        throw new Error(
          "Invalid paid amount",
        );
      }

      if (
        !Number.isFinite(
          data.dueAmount,
        ) ||
        data.dueAmount < 0
      ) {
        throw new Error(
          "Invalid due amount",
        );
      }

      if (
        !Number.isFinite(
          data.changeAmount,
        ) ||
        data.changeAmount < 0
      ) {
        throw new Error(
          "Invalid change amount",
        );
      }

      // ======================================================
      // CREDIT SALE REQUIRES CUSTOMER
      // ======================================================

      if (
        data.dueAmount > 0 &&
        !customerId
      ) {
        throw new Error(
          "Customer is required for credit sales",
        );
      }

      // ======================================================
      // VALIDATE PAYMENT TOTAL
      // ======================================================

      const paymentTotal =
        data.payments.reduce(
          (
            sum,
            payment,
          ) =>
            sum +
            Number(
              payment.amount,
            ),
          0,
        );

      if (
        !Number.isFinite(
          paymentTotal,
        ) ||
        paymentTotal < 0
      ) {
        throw new Error(
          "Invalid payment total",
        );
      }

      const paymentDifference =
        Math.abs(
          paymentTotal -
            data.paidAmount,
        );

      if (
        paymentDifference >
        0.01
      ) {
        throw new Error(
          `Payment total (${paymentTotal.toFixed(
            2,
          )}) does not match paid amount (${data.paidAmount.toFixed(
            2,
          )})`,
        );
      }

      // ======================================================
      // VALIDATE TOTALS AGAINST THE ITEMS
      // ======================================================

      const expectedSubtotal = round2(
        data.items.reduce(
          (sum, item) =>
            sum +
            Number(item.unitPrice) *
              Number(item.quantity),
          0,
        ),
      );

      if (
        Math.abs(
          expectedSubtotal -
            data.subtotal,
        ) > 0.01
      ) {
        throw new Error(
          `Subtotal (${data.subtotal.toFixed(
            2,
          )}) does not match the items (${expectedSubtotal.toFixed(
            2,
          )})`,
        );
      }

      if (
        data.discount >
        data.subtotal + 0.005
      ) {
        throw new Error(
          "Discount cannot be more than the subtotal",
        );
      }

      // Cashiers can only give a small discount; larger ones need
      // the manager. Line discounts count too.
      if (user.role !== "MANAGER") {
        const lineDiscounts = data.items.reduce(
          (sum, item) => sum + Number(item.discount ?? 0),
          0,
        );
        const givenDiscount = Math.max(data.discount, lineDiscounts);
        const limitPercent = cashierDiscountLimit();
        const limit = round2((data.subtotal * limitPercent) / 100);

        if (givenDiscount > limit + 0.005) {
          throw new Error(
            `Cashiers can give at most ${limitPercent}% discount (ETB ${limit.toFixed(2)} on this sale). Ask the manager for a bigger discount.`,
          );
        }
      }

      const expectedTotal = round2(
        data.subtotal -
          data.discount +
          data.tax,
      );

      if (
        Math.abs(
          expectedTotal -
            data.total,
        ) > 0.01
      ) {
        throw new Error(
          `Total (${data.total.toFixed(
            2,
          )}) must equal subtotal − discount + tax (${expectedTotal.toFixed(
            2,
          )})`,
        );
      }

      // ======================================================
      // CHANGE
      // ======================================================
      // The customer handed over more than the total. The extra
      // is change, which goes back in cash, so it comes off the
      // cash payments. Only the total is kept as paid.

      const overpaid = round2(
        data.paidAmount -
          data.total,
      );

      if (overpaid > 0.005) {
        let remaining = overpaid;

        for (const payment of data.payments) {
          if (
            payment.method !==
              "CASH" ||
            remaining <= 0
          ) {
            continue;
          }

          const taken = Math.min(
            Number(payment.amount),
            remaining,
          );

          payment.amount = round2(
            Number(payment.amount) -
              taken,
          );
          remaining = round2(
            remaining - taken,
          );
        }

        if (remaining > 0.005) {
          throw new Error(
            "Only cash can include change. Card, bank and mobile payments can't be more than the total.",
          );
        }

        data.payments =
          data.payments.filter(
            (payment) =>
              Number(payment.amount) >
              0,
          );
        data.paidAmount = data.total;
        data.changeAmount = overpaid;
      }

      const expectedDue =
        Math.max(
          data.total -
            data.paidAmount,
          0,
        );

      if (
        Math.abs(
          expectedDue -
            data.dueAmount,
        ) > 0.01
      ) {
        throw new Error(
          `Due amount (${data.dueAmount.toFixed(
            2,
          )}) does not match sale total and paid amount`,
        );
      }

      // ======================================================
      // SALE STATUS
      // ======================================================

      const saleStatus: SaleStatus =
        data.paidAmount >=
        data.total
          ? "COMPLETED"
          : "PENDING";

      // ======================================================
      // STOCK ALLOCATION
      // ======================================================

      type Allocation = {
        productId: number;
        stockBatchId: number;
        quantity: number;
        unitPrice: Prisma.Decimal;
        purchasePrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        tax: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      };

      const allocations: Allocation[] =
        [];

      // ======================================================
      // ALLOCATE STOCK BY BATCH
      // ======================================================

      for (const item of data.items) {
        if (
          !Number.isInteger(
            item.productId,
          ) ||
          item.productId <= 0
        ) {
          throw new Error(
            "Invalid product ID",
          );
        }

        if (
          !Number.isInteger(
            item.quantity,
          ) ||
          item.quantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for product ${item.productId}`,
          );
        }

        if (
          !Number.isFinite(
            item.unitPrice,
          ) ||
          item.unitPrice < 0
        ) {
          throw new Error(
            `Invalid unit price for product ${item.productId}`,
          );
        }

        const product =
          await tx.product.findUnique({
            where: {
              id: item.productId,
            },
            select: {
              id: true,
              productName: true,
              sellingPrice: true,
            },
          });

        if (!product) {
          throw new Error(
            `Product ${item.productId} not found`,
          );
        }

        // The price comes from the product, not the client
        if (
          Math.abs(
            Number(product.sellingPrice) -
              item.unitPrice,
          ) > 0.005
        ) {
          throw new Error(
            `The price of ${product.productName} is ETB ${Number(
              product.sellingPrice,
            ).toFixed(2)}. Refresh and try again.`,
          );
        }

        // ====================================================
        // GET AVAILABLE STOCK
        // ====================================================

        const batches =
          await tx.stockBatch.findMany({
            where: {
              productId:
                item.productId,

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
              {
                id: "asc",
              },
            ],
          });

        if (
          batches.length === 0
        ) {
          throw new Error(
            `No stock available for ${product.productName}`,
          );
        }

        // ====================================================
        // EXPIRED PRODUCT CHECK
        // ====================================================

        const now =
          new Date();

        const availableNonExpiredBatches =
          batches.filter(
            (batch) =>
              !batch.expiryDate ||
              batch.expiryDate >
                now,
          );

        if (
          availableNonExpiredBatches.length ===
          0
        ) {
          throw new Error(
            `${product.productName} is expired and cannot be sold`,
          );
        }

        // ====================================================
        // TOTAL AVAILABLE NON-EXPIRED STOCK
        // ====================================================

        const totalAvailable =
          availableNonExpiredBatches.reduce(
            (
              sum,
              batch,
            ) =>
              sum +
              batch.quantity,
            0,
          );

        if (
          totalAvailable <
          item.quantity
        ) {
          throw new Error(
            `Insufficient non-expired stock for ${product.productName}. Available: ${totalAvailable}. Requested: ${item.quantity}.`,
          );
        }

        // ====================================================
        // ITEM VALUES
        // ====================================================

        const quantity =
          item.quantity;

        const unitPrice =
          Number(
            item.unitPrice,
          );

        const discount =
          Number(
            item.discount ?? 0,
          );

        const tax =
          Number(
            item.tax ?? 0,
          );

        const lineTotal =
          Number(
            item.lineTotal ??
              unitPrice *
                quantity,
          );

        if (
          !Number.isFinite(
            discount,
          ) ||
          discount < 0
        ) {
          throw new Error(
            `Invalid discount for ${product.productName}`,
          );
        }

        if (
          !Number.isFinite(
            tax,
          ) ||
          tax < 0
        ) {
          throw new Error(
            `Invalid tax for ${product.productName}`,
          );
        }

        if (
          !Number.isFinite(
            lineTotal,
          ) ||
          lineTotal < 0
        ) {
          throw new Error(
            `Invalid line total for ${product.productName}`,
          );
        }

        // ====================================================
        // FEFO ALLOCATION
        // ====================================================

        let remaining =
          quantity;

        for (const batch of availableNonExpiredBatches) {
          if (
            remaining <= 0
          ) {
            break;
          }

          const quantityFromBatch =
            Math.min(
              batch.quantity,
              remaining,
            );

          const batchDiscount =
            (discount /
              quantity) *
            quantityFromBatch;

          const batchTax =
            (tax /
              quantity) *
            quantityFromBatch;

          const batchLineTotal =
            (lineTotal /
              quantity) *
            quantityFromBatch;

          allocations.push({
            productId:
              item.productId,

            stockBatchId:
              batch.id,

            quantity:
              quantityFromBatch,

            unitPrice:
              new Prisma.Decimal(
                unitPrice,
              ),

            purchasePrice:
              batch.purchasePrice,

            discount:
              new Prisma.Decimal(
                batchDiscount,
              ),

            tax:
              new Prisma.Decimal(
                batchTax,
              ),

            lineTotal:
              new Prisma.Decimal(
                batchLineTotal,
              ),
          });

          remaining -=
            quantityFromBatch;
        }
      }

      // ======================================================
      // VALIDATE PAYMENTS
      // ======================================================

      for (const payment of data.payments) {
        if (
          !Number.isFinite(
            payment.amount,
          ) ||
          payment.amount <= 0
        ) {
          throw new Error(
            "Payment amount must be greater than zero",
          );
        }

        // ----------------------------------------------------
        // CASH
        // ----------------------------------------------------

        if (
          payment.method ===
          "CASH"
        ) {
          if (
            payment.accountId !==
              undefined &&
            payment.accountId !==
              null
          ) {
            throw new Error(
              "Cash payment cannot have an account",
            );
          }

          continue;
        }

        // ----------------------------------------------------
        // BANK / CARD / MOBILE
        // ----------------------------------------------------

        if (
          payment.accountId ===
            undefined ||
          payment.accountId ===
            null
        ) {
          throw new Error(
            `${payment.method} payment requires an account`,
          );
        }

        const account =
          await tx.account.findUnique({
            where: {
              id: payment.accountId,
            },
          });

        if (!account) {
          throw new Error(
            "Selected account not found",
          );
        }

        if (
          account.status !==
          "ACTIVE"
        ) {
          throw new Error(
            "Selected account is inactive",
          );
        }

        if (
          (payment.method ===
            "BANK" ||
            payment.method ===
              "CARD") &&
          account.type !==
            "BANK"
        ) {
          throw new Error(
            `${payment.method} payment must use a bank account`,
          );
        }

        if (
          payment.method ===
            "MOBILE" &&
          !isMobileAccountType(account.type)
        ) {
          throw new Error(
            "Mobile payment must use a wallet or merchant account",
          );
        }
      }

      // ======================================================
      // CREATE SALE
      // ======================================================

      const sale =
        await tx.sale.create({
          data: {
            invoiceNumber:
              `INV${Date.now()}`,

            userId:
              data.userId,

            // ==================================================
            // CUSTOMER
            // ==================================================

            customerId:
              customerId,

            subtotal:
              new Prisma.Decimal(
                data.subtotal,
              ),

            discount:
              new Prisma.Decimal(
                data.discount,
              ),

            tax:
              new Prisma.Decimal(
                data.tax,
              ),

            total:
              new Prisma.Decimal(
                data.total,
              ),

            paidAmount:
              new Prisma.Decimal(
                data.paidAmount,
              ),

            dueAmount:
              new Prisma.Decimal(
                data.dueAmount,
              ),

            changeAmount:
              new Prisma.Decimal(
                data.changeAmount,
              ),

            status:
              saleStatus,

            // ==================================================
            // SALE ITEMS
            // ==================================================

            items: {
              create:
                allocations.map(
                  (
                    allocation,
                  ) => ({
                    productId:
                      allocation.productId,

                    stockBatchId:
                      allocation.stockBatchId,

                    quantity:
                      allocation.quantity,

                    unitPrice:
                      allocation.unitPrice,

                    discount:
                      allocation.discount,

                    tax:
                      allocation.tax,

                    lineTotal:
                      allocation.lineTotal,
                  }),
                ),
            },

            // ==================================================
            // PAYMENTS
            // ==================================================

            payments: {
              create:
                data.payments.map(
                  (
                    payment,
                  ) => ({
                    method:
                      payment.method,

                    accountId:
                      payment.accountId ??
                      null,

                    amount:
                      new Prisma.Decimal(
                        payment.amount,
                      ),

                    reference:
                      payment.reference ??
                      null,
                  }),
                ),
            },
          },

          include: {
            customer: true,

            items: {
              include: {
                product: true,
                stockBatch: true,
              },
            },

            payments: true,

            user: true,
          },
        });

      // ========================================================
      // UPDATE ACTUAL ACCOUNT BALANCES
      // ========================================================

      for (const payment of data.payments) {
        if (
          payment.method ===
            "CASH" ||
          payment.accountId ===
            null ||
          payment.accountId ===
            undefined
        ) {
          continue;
        }

        await tx.account.update({
          where: {
            id: payment.accountId,
          },

          data: {
            currentBalance: {
              increment:
                new Prisma.Decimal(
                  payment.amount,
                ),
            },
          },
        });
      }

      // ========================================================
      // REDUCE STOCK + CREATE STOCK MOVEMENTS
      // ========================================================

      for (const allocation of allocations) {
        const result =
          await tx.stockBatch.updateMany({
            where: {
              id:
                allocation.stockBatchId,

              quantity: {
                gte:
                  allocation.quantity,
              },
            },

            data: {
              quantity: {
                decrement:
                  allocation.quantity,
              },
            },
          });

        if (
          result.count === 0
        ) {
          throw new Error(
            "Stock changed while processing the sale. Please try again.",
          );
        }

        await tx.stockMovement.create({
          data: {
            productId:
              allocation.productId,

            stockBatchId:
              allocation.stockBatchId,

            saleId:
              sale.id,

            userId:
              data.userId,

            type: "SALE",

            quantity:
              -allocation.quantity,

            notes:
              `Sale ${sale.invoiceNumber}`,
          },
        });
      }

      // ========================================================
      // RECALCULATE PRODUCT STOCK CACHE
      // ========================================================

      await recalcManyProductStockCache(
        tx,

        allocations.map(
          (
            allocation,
          ) =>
            allocation.productId,
        ),
      );

      // ========================================================
      // ACCOUNTING
      // ========================================================

      const salesRevenueAccountId =
        await getChartAccountId(
          tx,
          "4000",
        );

      const cogsAccountId =
        await getChartAccountId(
          tx,
          "5000",
        );

      const inventoryAccountId =
        await getChartAccountId(
          tx,
          "1100",
        );

      const accountsReceivableAccountId =
        await getChartAccountId(
          tx,
          "1200",
        );

      // ========================================================
      // CALCULATE COGS
      // ========================================================

      const totalCOGS =
        allocations.reduce(
          (
            sum,
            allocation,
          ) =>
            sum +
            Number(
              allocation.purchasePrice,
            ) *
              allocation.quantity,

          0,
        );

      // ========================================================
      // PAYMENT DEBIT ACCOUNTS
      // ========================================================

      // One debit line per chart account + payment account
      const paymentDebits =
        new Map<
          string,
          {
            accountId: number;
            paymentAccountId: number | null;
            amount: number;
          }
        >();

      for (const payment of data.payments) {
        const accountId =
          await getPaymentChartAccountId(
            tx,
            payment.method,
            payment.accountId,
          );

        const paymentAccountId =
          paymentAccountIdFor(
            payment.method,
            payment.accountId,
          );

        const key = `${accountId}:${paymentAccountId ?? ""}`;

        const current =
          paymentDebits.get(key);

        paymentDebits.set(key, {
          accountId,
          paymentAccountId,
          amount:
            (current?.amount ?? 0) +
            Number(
              payment.amount,
            ),
        });
      }

      // ========================================================
      // JOURNAL LINES
      // ========================================================

      const journalLines: {
        accountId: number;
        paymentAccountId?: number | null;
        debit: number;
        credit: number;
      }[] = [];

      // ========================================================
      // CASH / BANK / MOBILE
      // ========================================================

      for (const {
        accountId,
        paymentAccountId,
        amount,
      } of paymentDebits.values()) {
        if (
          amount > 0
        ) {
          journalLines.push({
            accountId,

            paymentAccountId,

            debit:
              amount,

            credit:
              0,
          });
        }
      }

      // ========================================================
      // ACCOUNTS RECEIVABLE
      // ========================================================

      const dueAmount =
        Number(
          data.dueAmount,
        );

      if (
        dueAmount > 0
      ) {
        journalLines.push({
          accountId:
            accountsReceivableAccountId,

          debit:
            dueAmount,

          credit:
            0,
        });
      }

      // ========================================================
      // SALES REVENUE
      // ========================================================

      const vatAmount =
        Number(
          data.tax,
        );

      journalLines.push({
        accountId:
          salesRevenueAccountId,

        debit:
          0,

        credit:
          Number(
            data.total,
          ) - vatAmount,
      });

      // ========================================================
      // VAT PAYABLE
      // ========================================================

      if (
        vatAmount > 0
      ) {
        journalLines.push({
          accountId:
            await getChartAccountId(
              tx,
              VAT_PAYABLE_CODE,
            ),

          debit:
            0,

          credit:
            vatAmount,
        });
      }

      // ========================================================
      // COGS + INVENTORY
      // ========================================================

      if (
        totalCOGS > 0
      ) {
        journalLines.push({
          accountId:
            cogsAccountId,

          debit:
            totalCOGS,

          credit:
            0,
        });

        journalLines.push({
          accountId:
            inventoryAccountId,

          debit:
            0,

          credit:
            totalCOGS,
        });
      }

      // ========================================================
      // VERIFY JOURNAL IS BALANCED
      // ========================================================

      const totalDebit =
        journalLines.reduce(
          (
            sum,
            line,
          ) =>
            sum +
            line.debit,

          0,
        );

      const totalCredit =
        journalLines.reduce(
          (
            sum,
            line,
          ) =>
            sum +
            line.credit,

          0,
        );

      if (
        Math.abs(
          totalDebit -
            totalCredit,
        ) > 0.01
      ) {
        throw new Error(
          `Sale journal is not balanced. Debit: ${totalDebit.toFixed(
            2,
          )}, Credit: ${totalCredit.toFixed(
            2,
          )}`,
        );
      }

      // ========================================================
      // CREATE JOURNAL ENTRY
      // ========================================================

      await tx.journalEntry.create({
        data: {
          date:
            sale.createdAt,

          reference:
            sale.invoiceNumber,

          description:
            `Sale ${sale.invoiceNumber}`,

          saleId:
            sale.id,

          lines: {
            create:
              journalLines.map(
                (
                  line,
                ) => ({
                  accountId:
                    line.accountId,

                  paymentAccountId:
                    line.paymentAccountId ?? null,

                  debit:
                    new Prisma.Decimal(
                      line.debit,
                    ),

                  credit:
                    new Prisma.Decimal(
                      line.credit,
                    ),
                }),
              ),
          },
        },
      });

      // ========================================================
      // RETURN SALE
      // ========================================================

      return sale;
    },
  );
}

// ============================================================
// SALES SUMMARY (light rows for charts and recent lists)
// ============================================================

export async function getSalesSummary(from: Date, to: Date) {
  return prisma.sale.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      createdAt: true,
    },
  });
}

// ============================================================
// GET SALES
// ============================================================

export async function getSales() {
  return prisma.sale.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      // ========================================================
      // CUSTOMER
      // ========================================================

      customer: true,

      user: true,

      items: {
        include: {
          product: true,
          stockBatch: true,
          returnItems: true,
        },
      },

      payments: true,

      returns: {
        include: {
          items: true,
        },
      },
    },
  });
}

// ============================================================
// GET SALE
// ============================================================

export async function getSale(
  saleId: number,
) {
  if (
    !Number.isInteger(
      saleId,
    ) ||
    saleId <= 0
  ) {
    throw new Error(
      "Invalid sale ID",
    );
  }

  return prisma.sale.findUnique({
    where: {
      id: saleId,
    },

    include: {
      // ========================================================
      // CUSTOMER
      // ========================================================

      customer: true,

      user: true,

      items: {
        include: {
          product: true,
          stockBatch: true,
          returnItems: true,
        },
      },

      payments: true,

      returns: {
        include: {
          items: true,
        },
      },
    },
  });
}

// ============================================================
// ADD SALE PAYMENT
// ============================================================

export async function addSalePayment(
  saleId: number,

  data: {
    amount: number;

    method:
      | "CASH"
      | "CARD"
      | "MOBILE"
      | "BANK";

    reference?: string | null;

    accountId?: number | null;
  },
) {
  if (
    !Number.isInteger(
      saleId,
    ) ||
    saleId <= 0
  ) {
    throw new Error(
      "Invalid sale ID",
    );
  }

  const amount =
    Number(
      data.amount,
    );

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero",
    );
  }

  const validMethods = [
    "CASH",
    "CARD",
    "MOBILE",
    "BANK",
  ];

  if (
    !validMethods.includes(
      data.method,
    )
  ) {
    throw new Error(
      "Invalid payment method",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const sale =
        await tx.sale.findUnique({
          where: {
            id: saleId,
          },

          include: {
            customer: true,
          },
        });

      if (!sale) {
        throw new Error(
          "Sale not found",
        );
      }

      if (
        sale.status !==
        "PENDING"
      ) {
        throw new Error(
          "Only pending sales can receive payments",
        );
      }

      const total =
        Number(
          sale.total,
        );

      const alreadyPaid =
        Number(
          sale.paidAmount,
        );

      const remainingDue =
        Math.max(
          total -
            alreadyPaid,
          0,
        );

      if (
        amount >
        remainingDue
      ) {
        throw new Error(
          `Payment cannot exceed remaining due of ${remainingDue.toFixed(
            2,
          )}`,
        );
      }

      const newPaidAmount =
        alreadyPaid +
        amount;

      const newDueAmount =
        Math.max(
          total -
            newPaidAmount,
          0,
        );

      // ======================================================
      // VALIDATE CUSTOMER FOR OUTSTANDING CREDIT
      // ======================================================

      if (
        newDueAmount > 0 &&
        !sale.customerId
      ) {
        throw new Error(
          "Customer is required for credit sales",
        );
      }

      // ======================================================
      // VALIDATE PAYMENT ACCOUNT
      // ======================================================

      if (
        data.method ===
        "CASH"
      ) {
        if (
          data.accountId !==
            undefined &&
          data.accountId !==
            null
        ) {
          throw new Error(
            "Cash payment cannot have an account",
          );
        }
      } else {
        if (
          !data.accountId
        ) {
          throw new Error(
            `${data.method} payment requires an account`,
          );
        }

        const account =
          await tx.account.findUnique(
            {
              where: {
                id:
                  data.accountId,
              },
            },
          );

        if (!account) {
          throw new Error(
            "Selected account not found",
          );
        }

        if (
          account.status !==
          "ACTIVE"
        ) {
          throw new Error(
            "Selected account is inactive",
          );
        }

        if (
          (data.method ===
            "BANK" ||
            data.method ===
              "CARD") &&
          account.type !==
            "BANK"
        ) {
          throw new Error(
            `${data.method} payment must use a bank account`,
          );
        }

        if (
          data.method ===
            "MOBILE" &&
          !isMobileAccountType(account.type)
        ) {
          throw new Error(
            "Mobile payment must use a wallet or merchant account",
          );
        }
      }

      // ======================================================
      // CREATE PAYMENT
      // ======================================================

      await tx.payment.create({
        data: {
          saleId:
            sale.id,

          method:
            data.method,

          amount:
            new Prisma.Decimal(
              amount,
            ),

          reference:
            data.reference ??
            null,

          accountId:
            data.accountId ??
            null,
        },
      });

      // ======================================================
      // UPDATE ACTUAL ACCOUNT BALANCE
      // ======================================================

      if (
        data.method !==
          "CASH" &&
        data.accountId !==
          undefined &&
        data.accountId !==
          null
      ) {
        await tx.account.update({
          where: {
            id:
              data.accountId,
          },

          data: {
            currentBalance: {
              increment:
                new Prisma.Decimal(
                  amount,
                ),
            },
          },
        });
      }

      // ======================================================
      // JOURNAL ENTRY
      // ======================================================

      const paymentAccountId =
        await getPaymentChartAccountId(
          tx,
          data.method,
          data.accountId,
        );

      const accountsReceivableAccountId =
        await getChartAccountId(
          tx,
          "1200",
        );

      await tx.journalEntry.create({
        data: {
          date:
            new Date(),

          reference:
            `PAY-${sale.invoiceNumber}-${Date.now()}`,

          description:
            `Payment received for sale ${sale.invoiceNumber}`,

          saleId:
            sale.id,

          lines: {
            create: [
              {
                accountId:
                  paymentAccountId,

                paymentAccountId:
                  paymentAccountIdFor(
                    data.method,
                    data.accountId,
                  ),

                debit:
                  new Prisma.Decimal(
                    amount,
                  ),

                credit:
                  new Prisma.Decimal(
                    0,
                  ),
              },

              {
                accountId:
                  accountsReceivableAccountId,

                debit:
                  new Prisma.Decimal(
                    0,
                  ),

                credit:
                  new Prisma.Decimal(
                    amount,
                  ),
              },
            ],
          },
        },
      });

      // ======================================================
      // UPDATE SALE
      // ======================================================

      return tx.sale.update({
        where: {
          id:
            saleId,
        },

        data: {
          paidAmount:
            new Prisma.Decimal(
              newPaidAmount,
            ),

          dueAmount:
            new Prisma.Decimal(
              newDueAmount,
            ),

          changeAmount:
            new Prisma.Decimal(
              0,
            ),

          status:
            newDueAmount ===
            0
              ? "COMPLETED"
              : "PENDING",
        },

        include: {
          // ==================================================
          // CUSTOMER
          // ==================================================

          customer: true,

          user: true,

          items: {
            include: {
              product: true,
              stockBatch: true,
              returnItems: true,
            },
          },

          payments: true,
        },
      });
    },
  );
}

// ============================================================
// CANCEL SALE
// ============================================================

export async function cancelSale(
  saleId: number,
) {
  if (
    !Number.isInteger(
      saleId,
    ) ||
    saleId <= 0
  ) {
    throw new Error(
      "Invalid sale ID",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const sale =
        await tx.sale.findUnique({
          where: {
            id:
              saleId,
          },

          include: {
            customer: true,

            items: {
              include: {
                stockBatch: {
                  select: {
                    purchasePrice:
                      true,
                  },
                },
              },
            },

            payments: true,
          },
        });

      if (!sale) {
        throw new Error(
          "Sale not found",
        );
      }

      if (
        sale.status ===
        "CANCELLED"
      ) {
        throw new Error(
          "Sale is already cancelled",
        );
      }

      if (
        sale.status ===
        "COMPLETED"
      ) {
        throw new Error(
          "Completed sales cannot be cancelled",
        );
      }

      if (
        sale.status !==
        "PENDING"
      ) {
        throw new Error(
          `Sale with status ${sale.status} cannot be cancelled`,
        );
      }

      // ======================================================
      // RESTORE STOCK
      // ======================================================

      const movements =
        await tx.stockMovement.findMany(
          {
            where: {
              saleId:
                sale.id,

              type:
                "SALE",
            },

            orderBy: {
              createdAt:
                "asc",
            },
          },
        );

      const affectedProductIds: number[] =
        [];

      for (const movement of movements) {
        if (
          !movement.stockBatchId
        ) {
          throw new Error(
            `Stock movement ${movement.id} has no stock batch`,
          );
        }

        const restoredQuantity =
          Math.abs(
            movement.quantity,
          );

        await tx.stockBatch.update(
          {
            where: {
              id:
                movement.stockBatchId,
            },

            data: {
              quantity: {
                increment:
                  restoredQuantity,
              },
            },
          },
        );

        await tx.stockMovement.create(
          {
            data: {
              productId:
                movement.productId,

              stockBatchId:
                movement.stockBatchId,

              saleId:
                sale.id,

              userId:
                sale.userId,

              type:
                "RETURN",

              quantity:
                restoredQuantity,

              notes:
                `Cancelled sale ${sale.invoiceNumber}`,
            },
          },
        );

        affectedProductIds.push(
          movement.productId,
        );
      }

      // ======================================================
      // RECALCULATE STOCK CACHE
      // ======================================================

      await recalcManyProductStockCache(
        tx,
        affectedProductIds,
      );

      // ======================================================
      // REVERSE ACCOUNTING
      // ======================================================

      const revenueAccountId =
        await getChartAccountId(
          tx,
          "4000",
        );

      const inventoryAccountId =
        await getChartAccountId(
          tx,
          "1100",
        );

      const cogsAccountId =
        await getChartAccountId(
          tx,
          "5000",
        );

      const accountsReceivableAccountId =
        await getChartAccountId(
          tx,
          "1200",
        );

      const reversalLines: {
        accountId: number;
        paymentAccountId?: number | null;
        debit: Prisma.Decimal;
        credit: Prisma.Decimal;
      }[] = [
        {
          accountId:
            revenueAccountId,

          debit:
            sale.total.sub(
              sale.tax,
            ),

          credit:
            new Prisma.Decimal(
              0,
            ),
        },
      ];

      if (
        sale.tax.gt(0)
      ) {
        reversalLines.push({
          accountId:
            await getChartAccountId(
              tx,
              VAT_PAYABLE_CODE,
            ),

          debit:
            sale.tax,

          credit:
            new Prisma.Decimal(
              0,
            ),
        });
      }

      // ======================================================
      // REVERSE PAYMENT JOURNAL LINES
      // ======================================================

      for (
        const payment of sale.payments
      ) {
        reversalLines.push({
          accountId:
            await getPaymentChartAccountId(
              tx,
              payment.method,
              payment.accountId,
            ),

          paymentAccountId:
            paymentAccountIdFor(
              payment.method,
              payment.accountId,
            ),

          debit:
            new Prisma.Decimal(
              0,
            ),

          credit:
            payment.amount,
        });
      }

      // ======================================================
      // REVERSE ACTUAL ACCOUNT BALANCES
      // ======================================================

      for (
        const payment of sale.payments
      ) {
        if (
          payment.method ===
            "CASH" ||
          payment.accountId ===
            null
        ) {
          continue;
        }

        await tx.account.update({
          where: {
            id:
              payment.accountId,
          },

          data: {
            currentBalance: {
              decrement:
                payment.amount,
            },
          },
        });
      }

      // ======================================================
      // REVERSE ACCOUNTS RECEIVABLE
      // ======================================================

      if (
        sale.dueAmount.gt(0)
      ) {
        reversalLines.push({
          accountId:
            accountsReceivableAccountId,

          debit:
            new Prisma.Decimal(
              0,
            ),

          credit:
            sale.dueAmount,
        });
      }

      // ======================================================
      // REVERSE COGS / INVENTORY
      // ======================================================

      const inventoryCost =
        sale.items.reduce(
          (
            total,
            item,
          ) =>
            total.add(
              item.stockBatch.purchasePrice.mul(
                item.quantity,
              ),
            ),

          new Prisma.Decimal(
            0,
          ),
        );

      if (
        inventoryCost.gt(0)
      ) {
        reversalLines.push(
          {
            accountId:
              inventoryAccountId,

            debit:
              inventoryCost,

            credit:
              new Prisma.Decimal(
                0,
              ),
          },

          {
            accountId:
              cogsAccountId,

            debit:
              new Prisma.Decimal(
                0,
              ),

            credit:
              inventoryCost,
          },
        );
      }

      // ======================================================
      // CREATE REVERSAL JOURNAL
      // ======================================================

      await tx.journalEntry.create({
        data: {
          date:
            new Date(),

          reference:
            `CANCEL-${sale.invoiceNumber}`,

          description:
            `Cancelled sale ${sale.invoiceNumber}`,

          saleId:
            sale.id,

          lines: {
            create:
              reversalLines.map(
                (
                  line,
                ) => ({
                  accountId:
                    line.accountId,

                  paymentAccountId:
                    line.paymentAccountId ?? null,

                  debit:
                    line.debit,

                  credit:
                    line.credit,
                }),
              ),
          },
        },
      });

      // ======================================================
      // UPDATE SALE STATUS
      // ======================================================

      return tx.sale.update({
        where: {
          id:
            saleId,
        },

        data: {
          status:
            "CANCELLED",
        },

        include: {
          // ==================================================
          // CUSTOMER
          // ==================================================

          customer: true,

          user: true,

          items: {
            include: {
              product: true,
              stockBatch: true,
              returnItems: true,
            },
          },

          payments: true,
        },
      });
    },
  );
}