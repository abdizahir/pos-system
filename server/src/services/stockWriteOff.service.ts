// server/src/services/stockWriteOff.service.ts
//
// Write off expired stock: the units leave stock and their cost moves
// from Inventory to an expense, so the balance sheet stops counting
// goods that can't be sold and the P&L shows the loss.
//
//   Dr 5300 Expired Stock Write-off   (expense)
//   Cr 1100 Inventory

import { prisma } from "../db/prisma.js";
import { ChartAccountType, Prisma } from "../../generated/prisma/client.js";
import { ServiceError } from "./service-error.js";

const INVENTORY_CODE = "1100";
export const WRITE_OFF_CODE = "5300";
const WRITE_OFF_NAME = "Expired Stock Write-off";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Expired batches that still have units, optionally only some of them
export async function getExpiredBatches(batchIds?: number[]) {
  return prisma.stockBatch.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { lt: startOfToday() },
      ...(batchIds ? { id: { in: batchIds } } : {}),
    },
    select: {
      id: true,
      productId: true,
      quantity: true,
      purchasePrice: true,
      expiryDate: true,
      product: { select: { productName: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}

export async function writeOffExpiredStock(userId: number, batchIds?: number[]) {
  if (batchIds && batchIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ServiceError("Invalid stock batch selection.");
  }

  return prisma.$transaction(async (tx) => {
    const today = startOfToday();

    const batches = await tx.stockBatch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { lt: today },
        ...(batchIds ? { id: { in: batchIds } } : {}),
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        purchasePrice: true,
        product: { select: { productName: true } },
      },
    });

    if (batches.length === 0) {
      throw new ServiceError("There is no expired stock to write off.");
    }

    if (batchIds && batches.length !== new Set(batchIds).size) {
      throw new ServiceError(
        "Some of the selected batches are not expired or have no stock left.",
      );
    }

    // ---------------- Accounts ----------------
    const inventory = await tx.chartAccount.findUnique({
      where: { code: INVENTORY_CODE },
      select: { id: true },
    });

    if (!inventory) {
      throw new ServiceError(`Chart account ${INVENTORY_CODE} (Inventory) not found.`, 500);
    }

    // Created the first time stock is written off
    const writeOff = await tx.chartAccount.upsert({
      where: { code: WRITE_OFF_CODE },
      update: {},
      create: {
        code: WRITE_OFF_CODE,
        name: WRITE_OFF_NAME,
        type: ChartAccountType.EXPENSE,
      },
      select: { id: true },
    });

    // ---------------- Stock ----------------
    let units = 0;
    let total = new Prisma.Decimal(0);

    for (const batch of batches) {
      units += batch.quantity;
      total = total.add(new Prisma.Decimal(batch.purchasePrice).mul(batch.quantity));

      await tx.stockMovement.create({
        data: {
          productId: batch.productId,
          userId,
          stockBatchId: batch.id,
          type: "ADJUSTMENT",
          quantity: -batch.quantity,
          notes: "Expired stock written off",
        },
      });

      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: 0 },
      });
    }

    // Refresh the cached stock quantity of each product
    for (const productId of new Set(batches.map((batch) => batch.productId))) {
      const remaining = await tx.stockBatch.aggregate({
        where: { productId },
        _sum: { quantity: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: remaining._sum.quantity ?? 0 },
      });
    }

    // ---------------- Accounting ----------------
    const names = [...new Set(batches.map((batch) => batch.product.productName))];

    if (total.gt(0)) {
      await tx.journalEntry.create({
        data: {
          date: new Date(),
          reference: `WRITEOFF-${Date.now()}`,
          description: `Expired stock written off: ${names.join(", ")}`,
          lines: {
            create: [
              { accountId: writeOff.id, debit: total, credit: 0 },
              { accountId: inventory.id, debit: 0, credit: total },
            ],
          },
        },
      });
    }

    return {
      batches: batches.length,
      units,
      total: Number(total),
      products: names,
    };
  });
}
