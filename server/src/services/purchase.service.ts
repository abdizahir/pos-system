import { prisma } from "../db/prisma.js";
import {
  isMobileAccountType,
  RECORD_ONLY_CHART_CODE,
} from "../utils/payment-accounts.js";
import { purchaseRepository } from "../repositories/purchase.repository.js";
import { Prisma } from "../../generated/prisma/client.js";

type PurchaseItemInput = {
  productId: number;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  discount?: number;
  tax?: number;
  expiryDate?: string | null;
};

type CreatePurchaseInput = {
  supplierId: number;
  userId: number;
  discount?: number;
  tax?: number;
  paidAmount?: number;
  paymentMethod?:
    | "CASH"
    | "CARD"
    | "MOBILE"
    | "BANK";
  accountId?: number | null;
  notes?: string;
  items: PurchaseItemInput[];
};

type UpdatePurchaseInput = {
  supplierId?: number;
  discount?: number;
  tax?: number;
  paidAmount?: number;
  paymentMethod?:
    | "CASH"
    | "CARD"
    | "MOBILE"
    | "BANK"
    | null;
  accountId?: number | null;
  notes?: string;
  items?: PurchaseItemInput[];
};

const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "MOBILE",
  "BANK",
] as const;

type PaymentMethod =
  (typeof PAYMENT_METHODS)[number];

const isPaymentMethod = (
  value: string,
): value is PaymentMethod => {
  return PAYMENT_METHODS.includes(
    value as PaymentMethod,
  );
};

// ============================================================
// STOCK CACHE
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
    await recalcProductStockCache(tx, productId);
  }
}

// ============================================================
// PRODUCT SELLING PRICE
// ============================================================

async function updateProductSellingPrices(
  tx: Prisma.TransactionClient,
  items: PurchaseItemInput[],
) {
  for (const item of items) {
    if (item.sellingPrice === undefined) {
      continue;
    }

    await tx.product.update({
      where: {
        id: item.productId,
      },
      data: {
        sellingPrice: item.sellingPrice,
      },
    });
  }
}

// ============================================================
// GET CHART ACCOUNT
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

async function getPaymentChartAccountId(
  tx: Prisma.TransactionClient,
  _paymentMethod: PaymentMethod,
  _accountId?: number | null,
) {
  // Record-only: every outgoing payment is booked against
  // Owner's Capital, whatever the method, so no account goes down.
  return getChartAccountId(tx, RECORD_ONLY_CHART_CODE);
}

async function validateActualPaymentAccount(
  tx: Prisma.TransactionClient,
  paidAmount: number,
  paymentMethod:
    | PaymentMethod
    | null
    | undefined,
  accountId: number | null | undefined,
) {
  if (paidAmount <= 0) {
    return {
      paymentMethod: null,
      accountId: null,
    };
  }

  // Record-only: a paid amount without a method is booked as cash
  if (
    paymentMethod === undefined ||
    paymentMethod === null
  ) {
    return {
      paymentMethod: "CASH" as const,
      accountId: null,
    };
  }

  if (
    paymentMethod === "CASH"
  ) {
    if (
      accountId !== undefined &&
      accountId !== null
    ) {
      throw new Error(
        "Cash payment cannot have an account",
      );
    }

    return {
      paymentMethod,
      accountId: null,
    };
  }

  if (
    typeof accountId !== "number" ||
    !Number.isInteger(accountId) ||
    accountId <= 0
  ) {
    throw new Error(
      `${
        paymentMethod === "MOBILE"
          ? "Mobile"
          : paymentMethod
      } payment requires a valid account`,
    );
  }

  const account =
    await tx.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        type: true,
        status: true,
      },
    });

  if (!account) {
    throw new Error(
      "Selected account not found",
    );
  }

  if (
    account.status !== "ACTIVE"
  ) {
    throw new Error(
      "Selected account is inactive",
    );
  }

  if (
    (paymentMethod === "BANK" ||
      paymentMethod === "CARD") &&
    account.type !== "BANK"
  ) {
    throw new Error(
      `${paymentMethod} payment must use a bank account`,
    );
  }

  if (
    paymentMethod === "MOBILE" &&
    !isMobileAccountType(account.type)
  ) {
    throw new Error(
      "Mobile payment must use a wallet or merchant account",
    );
  }

  return {
    paymentMethod,
    accountId: account.id,
  };
}

async function updateActualAccountBalance(
  _tx: Prisma.TransactionClient,
  _paymentMethod: PaymentMethod | null,
  _accountId: number | null,
  _amount: number | Prisma.Decimal,
  _direction: "increment" | "decrement",
) {
  // Record-only: purchases, supplier payments and expenses never
  // change an account's balance, so there is nothing to update.
}

// ============================================================
// CREATE PURCHASE JOURNAL
// ============================================================

async function createPurchaseJournal(
  tx: Prisma.TransactionClient,
  purchase: {
    id: number;
    reference: string;
    createdAt: Date;
    total: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    dueAmount: Prisma.Decimal;
    paymentMethod: PaymentMethod | null;
    accountId: number | null;
  },
) {
  // ----------------------------------------------------------
  // CHART ACCOUNTS
  // ----------------------------------------------------------

  const inventoryAccountId =
    await getChartAccountId(
      tx,
      "1100",
    );

  const accountsPayableAccountId =
    await getChartAccountId(
      tx,
      "2000",
    );

  // ----------------------------------------------------------
  // AMOUNTS
  // ----------------------------------------------------------

  const total = Number(
    purchase.total,
  );

  const paidAmount = Number(
    purchase.paidAmount,
  );

  const dueAmount = Number(
    purchase.dueAmount,
  );

  // ----------------------------------------------------------
  // JOURNAL LINES
  // ----------------------------------------------------------

  const journalLines: {
    accountId: number;
    paymentAccountId?: number | null;
    debit: number;
    credit: number;
  }[] = [];

  // INVENTORY
  if (total > 0) {
    journalLines.push({
      accountId:
        inventoryAccountId,
      debit: total,
      credit: 0,
    });
  }

  // CASH
  if (paidAmount > 0) {
    if (
      purchase.paymentMethod === null
    ) {
      throw new Error(
        "Purchase payment method is required when paid amount is greater than 0",
      );
    }

    const paymentAccountId =
      await getPaymentChartAccountId(
        tx,
        purchase.paymentMethod,
        purchase.accountId,
      );

    journalLines.push({
      accountId:
        paymentAccountId,
      paymentAccountId: null,
      debit: 0,
      credit: paidAmount,
    });
  }

  // ACCOUNTS PAYABLE
  if (dueAmount > 0) {
    journalLines.push({
      accountId:
        accountsPayableAccountId,
      debit: 0,
      credit: dueAmount,
    });
  }

  // ----------------------------------------------------------
  // VERIFY BALANCE
  // ----------------------------------------------------------

  const totalDebit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.debit,
      0,
    );

  const totalCredit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.credit,
      0,
    );

  if (
    Math.abs(
      totalDebit -
        totalCredit,
    ) > 0.01
  ) {
    throw new Error(
      `Purchase journal is not balanced. Debit: ${totalDebit.toFixed(
        2,
      )}, Credit: ${totalCredit.toFixed(2)}`,
    );
  }

  // ----------------------------------------------------------
  // CREATE JOURNAL
  // ----------------------------------------------------------

  await tx.journalEntry.create({
    data: {
      date: purchase.createdAt,
      reference:
        purchase.reference,
      description:
        `Purchase ${purchase.reference}`,
      purchaseId:
        purchase.id,

      lines: {
        create:
          journalLines.map(
            (line) => ({
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
}

// ============================================================
// CREATE PURCHASE REVERSAL JOURNAL
// ============================================================

async function createPurchaseReversalJournal(
  tx: Prisma.TransactionClient,
  purchase: {
    id: number;
    reference: string;
    total: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    dueAmount: Prisma.Decimal;
    paymentMethod: PaymentMethod | null;
    accountId: number | null;
  },
) {
  const inventoryAccountId =
    await getChartAccountId(
      tx,
      "1100",
    );

  const accountsPayableAccountId =
    await getChartAccountId(
      tx,
      "2000",
    );

  const total = Number(
    purchase.total,
  );

  const paidAmount = Number(
    purchase.paidAmount,
  );

  const dueAmount = Number(
    purchase.dueAmount,
  );

  const journalLines: {
    accountId: number;
    paymentAccountId?: number | null;
    debit: number;
    credit: number;
  }[] = [];

  // RETURN CASH
  if (paidAmount > 0) {
    if (
      purchase.paymentMethod === null
    ) {
      throw new Error(
        "Purchase payment method is required when paid amount is greater than 0",
      );
    }

    const paymentAccountId =
      await getPaymentChartAccountId(
        tx,
        purchase.paymentMethod,
        purchase.accountId,
      );

    journalLines.push({
      accountId:
        paymentAccountId,
      paymentAccountId: null,
      debit: paidAmount,
      credit: 0,
    });
  }

  // REDUCE SUPPLIER PAYABLE
  if (dueAmount > 0) {
    journalLines.push({
      accountId:
        accountsPayableAccountId,
      debit: dueAmount,
      credit: 0,
    });
  }

  // REDUCE INVENTORY
  if (total > 0) {
    journalLines.push({
      accountId:
        inventoryAccountId,
      debit: 0,
      credit: total,
    });
  }

  const totalDebit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.debit,
      0,
    );

  const totalCredit =
    journalLines.reduce(
      (sum, line) =>
        sum + line.credit,
      0,
    );

  if (
    Math.abs(
      totalDebit -
        totalCredit,
    ) > 0.01
  ) {
    throw new Error(
      `Purchase reversal journal is not balanced. Debit: ${totalDebit.toFixed(
        2,
      )}, Credit: ${totalCredit.toFixed(2)}`,
    );
  }

  await tx.journalEntry.create({
    data: {
      date: new Date(),
      reference:
        `${purchase.reference}-CANCELLED`,
      description:
        `Cancelled purchase ${purchase.reference}`,
      purchaseId:
        purchase.id,

      lines: {
        create:
          journalLines.map(
            (line) => ({
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
}

// ============================================================
// PURCHASE SERVICE
// ============================================================

export const purchaseService = {
  // ==========================================================
  // GET ALL PURCHASES
  // ==========================================================

  async getPurchases() {
    return purchaseRepository.findAll();
  },

  // ==========================================================
  // GET PURCHASE BY ID
  // ==========================================================

  async getPurchaseById(id: number) {
    const purchase =
      await purchaseRepository.findById(
        id,
      );

    if (!purchase) {
      throw new Error(
        "Purchase not found",
      );
    }

    return purchase;
  },

  // ==========================================================
  // CREATE PURCHASE
  // ==========================================================

  async createPurchase(
    data: CreatePurchaseInput,
  ) {
    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (
      !data.items ||
      data.items.length === 0
    ) {
      throw new Error(
        "At least one product is required",
      );
    }

    if (!data.supplierId) {
      throw new Error(
        "Supplier is required",
      );
    }

    if (!data.userId) {
      throw new Error(
        "User is required",
      );
    }

    // --------------------------------------------------------
    // SUPPLIER
    // --------------------------------------------------------

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id: data.supplierId,
        },
      });

    if (!supplier) {
      throw new Error(
        "Supplier not found",
      );
    }

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const user =
      await prisma.user.findUnique({
        where: {
          id: data.userId,
        },
      });

    if (!user) {
      throw new Error(
        "User not found",
      );
    }

    // --------------------------------------------------------
    // VALIDATE ITEMS
    // --------------------------------------------------------

    for (const item of data.items) {
      if (!item.productId) {
        throw new Error(
          "Product is required",
        );
      }

      if (
        !Number.isInteger(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Quantity must be greater than 0",
        );
      }

      if (
        !Number.isFinite(
          item.purchasePrice,
        ) ||
        item.purchasePrice < 0
      ) {
        throw new Error(
          "Purchase price cannot be negative",
        );
      }

      if (
        !Number.isFinite(
          item.discount ?? 0,
        ) ||
        (item.discount ?? 0) < 0
      ) {
        throw new Error(
          "Item discount cannot be negative",
        );
      }

      if (
        !Number.isFinite(
          item.tax ?? 0,
        ) ||
        (item.tax ?? 0) < 0
      ) {
        throw new Error(
          "Item tax cannot be negative",
        );
      }

      if (item.expiryDate) {
        const expiryDate =
          new Date(
            item.expiryDate,
          );

        if (
          Number.isNaN(
            expiryDate.getTime(),
          )
        ) {
          throw new Error(
            "Invalid expiry date",
          );
        }
      }
    }

    // --------------------------------------------------------
    // CHECK PRODUCTS
    // --------------------------------------------------------

    const productIds =
      data.items.map(
        (item) =>
          item.productId,
      );

    const uniqueProductIds = [
      ...new Set(productIds),
    ];

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: uniqueProductIds,
          },
        },
      });

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      throw new Error(
        "One or more products were not found",
      );
    }

    // --------------------------------------------------------
    // CALCULATE ITEMS
    // --------------------------------------------------------

    const calculatedItems =
      data.items.map(
        (item) => {
          const grossAmount =
            item.quantity *
            item.purchasePrice;

          const itemDiscount =
            item.discount ?? 0;

          const itemTax =
            item.tax ?? 0;

          const lineTotal =
            grossAmount -
            itemDiscount +
            itemTax;

          if (
            lineTotal < 0
          ) {
            throw new Error(
              "Item total cannot be negative",
            );
          }

          return {
            ...item,
            discount:
              itemDiscount,
            tax: itemTax,
            lineTotal,
          };
        },
      );

    // --------------------------------------------------------
    // SUBTOTAL
    // --------------------------------------------------------

    const subtotal =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.purchasePrice,
        0,
      );

    // --------------------------------------------------------
    // ITEM DISCOUNT
    // --------------------------------------------------------

    const itemDiscount =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          item.discount,
        0,
      );

    // --------------------------------------------------------
    // ITEM TAX
    // --------------------------------------------------------

    const itemTax =
      calculatedItems.reduce(
        (sum, item) =>
          sum + item.tax,
        0,
      );

    // --------------------------------------------------------
    // PURCHASE DISCOUNT / TAX
    // --------------------------------------------------------

    const purchaseDiscount =
      data.discount ?? 0;

    const purchaseTax =
      data.tax ?? 0;

    if (
      !Number.isFinite(
        purchaseDiscount,
      ) ||
      purchaseDiscount < 0
    ) {
      throw new Error(
        "Purchase discount cannot be negative",
      );
    }

    if (
      !Number.isFinite(
        purchaseTax,
      ) ||
      purchaseTax < 0
    ) {
      throw new Error(
        "Purchase tax cannot be negative",
      );
    }

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    const totalDiscount =
      itemDiscount +
      purchaseDiscount;

    const totalTax =
      itemTax +
      purchaseTax;

    const total =
      subtotal -
        totalDiscount +
        totalTax;

    if (total < 0) {
      throw new Error(
        "Purchase total cannot be negative",
      );
    }

    // --------------------------------------------------------
    // PAID / DUE
    // --------------------------------------------------------

    const paidAmount =
      data.paidAmount ?? 0;

    if (
      !Number.isFinite(
        paidAmount,
      ) ||
      paidAmount < 0
    ) {
      throw new Error(
        "Paid amount cannot be negative",
      );
    }

    // Purchases are paid in full: paid = quantity × price (− discount + tax)
    if (
      Math.abs(paidAmount - total) > 0.005
    ) {
      throw new Error(
        `Paid amount must equal the purchase total (ETB ${total.toFixed(2)}).`,
      );
    }

    const dueAmount =
      total - paidAmount;

    if (
      data.paymentMethod !==
        undefined &&
      !isPaymentMethod(
        data.paymentMethod,
      )
    ) {
      throw new Error(
        "Invalid payment method",
      );
    }

    // --------------------------------------------------------
    // REFERENCE
    // --------------------------------------------------------

    const reference =
      `PUR-${Date.now()}`;

    // ========================================================
    // DATABASE TRANSACTION
    // ========================================================

    return prisma.$transaction(
      async (tx) => {
        const payment =
          await validateActualPaymentAccount(
            tx,
            paidAmount,
            data.paymentMethod,
            data.accountId,
          );

        // ------------------------------------------------------
        // CREATE PURCHASE
        // ------------------------------------------------------

        const purchase =
          await tx.purchase.create({
            data: {
              reference,

              supplier: {
                connect: {
                  id: data.supplierId,
                },
              },

              user: {
                connect: {
                  id: data.userId,
                },
              },

              subtotal:
                new Prisma.Decimal(
                  subtotal,
                ),

              discount:
                new Prisma.Decimal(
                  totalDiscount,
                ),

              tax:
                new Prisma.Decimal(
                  totalTax,
                ),

              total:
                new Prisma.Decimal(
                  total,
                ),

              paidAmount:
                new Prisma.Decimal(
                  paidAmount,
                ),

              dueAmount:
                new Prisma.Decimal(
                  dueAmount,
                ),

              status:
                "COMPLETED",

              ...(data.notes !==
                undefined && {
                notes: data.notes,
              }),

              ...(payment.paymentMethod !==
                null && {
                paymentMethod:
                  payment.paymentMethod,
              }),

              ...(payment.accountId !==
                null && {
                account: {
                  connect: {
                    id:
                      payment.accountId,
                  },
                },
              }),
            },
          });

        // ------------------------------------------------------
        // STOCK
        // ------------------------------------------------------

        const affectedProductIds: number[] =
          [];

        for (
          const item of calculatedItems
        ) {
          // CREATE STOCK BATCH
          const stockBatch =
            await tx.stockBatch.create({
              data: {
                product: {
                  connect: {
                    id: item.productId,
                  },
                },

                user: {
                  connect: {
                    id: data.userId,
                  },
                },

                supplier: {
                  connect: {
                    id: data.supplierId,
                  },
                },

                purchase: {
                  connect: {
                    id: purchase.id,
                  },
                },

                quantity:
                  item.quantity,

                purchasePrice:
                  new Prisma.Decimal(
                    item.purchasePrice,
                  ),

                ...(item.expiryDate
                  ? {
                      expiryDate:
                        new Date(
                          item.expiryDate,
                        ),
                    }
                  : {}),
              },
            });

          // CREATE PURCHASE ITEM
          await tx.purchaseItem.create({
            data: {
              purchase: {
                connect: {
                  id: purchase.id,
                },
              },

              product: {
                connect: {
                  id: item.productId,
                },
              },

              stockBatch: {
                connect: {
                  id: stockBatch.id,
                },
              },

              quantity:
                item.quantity,

              purchasePrice:
                new Prisma.Decimal(
                  item.purchasePrice,
                ),

              discount:
                new Prisma.Decimal(
                  item.discount,
                ),

              tax:
                new Prisma.Decimal(
                  item.tax,
                ),

              lineTotal:
                new Prisma.Decimal(
                  item.lineTotal,
                ),
            },
          });

          // STOCK MOVEMENT
          await tx.stockMovement.create({
            data: {
              product: {
                connect: {
                  id: item.productId,
                },
              },

              user: {
                connect: {
                  id: data.userId,
                },
              },

              stockBatch: {
                connect: {
                  id: stockBatch.id,
                },
              },

              type: "PURCHASE",

              quantity:
                item.quantity,

              notes:
                `Purchase ${reference}`,
            },
          });

          affectedProductIds.push(
            item.productId,
          );
        }

        // ------------------------------------------------------
        // UPDATE PRODUCT STOCK CACHE
        // ------------------------------------------------------

        await recalcManyProductStockCache(
          tx,
          affectedProductIds,
        );

        // ------------------------------------------------------
        // UPDATE PRODUCT SELLING PRICE
        // ------------------------------------------------------

        await updateProductSellingPrices(
          tx,
          data.items,
        );

        // ------------------------------------------------------
        // ACCOUNTING
        // ------------------------------------------------------

        await createPurchaseJournal(
          tx,
          purchase,
        );

        // ------------------------------------------------------
        // UPDATE ACTUAL PAYMENT ACCOUNT BALANCE
        // ------------------------------------------------------

        await updateActualAccountBalance(
          tx,
          payment.paymentMethod,
          payment.accountId,
          purchase.paidAmount,
          "decrement",
        );

        // ------------------------------------------------------
        // RETURN PURCHASE
        // ------------------------------------------------------

        return tx.purchase.findUnique({
          where: {
            id: purchase.id,
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
    );
  },

  // ==========================================================
  // UPDATE PURCHASE
  // ==========================================================

  async updatePurchase(
    id: number,
    data: UpdatePurchaseInput,
  ) {
    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
          stockBatches: true,
        },
      });

    if (!existingPurchase) {
      throw new Error(
        "Purchase not found",
      );
    }

    if (
      existingPurchase.status ===
      "CANCELLED"
    ) {
      throw new Error(
        "Cancelled purchase cannot be updated",
      );
    }

    // ========================================================
    // UPDATE WITHOUT CHANGING ITEMS
    // ========================================================

    if (data.items === undefined) {
      const updateData: {
        supplierId?: number;
        discount?: number;
        tax?: number;
        paidAmount?: number;
        dueAmount?: number;
        paymentMethod?: PaymentMethod | null;
        accountId?: number | null;
        notes?: string;
      } = {};

      if (
        data.supplierId !==
        undefined
      ) {
        const supplier =
          await prisma.supplier.findUnique({
            where: {
              id: data.supplierId,
            },
          });

        if (!supplier) {
          throw new Error(
            "Supplier not found",
          );
        }

        updateData.supplierId =
          data.supplierId;
      }

      if (
        data.discount !==
        undefined
      ) {
        if (
          !Number.isFinite(
            data.discount,
          ) ||
          data.discount < 0
        ) {
          throw new Error(
            "Purchase discount cannot be negative",
          );
        }

        updateData.discount =
          data.discount;
      }

      if (
        data.tax !==
        undefined
      ) {
        if (
          !Number.isFinite(
            data.tax,
          ) ||
          data.tax < 0
        ) {
          throw new Error(
            "Purchase tax cannot be negative",
          );
        }

        updateData.tax =
          data.tax;
      }

      if (
        data.paidAmount !==
        undefined
      ) {
        if (
          !Number.isFinite(
            data.paidAmount,
          ) ||
          data.paidAmount < 0
        ) {
          throw new Error(
            "Paid amount cannot be negative",
          );
        }

        const newTotal =
          Number(
            existingPurchase.total,
          );

        // Purchases are paid in full
        if (
          Math.abs(data.paidAmount - newTotal) > 0.005
        ) {
          throw new Error(
            `Paid amount must equal the purchase total (ETB ${newTotal.toFixed(2)}).`,
          );
        }

        updateData.paidAmount =
          data.paidAmount;

        updateData.dueAmount =
          newTotal -
          data.paidAmount;
      }

      if (
        data.paymentMethod !==
        undefined
      ) {
        if (
          data.paymentMethod !==
            null &&
          !isPaymentMethod(
            data.paymentMethod,
          )
        ) {
          throw new Error(
            "Invalid payment method",
          );
        }

        updateData.paymentMethod =
          data.paymentMethod;
      }

      if (
        data.accountId !==
        undefined
      ) {
        updateData.accountId =
          data.accountId;
      }

      if (
        data.notes !==
        undefined
      ) {
        updateData.notes =
          data.notes;
      }

      return prisma.$transaction(
        async (tx) => {
          const nextPaidAmount =
            updateData.paidAmount ??
            Number(
              existingPurchase.paidAmount,
            );

          const nextPayment =
            await validateActualPaymentAccount(
              tx,
              nextPaidAmount,
              updateData.paymentMethod ??
                existingPurchase.paymentMethod,
              updateData.accountId !==
                undefined
                ? updateData.accountId
                : existingPurchase.accountId,
            );

            updateData.paymentMethod =
                nextPayment.paymentMethod;
            updateData.accountId =
                nextPayment.accountId;

            await updateActualAccountBalance(
                tx,
            existingPurchase.paymentMethod,
            existingPurchase.accountId,
            existingPurchase.paidAmount,
            "increment",
          );

          // UPDATE PURCHASE
          const updatedPurchase =
            await tx.purchase.update({
              where: {
                id,
              },

              data: updateData,
            });

          if (
            updatedPurchase.paymentMethod !==
              nextPayment.paymentMethod ||
            updatedPurchase.accountId !==
              nextPayment.accountId
          ) {
            throw new Error(
              "Purchase payment data was not saved correctly",
            );
          }

          // DELETE OLD JOURNAL
          await tx.journalEntry.deleteMany({
            where: {
              purchaseId: id,
            },
          });

          // CREATE NEW JOURNAL
          await createPurchaseJournal(
            tx,
            updatedPurchase,
          );

          await updateActualAccountBalance(
            tx,
            nextPayment.paymentMethod,
            nextPayment.accountId,
            updatedPurchase.paidAmount,
            "decrement",
          );

          return tx.purchase.findUnique({
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
      );
    }

    // ========================================================
    // UPDATE WITH ITEMS
    // ========================================================

    if (data.items.length === 0) {
      throw new Error(
        "At least one product is required",
      );
    }

    // --------------------------------------------------------
    // VALIDATE ITEMS
    // --------------------------------------------------------

    for (
      const item of data.items
    ) {
      if (!item.productId) {
        throw new Error(
          "Product is required",
        );
      }

      if (
        !Number.isInteger(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Quantity must be greater than 0",
        );
      }

      if (
        !Number.isFinite(
          item.purchasePrice,
        ) ||
        item.purchasePrice < 0
      ) {
        throw new Error(
          "Purchase price cannot be negative",
        );
      }

      if (
        !Number.isFinite(
          item.discount ?? 0,
        ) ||
        (item.discount ?? 0) < 0
      ) {
        throw new Error(
          "Item discount cannot be negative",
        );
      }

      if (
        !Number.isFinite(
          item.tax ?? 0,
        ) ||
        (item.tax ?? 0) < 0
      ) {
        throw new Error(
          "Item tax cannot be negative",
        );
      }

      if (item.expiryDate) {
        const expiryDate =
          new Date(
            item.expiryDate,
          );

        if (
          Number.isNaN(
            expiryDate.getTime(),
          )
        ) {
          throw new Error(
            "Invalid expiry date",
          );
        }
      }
    }

    // --------------------------------------------------------
    // CHECK PRODUCTS
    // --------------------------------------------------------

    const productIds =
      data.items.map(
        (item) =>
          item.productId,
      );

    const uniqueProductIds = [
      ...new Set(productIds),
    ];

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: uniqueProductIds,
          },
        },
      });

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      throw new Error(
        "One or more products were not found",
      );
    }

    // --------------------------------------------------------
    // CALCULATE ITEMS
    // --------------------------------------------------------

    const calculatedItems =
      data.items.map(
        (item) => {
          const itemDiscount =
            item.discount ?? 0;

          const itemTax =
            item.tax ?? 0;

          const lineTotal =
            item.quantity *
              item.purchasePrice -
            itemDiscount +
            itemTax;

          if (
            lineTotal < 0
          ) {
            throw new Error(
              "Item total cannot be negative",
            );
          }

          return {
            ...item,
            discount:
              itemDiscount,
            tax: itemTax,
            lineTotal,
          };
        },
      );

    const subtotal =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.purchasePrice,
        0,
      );

    const itemDiscount =
      calculatedItems.reduce(
        (sum, item) =>
          sum +
          item.discount,
        0,
      );

    const itemTax =
      calculatedItems.reduce(
        (sum, item) =>
          sum + item.tax,
        0,
      );

    const purchaseDiscount =
      data.discount ?? 0;

    const purchaseTax =
      data.tax ?? 0;

    if (
      !Number.isFinite(
        purchaseDiscount,
      ) ||
      purchaseDiscount < 0
    ) {
      throw new Error(
        "Purchase discount cannot be negative",
      );
    }

    if (
      !Number.isFinite(
        purchaseTax,
      ) ||
      purchaseTax < 0
    ) {
      throw new Error(
        "Purchase tax cannot be negative",
      );
    }

    const totalDiscount =
      itemDiscount +
      purchaseDiscount;

    const totalTax =
      itemTax +
      purchaseTax;

    const total =
      subtotal -
        totalDiscount +
        totalTax;

    if (total < 0) {
      throw new Error(
        "Purchase total cannot be negative",
      );
    }

    const paidAmount =
      data.paidAmount ??
      Number(
        existingPurchase.paidAmount,
      );

    if (
      !Number.isFinite(
        paidAmount,
      ) ||
      paidAmount < 0
    ) {
      throw new Error(
        "Paid amount cannot be negative",
      );
    }

    // Purchases are paid in full: paid = quantity × price (− discount + tax)
    if (
      Math.abs(paidAmount - total) > 0.005
    ) {
      throw new Error(
        `Paid amount must equal the purchase total (ETB ${total.toFixed(2)}).`,
      );
    }

    const dueAmount =
      total - paidAmount;

    if (
      data.paymentMethod !==
        undefined &&
      data.paymentMethod !==
        null &&
      !isPaymentMethod(
        data.paymentMethod,
      )
    ) {
      throw new Error(
        "Invalid payment method",
      );
    }

    // ========================================================
    // DATABASE TRANSACTION
    // ========================================================

    return prisma.$transaction(
      async (tx) => {
        const nextPayment =
          await validateActualPaymentAccount(
            tx,
            paidAmount,
            data.paymentMethod ??
              existingPurchase.paymentMethod,
            data.accountId !== undefined
              ? data.accountId
              : existingPurchase.accountId,
          );

        await updateActualAccountBalance(
          tx,
          existingPurchase.paymentMethod,
          existingPurchase.accountId,
          existingPurchase.paidAmount,
          "increment",
        );

        // ------------------------------------------------------
        // CHECK IF OLD BATCHES WERE SOLD
        // ------------------------------------------------------

        const oldBatchIds =
          existingPurchase.stockBatches.map(
            (batch) =>
              batch.id,
          );

        if (
          oldBatchIds.length > 0
        ) {
          const saleRefs =
            await tx.saleItem.count({
              where: {
                stockBatchId: {
                  in: oldBatchIds,
                },
              },
            });

          if (
            saleRefs > 0
          ) {
            throw new Error(
              "Cannot update purchase because one or more purchase batches are already used in sales",
            );
          }
        }

        // ------------------------------------------------------
        // DELETE OLD PURCHASE STOCK MOVEMENTS
        // ------------------------------------------------------

        if (
          oldBatchIds.length > 0
        ) {
          await tx.stockMovement.deleteMany({
            where: {
              stockBatchId: {
                in: oldBatchIds,
              },

              type: "PURCHASE",
            },
          });
        }

        // ------------------------------------------------------
        // DELETE OLD PURCHASE ITEMS
        // ------------------------------------------------------

        await tx.purchaseItem.deleteMany({
          where: {
            purchaseId: id,
          },
        });

        // ------------------------------------------------------
        // DELETE OLD STOCK BATCHES
        // ------------------------------------------------------

        if (
          oldBatchIds.length > 0
        ) {
          await tx.stockBatch.deleteMany({
            where: {
              purchaseId: id,
            },
          });
        }

        // ------------------------------------------------------
        // DELETE OLD JOURNAL
        // ------------------------------------------------------

        await tx.journalEntry.deleteMany({
          where: {
            purchaseId: id,
          },
        });

        // ------------------------------------------------------
        // UPDATE PURCHASE
        // ------------------------------------------------------

        const updatedPurchase =
          await tx.purchase.update({
            where: {
              id,
            },

            data: {
              ...(data.supplierId !==
                undefined && {
                supplierId:
                  data.supplierId,
              }),

              subtotal:
                new Prisma.Decimal(
                  subtotal,
                ),

              discount:
                new Prisma.Decimal(
                  totalDiscount,
                ),

              tax:
                new Prisma.Decimal(
                  totalTax,
                ),

              total:
                new Prisma.Decimal(
                  total,
                ),

              paidAmount:
                new Prisma.Decimal(
                  paidAmount,
                ),

              dueAmount:
                new Prisma.Decimal(
                  dueAmount,
                ),

              paymentMethod:
                nextPayment.paymentMethod,

              accountId:
                nextPayment.accountId,

              ...(data.notes !==
                undefined && {
                notes:
                  data.notes,
              }),
            },
          });

        // ------------------------------------------------------
        // AFFECTED PRODUCTS
        // ------------------------------------------------------

        const affectedProductIds: number[] =
          [
            ...existingPurchase.items.map(
              (item) =>
                item.productId,
            ),
          ];

        // ------------------------------------------------------
        // CREATE NEW STOCK
        // ------------------------------------------------------

        for (
          const item of calculatedItems
        ) {
          const stockBatch =
            await tx.stockBatch.create({
              data: {
                product: {
                  connect: {
                    id: item.productId,
                  },
                },

                user: {
                  connect: {
                    id:
                      existingPurchase.userId,
                  },
                },

                supplier: {
                  connect: {
                    id:
                      data.supplierId ??
                      existingPurchase.supplierId,
                  },
                },

                purchase: {
                  connect: {
                    id,
                  },
                },

                quantity:
                  item.quantity,

                purchasePrice:
                  new Prisma.Decimal(
                    item.purchasePrice,
                  ),

                ...(item.expiryDate
                  ? {
                      expiryDate:
                        new Date(
                          item.expiryDate,
                        ),
                    }
                  : {}),
              },
            });

          // PURCHASE ITEM
          await tx.purchaseItem.create({
            data: {
              purchase: {
                connect: {
                  id,
                },
              },

              product: {
                connect: {
                  id: item.productId,
                },
              },

              stockBatch: {
                connect: {
                  id:
                    stockBatch.id,
                },
              },

              quantity:
                item.quantity,

              purchasePrice:
                new Prisma.Decimal(
                  item.purchasePrice,
                ),

              discount:
                new Prisma.Decimal(
                  item.discount,
                ),

              tax:
                new Prisma.Decimal(
                  item.tax,
                ),

              lineTotal:
                new Prisma.Decimal(
                  item.lineTotal,
                ),
            },
          });

          // STOCK MOVEMENT
          await tx.stockMovement.create({
            data: {
              product: {
                connect: {
                  id: item.productId,
                },
              },

              user: {
                connect: {
                  id:
                    existingPurchase.userId,
                },
              },

              stockBatch: {
                connect: {
                  id:
                    stockBatch.id,
                },
              },

              type: "PURCHASE",

              quantity:
                item.quantity,

              notes:
                `Purchase ${existingPurchase.reference} updated`,
            },
          });

          affectedProductIds.push(
            item.productId,
          );
        }

        // ------------------------------------------------------
        // RECALCULATE STOCK
        // ------------------------------------------------------

        await recalcManyProductStockCache(
          tx,
          affectedProductIds,
        );

        // ------------------------------------------------------
        // UPDATE PRODUCT SELLING PRICE
        // ------------------------------------------------------

        await updateProductSellingPrices(
          tx,
          data.items ?? [],
        );

        // ------------------------------------------------------
        // CREATE NEW ACCOUNTING
        // ------------------------------------------------------

        await createPurchaseJournal(
          tx,
          updatedPurchase,
        );

        await updateActualAccountBalance(
          tx,
          nextPayment.paymentMethod,
          nextPayment.accountId,
          updatedPurchase.paidAmount,
          "decrement",
        );

        // ------------------------------------------------------
        // RETURN UPDATED PURCHASE
        // ------------------------------------------------------

        return tx.purchase.findUnique({
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
    );
  },

  // ==========================================================
  // CANCEL PURCHASE
  // ==========================================================

  async cancelPurchase(
    id: number,
  ) {
    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
          stockBatches: true,
        },
      });

    if (!purchase) {
      throw new Error(
        "Purchase not found",
      );
    }

    if (
      purchase.status ===
      "CANCELLED"
    ) {
      throw new Error(
        "Purchase is already cancelled",
      );
    }

    return prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // FIND STOCK
        // ------------------------------------------------------

        const affectedProductIds: number[] =
          [];

        const batchIds =
          purchase.items
            .map(
              (item) =>
                item.stockBatchId,
            )
            .filter(
              (
                id,
              ): id is number =>
                id !== null &&
                id !== undefined,
            );

        const batches =
          batchIds.length
            ? await tx.stockBatch.findMany({
                where: {
                  id: {
                    in: batchIds,
                  },
                },

                select: {
                  id: true,
                  quantity: true,
                },
              })
            : [];

        const batchMap =
          new Map(
            batches.map(
              (batch) => [
                batch.id,
                batch,
              ],
            ),
          );

        // ------------------------------------------------------
        // REMOVE PURCHASE STOCK
        // ------------------------------------------------------

        for (
          const item of purchase.items
        ) {
          if (
            item.stockBatchId !==
              null &&
            item.stockBatchId !==
              undefined
          ) {
            const batch =
              batchMap.get(
                item.stockBatchId,
              );

            if (!batch) {
              throw new Error(
                "Stock batch not found",
              );
            }

            if (
              batch.quantity <
              item.quantity
            ) {
              throw new Error(
                "Cannot cancel purchase because part of this stock was already sold or adjusted",
              );
            }

            await tx.stockBatch.update({
              where: {
                id:
                  item.stockBatchId,
              },

              data: {
                quantity: {
                  decrement:
                    item.quantity,
                },
              },
            });
          }

          // STOCK ADJUSTMENT
          await tx.stockMovement.create({
            data: {
              product: {
                connect: {
                  id:
                    item.productId,
                },
              },

              user: {
                connect: {
                  id:
                    purchase.userId,
                },
              },

              type:
                "ADJUSTMENT",

              quantity:
                -item.quantity,

              notes:
                `Purchase ${purchase.reference} cancelled`,

              ...(item.stockBatchId !==
                null &&
                item.stockBatchId !==
                  undefined && {
                  stockBatch: {
                    connect: {
                      id:
                        item.stockBatchId,
                    },
                  },
                }),
            },
          });

          affectedProductIds.push(
            item.productId,
          );
        }

        // ------------------------------------------------------
        // RECALCULATE STOCK
        // ------------------------------------------------------

        await recalcManyProductStockCache(
          tx,
          affectedProductIds,
        );

        // ------------------------------------------------------
        // CREATE REVERSAL JOURNAL
        // ------------------------------------------------------

        await createPurchaseReversalJournal(
          tx,
          purchase,
        );

        await updateActualAccountBalance(
          tx,
          purchase.paymentMethod,
          purchase.accountId,
          purchase.paidAmount,
          "increment",
        );

        // ------------------------------------------------------
        // UPDATE STATUS
        // ------------------------------------------------------

        const cancelledPurchase =
          await tx.purchase.update({
            where: {
              id,
            },

            data: {
              status:
                "CANCELLED",
            },
          });

        // ------------------------------------------------------
        // RETURN
        // ------------------------------------------------------

        return tx.purchase.findUnique({
          where: {
            id:
              cancelledPurchase.id,
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
    );
  },

  // ==========================================================
  // DELETE PURCHASE
  // ==========================================================

  async deletePurchase(
    id: number,
  ) {
    const purchase =
      await purchaseRepository.findById(
        id,
      );

    if (!purchase) {
      throw new Error(
        "Purchase not found",
      );
    }

    if (
      purchase.status !==
      "CANCELLED"
    ) {
      throw new Error(
        "Only cancelled purchases can be deleted",
      );
    }

    return purchaseRepository.delete(
      id,
    );
  },
};