import { prisma } from "../db/prisma.js";
import {
  isMobileAccountType,
  RECORD_ONLY_CHART_CODE,
} from "../utils/payment-accounts.js";
import { availableBalance } from "../utils/money-source.js";

import {
  PaymentMethod,
  Prisma,
} from "../../generated/prisma/client.js";


// ==================================================
// TYPES
// ==================================================

interface CreateSaleReturnItemInput {
  saleItemId: number;
  productId: number;
  quantity: number;
}

interface CreateSaleReturnInput {
  saleId: number;
  reason: string;
  notes?: string;

  // Refund information
  refundMethod?: PaymentMethod;
  accountId?: number;

  items: CreateSaleReturnItemInput[];
}


// ==================================================
// HELPERS
// ==================================================

const PAYMENT_METHODS = Object.values(PaymentMethod);

const isPaymentMethod = (
  value: unknown
): value is PaymentMethod => {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethod)
  );
};


// --------------------------------------------------
// Get chart account by code
// --------------------------------------------------

async function getChartAccountId(
  tx: Prisma.TransactionClient,
  code: string
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
      `Chart account ${code} not found`
    );
  }

  return account.id;
}


// --------------------------------------------------
// Get refund chart account
// --------------------------------------------------

async function getRefundChartAccountId(
  tx: Prisma.TransactionClient,
  _refundMethod: PaymentMethod,
  _accountId?: number | null
) {
  // Record-only: refunds are booked against Owner's Capital and
  // never take money out of an account.
  return getChartAccountId(tx, RECORD_ONLY_CHART_CODE);
}


// --------------------------------------------------
// Validate actual Account
// --------------------------------------------------

async function validateRefundAccount(
  tx: Prisma.TransactionClient,
  accountId: number,
  refundMethod: PaymentMethod
) {
  const account = await tx.account.findUnique({
    where: {
      id: accountId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
    },
  });

  if (!account) {
    throw new Error("Refund account not found");
  }

  if (account.status !== "ACTIVE") {
    throw new Error(
      "Refund account is inactive"
    );
  }

  // CASH does not need an actual Account record.
  if (refundMethod === PaymentMethod.CASH) {
    throw new Error(
      "Cash refunds should not use a bank/wallet account"
    );
  }

  // BANK and CARD use bank accounts.
  if (
    (refundMethod === PaymentMethod.BANK ||
      refundMethod === PaymentMethod.CARD) &&
    account.type !== "BANK"
  ) {
    throw new Error(
      "Bank or card refunds must use a bank account"
    );
  }

  // MOBILE uses wallet accounts.
  if (
    refundMethod === PaymentMethod.MOBILE &&
    !isMobileAccountType(account.type)
  ) {
    throw new Error(
      "Mobile refunds must use a wallet or merchant account"
    );
  }

  return account;
}


// --------------------------------------------------
// Create return journal
// --------------------------------------------------

async function createSaleReturnJournal(
  tx: Prisma.TransactionClient,
  saleReturn: {
    id: number;
    saleId: number;
    total: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    tax: Prisma.Decimal;
    refundMethod: PaymentMethod | null;
    accountId: number | null;
    createdAt: Date;
  },
  inventoryCost: Prisma.Decimal,
  arReduction: Prisma.Decimal
) {
  const salesRevenueAccountId =
    await getChartAccountId(tx, "4000");

  const inventoryAccountId =
    await getChartAccountId(tx, "1100");

  const cogsAccountId =
    await getChartAccountId(tx, "5000");

  const journalLines: {
    accountId: number;
    paymentAccountId?: number | null;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
  }[] = [];

  // ----------------------------------------------
  // Reverse Sales Revenue
  // ----------------------------------------------

  journalLines.push({
    accountId: salesRevenueAccountId,
    debit: saleReturn.total.sub(saleReturn.tax),
    credit: new Prisma.Decimal(0),
  });

  // VAT on returned goods is no longer owed
  if (saleReturn.tax.gt(0)) {
    journalLines.push({
      accountId: await getChartAccountId(tx, "2100"),
      debit: saleReturn.tax,
      credit: new Prisma.Decimal(0),
    });
  }


  // ----------------------------------------------
  // Refund / Accounts Receivable
  // ----------------------------------------------

  if (arReduction.gt(0)) {
    const arAccountId =
      await getChartAccountId(tx, "1200");

    journalLines.push({
      accountId: arAccountId,
      debit: new Prisma.Decimal(0),
      credit: arReduction,
    });
  }


  // ----------------------------------------------
  // Actual refund
  // ----------------------------------------------

  const refundAmount =
    saleReturn.total.sub(arReduction);

  if (refundAmount.gt(0)) {
    if (!saleReturn.refundMethod) {
      throw new Error(
        "Refund method is required for the refund amount"
      );
    }

    // Checks the refund account is valid. Record-only: the balance
    // is not checked and the refund never reduces it.
    await availableBalance(
      tx,
      saleReturn.refundMethod,
      saleReturn.accountId
    ).catch((error: unknown) => {
      throw new Error(error instanceof Error ? error.message : "Invalid refund account");
    });

    const refundAccountId =
      await getRefundChartAccountId(
        tx,
        saleReturn.refundMethod,
        saleReturn.accountId
      );

    journalLines.push({
      accountId: refundAccountId,
      paymentAccountId: null,
      debit: new Prisma.Decimal(0),
      credit: refundAmount,
    });
  }


  // ----------------------------------------------
  // Restore inventory
  //
  // Dr Inventory
  // Cr COGS
  // ----------------------------------------------

  if (inventoryCost.gt(0)) {
    journalLines.push({
      accountId: inventoryAccountId,
      debit: inventoryCost,
      credit: new Prisma.Decimal(0),
    });

    journalLines.push({
      accountId: cogsAccountId,
      debit: new Prisma.Decimal(0),
      credit: inventoryCost,
    });
  }


  // ----------------------------------------------
  // Verify journal is balanced
  // ----------------------------------------------

  const totalDebit = journalLines.reduce(
    (sum, line) =>
      sum.add(line.debit),
    new Prisma.Decimal(0)
  );

  const totalCredit = journalLines.reduce(
    (sum, line) =>
      sum.add(line.credit),
    new Prisma.Decimal(0)
  );

  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Sale return journal is not balanced. Debit: ${totalDebit.toFixed(
        2
      )}, Credit: ${totalCredit.toFixed(2)}`
    );
  }


  // ----------------------------------------------
  // Create JournalEntry
  // ----------------------------------------------

  await tx.journalEntry.create({
    data: {
      date: saleReturn.createdAt,

      reference: `RETURN-${saleReturn.id}`,

      description: `Sale return for sale #${saleReturn.saleId}`,

      saleReturnId: saleReturn.id,

      lines: {
        create: journalLines.map((line) => ({
          accountId: line.accountId,
          paymentAccountId: line.paymentAccountId ?? null,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
  });
}


// ==================================================
// GET ALL RETURNS
// ==================================================

export const getSaleReturns = async () => {
  return prisma.saleReturn.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      sale: {
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
        },
      },

      account: {
        select: {
          id: true,
          bankName: true,
          name: true,
          type: true,
          number: true,
        },
      },

      items: {
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              sku: true,
            },
          },

          saleItem: {
            select: {
              id: true,
              quantity: true,
              returnedQuantity: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  });
};


// ==================================================
// GET RETURN BY ID
// ==================================================

export const getSaleReturnById = async (
  id: number
) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Invalid sale return ID"
    );
  }

  const saleReturn =
    await prisma.saleReturn.findUnique({
      where: {
        id,
      },

      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
          },
        },

        account: {
          select: {
            id: true,
            bankName: true,
            name: true,
            type: true,
            number: true,
          },
        },

        items: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                sku: true,
              },
            },

            saleItem: {
              select: {
                id: true,
                quantity: true,
                returnedQuantity: true,
                unitPrice: true,
              },
            },
          },
        },

        journalEntries: {
          include: {
            lines: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

  if (!saleReturn) {
    throw new Error(
      "Sale return not found"
    );
  }

  return saleReturn;
};


// ==================================================
// GET RETURNS BY SALE
// ==================================================

export const getSaleReturnsBySaleId = async (
  saleId: number
) => {
  if (!Number.isInteger(saleId) || saleId <= 0) {
    throw new Error(
      "Invalid sale ID"
    );
  }

  return prisma.saleReturn.findMany({
    where: {
      saleId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      account: {
        select: {
          id: true,
          bankName: true,
          name: true,
          type: true,
          number: true,
        },
      },

      items: {
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              sku: true,
            },
          },
        },
      },
    },
  });
};


// ==================================================
// CREATE SALE RETURN
// ==================================================

export const createSaleReturn = async (
  data: CreateSaleReturnInput
) => {
  // ----------------------------------------------
  // Basic validation
  // ----------------------------------------------

  if (
    !Number.isInteger(data.saleId) ||
    data.saleId <= 0
  ) {
    throw new Error(
      "Invalid sale ID"
    );
  }

  const reason = data.reason?.trim();

  if (!reason) {
    throw new Error(
      "Return reason is required"
    );
  }

  if (
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {
    throw new Error(
      "At least one return item is required"
    );
  }


  // ----------------------------------------------
  // Validate refund method
  // ----------------------------------------------

  if (
    data.refundMethod !== undefined &&
    !isPaymentMethod(data.refundMethod)
  ) {
    throw new Error(
      "Invalid refund method"
    );
  }


  // ----------------------------------------------
  // Validate account ID
  // ----------------------------------------------

  if (
    data.accountId !== undefined &&
    (!Number.isInteger(data.accountId) ||
      data.accountId <= 0)
  ) {
    throw new Error(
      "Invalid refund account ID"
    );
  }


  // ----------------------------------------------
  // Duplicate sale items
  // ----------------------------------------------

  const saleItemIds =
    data.items.map(
      (item) => item.saleItemId
    );

  const uniqueSaleItemIds =
    new Set(saleItemIds);

  if (
    uniqueSaleItemIds.size !==
    saleItemIds.length
  ) {
    throw new Error(
      "The same sale item cannot be returned more than once in the same return"
    );
  }


  // ==================================================
  // TRANSACTION
  // ==================================================

  return prisma.$transaction(
    async (tx) => {
      // --------------------------------------------
      // Get sale
      // --------------------------------------------

      const sale =
        await tx.sale.findUnique({
          where: {
            id: data.saleId,
          },

          include: {
            items: {
              include: {
                product: true,
                stockBatch: true,
              },
            },

            payments: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!sale) {
        throw new Error(
          "Sale not found"
        );
      }


      // --------------------------------------------
      // Only completed sales can be returned
      // --------------------------------------------

      if (sale.status !== "COMPLETED") {
        throw new Error(
          "Only completed sales can be returned"
        );
      }

      // Sale-level discount, spread evenly over every line
      const discountRate = sale.subtotal.gt(0)
        ? sale.discount.div(sale.subtotal)
        : new Prisma.Decimal(0);


      // --------------------------------------------
      // Validate refund account
      // --------------------------------------------

      if (
        data.accountId !== undefined &&
        data.refundMethod !== undefined
      ) {
        await validateRefundAccount(
          tx,
          data.accountId,
          data.refundMethod
        );
      }


      // --------------------------------------------
      // Calculate return totals
      // --------------------------------------------

      let subtotal =
        new Prisma.Decimal(0);

      let tax =
        new Prisma.Decimal(0);

      let total =
        new Prisma.Decimal(0);

      let inventoryCost =
        new Prisma.Decimal(0);


      // --------------------------------------------
      // Process return items
      // --------------------------------------------

      const returnItemsData: {
        saleItemId: number;
        productId: number;
        quantity: number;
        unitPrice: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }[] = [];


      for (const inputItem of data.items) {
        // ------------------------------------------
        // Validate quantity
        // ------------------------------------------

        if (
          !Number.isInteger(
            inputItem.quantity
          ) ||
          inputItem.quantity <= 0
        ) {
          throw new Error(
            "Return quantity must be greater than 0"
          );
        }


        // ------------------------------------------
        // Find original sale item
        // ------------------------------------------

        const saleItem =
          sale.items.find(
            (item) =>
              item.id ===
              inputItem.saleItemId
          );

        if (!saleItem) {
          throw new Error(
            `Sale item ${inputItem.saleItemId} does not belong to this sale`
          );
        }


        // ------------------------------------------
        // Validate product
        // ------------------------------------------

        if (
          saleItem.productId !==
          inputItem.productId
        ) {
          throw new Error(
            `Product does not match sale item ${saleItem.id}`
          );
        }


        // ------------------------------------------
        // Calculate remaining quantity
        // ------------------------------------------

        const alreadyReturned =
          saleItem.returnedQuantity;

        const availableQuantity =
          saleItem.quantity -
          alreadyReturned;

        if (
          inputItem.quantity >
          availableQuantity
        ) {
          throw new Error(
            `Cannot return ${inputItem.quantity} of ${saleItem.product.productName}. Only ${availableQuantity} item(s) are available for return`
          );
        }


        // ------------------------------------------
        // Stock batch must exist
        // ------------------------------------------

        if (!saleItem.stockBatch) {
          throw new Error(
            `Stock batch not found for sale item ${saleItem.id}`
          );
        }


        // ------------------------------------------
        // Calculate line subtotal
        // ------------------------------------------

        const quantity =
          new Prisma.Decimal(
            inputItem.quantity
          );

        // Price actually charged: list price less this line's share
        // of the sale-level discount
        const lineSubtotal =
          saleItem.unitPrice
            .mul(quantity)
            .mul(new Prisma.Decimal(1).sub(discountRate))
            .toDecimalPlaces(2);


        // ------------------------------------------
        // Tax
        //
        // SaleItem.tax is treated as the total
        // tax for the original sale line.
        //
        // Therefore calculate proportional tax
        // for the returned quantity.
        // ------------------------------------------

        let lineTax =
          new Prisma.Decimal(0);

        if (
          saleItem.quantity > 0 &&
          saleItem.tax.gt(0)
        ) {
          lineTax =
            saleItem.tax
              .div(saleItem.quantity)
              .mul(quantity);
        }


        // ------------------------------------------
        // Line total
        // ------------------------------------------

        const lineTotal =
          lineSubtotal.add(lineTax);


        // ------------------------------------------
        // Inventory cost
        // ------------------------------------------

        const purchasePrice =
          saleItem.stockBatch.purchasePrice;

        const lineInventoryCost =
          purchasePrice.mul(quantity);


        // ------------------------------------------
        // Add totals
        // ------------------------------------------

        subtotal =
          subtotal.add(lineSubtotal);

        tax =
          tax.add(lineTax);

        total =
          total.add(lineTotal);

        inventoryCost =
          inventoryCost.add(
            lineInventoryCost
          );


        // ------------------------------------------
        // Store return item
        // ------------------------------------------

        returnItemsData.push({
          saleItemId:
            saleItem.id,

          productId:
            saleItem.productId,

          quantity:
            inputItem.quantity,

          unitPrice:
            saleItem.unitPrice,

          lineTotal,
        });
      }


      // --------------------------------------------
      // Validate total
      // --------------------------------------------

      if (total.lte(0)) {
        throw new Error(
          "Return total must be greater than 0"
        );
      }


      // ==================================================
      // DETERMINE AR REDUCTION / REFUND
      // ==================================================

      const saleDue =
        sale.dueAmount;

      let arReduction =
        new Prisma.Decimal(0);


      // --------------------------------------------
      // If no refund method was supplied:
      //
      // Use the outstanding customer balance.
      // --------------------------------------------

      if (
        data.refundMethod === undefined
      ) {
        if (saleDue.gte(total)) {
          arReduction = total;
        } else if (saleDue.gt(0)) {
          throw new Error(
            "This sale has both paid and unpaid amounts. Please select a refund method for the paid portion."
          );
        } else {
          throw new Error(
            "Refund method is required for this return"
          );
        }
      }


      // --------------------------------------------
      // If refund method is supplied, use it for
      // the return amount.
      //
      // We do not automatically reduce AR here.
      // --------------------------------------------


      // ==================================================
      // CREATE SALE RETURN
      // ==================================================

      const saleReturn =
        await tx.saleReturn.create({
          data: {
            saleId: sale.id,

            reason,

            notes:
              data.notes?.trim() ||
              null,

            subtotal,

            tax,

            total,

            refundMethod:
              data.refundMethod ??
              null,

            accountId:
              data.accountId ??
              null,

            items: {
              create:
                returnItemsData.map(
                  (item) => ({
                    saleItemId:
                      item.saleItemId,

                    productId:
                      item.productId,

                    quantity:
                      item.quantity,

                    unitPrice:
                      item.unitPrice,

                    lineTotal:
                      item.lineTotal,
                  })
                ),
            },
          },

          include: {
            items: true,
          },
        });


      // ==================================================
      // UPDATE SALE ITEMS
      // ==================================================

      for (const item of returnItemsData) {
        await tx.saleItem.update({
          where: {
            id: item.saleItemId,
          },

          data: {
            returnedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }


      // ==================================================
      // RESTORE STOCK
      // ==================================================

      for (const item of returnItemsData) {
        const saleItem =
          sale.items.find(
            (saleItem) =>
              saleItem.id ===
              item.saleItemId
          );

        if (!saleItem) {
          throw new Error(
            `Sale item ${item.saleItemId} not found`
          );
        }

        const stockBatch =
          saleItem.stockBatch;

        if (!stockBatch) {
          throw new Error(
            `Stock batch not found for sale item ${item.saleItemId}`
          );
        }


        // --------------------------------------------
        // Restore stock batch
        // --------------------------------------------

        await tx.stockBatch.update({
          where: {
            id: stockBatch.id,
          },

          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });


        // --------------------------------------------
        // Recalculate product stock
        // --------------------------------------------

        const stockResult =
          await tx.stockBatch.aggregate({
            where: {
              productId:
                item.productId,
            },

            _sum: {
              quantity: true,
            },
          });

        const realStock =
          stockResult._sum.quantity ?? 0;


        await tx.product.update({
          where: {
            id: item.productId,
          },

          data: {
            stockQuantity:
              realStock,
          },
        });


        // --------------------------------------------
        // Create stock movement
        // --------------------------------------------

        await tx.stockMovement.create({
          data: {
            productId:
              item.productId,

            stockBatchId:
              stockBatch.id,

            type: "RETURN",

            quantity:
              item.quantity,


            notes:
              `Returned from sale ${sale.invoiceNumber}`,
          },
        });
      }


      // ==================================================
      // DETERMINE IF SALE IS FULLY RETURNED
      // ==================================================

      const updatedSaleItems =
        await tx.saleItem.findMany({
          where: {
            saleId: sale.id,
          },

          select: {
            quantity: true,
            returnedQuantity: true,
          },
        });


      const allItemsReturned =
        updatedSaleItems.every(
          (item) =>
            item.returnedQuantity >=
            item.quantity
        );


      if (allItemsReturned) {
        await tx.sale.update({
          where: {
            id: sale.id,
          },

          data: {
            status: "RETURNED",
          },
        });
      }


      // ==================================================
      // UPDATE SALE DUE AMOUNT
      // ==================================================

      if (arReduction.gt(0)) {
        const newDueAmount =
          sale.dueAmount.sub(
            arReduction
          );

        await tx.sale.update({
          where: {
            id: sale.id,
          },

          data: {
            dueAmount:
              newDueAmount.lt(0)
                ? new Prisma.Decimal(0)
                : newDueAmount,
          },
        });
      }


      // ==================================================
      // CREATE ACCOUNTING JOURNAL
      // ==================================================

      await createSaleReturnJournal(
        tx,
        {
          id: saleReturn.id,

          saleId: sale.id,

          total: saleReturn.total,

          subtotal:
            saleReturn.subtotal,

          tax:
            saleReturn.tax,

          refundMethod:
            saleReturn.refundMethod,

          accountId:
            saleReturn.accountId,

          createdAt:
            saleReturn.createdAt,
        },

        inventoryCost,

        arReduction
      );


      // ==================================================
      // RETURN FINAL DATA
      // ==================================================

      return tx.saleReturn.findUnique({
        where: {
          id: saleReturn.id,
        },

        include: {
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              subtotal: true,
              discount: true,
              tax: true,
              total: true,
              paidAmount: true,
              dueAmount: true,
              createdAt: true,
            },
          },

          account: {
            select: {
              id: true,
              bankName: true,
              name: true,
              type: true,
              number: true,
              status: true,
            },
          },

          items: {
            include: {
              product: {
                select: {
                  id: true,
                  productName: true,
                  sku: true,
                },
              },

              saleItem: {
                select: {
                  id: true,
                  quantity: true,
                  returnedQuantity: true,
                  unitPrice: true,
                  tax: true,
                  lineTotal: true,
                },
              },
            },
          },

          journalEntries: {
            include: {
              lines: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });
    }
  );
};


// ==================================================
// DELETE SALE RETURN
// ==================================================
//
// IMPORTANT:
// A sale return affects stock, sale quantities,
// sale status, due amount, stock movements and
// accounting.
//
// Therefore a simple delete is NOT safe.
//
// If you need delete functionality, it should be
// implemented as a full reversal transaction.
// ==================================================