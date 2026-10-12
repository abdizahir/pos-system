// server/src/services/stockAdjustment.service.ts
//
// Adjust a product's stock to a physical count (damage, loss, breakage,
// counting errors). Expired batches are not part of the count; they are
// handled by the expired-stock write-off.
//
// Fewer units than the system:   Dr 5400 Inventory Adjustments / Cr 1100 Inventory
// More units than the system:    Dr 1100 Inventory / Cr 5400 Inventory Adjustments

import { prisma } from "../db/prisma.js";
import { ChartAccountType, Prisma } from "../../generated/prisma/client.js";
import { ServiceError } from "./service-error.js";

const INVENTORY_CODE = "1100";
export const ADJUSTMENT_CODE = "5400";
const ADJUSTMENT_NAME = "Inventory Adjustments";

export const ADJUSTMENT_REASONS = {
  DAMAGE: "Damage",
  LOSS: "Loss / theft",
  BREAKAGE: "Breakage",
  COUNT_ERROR: "Counting error",
  OTHER: "Other",
} as const;

export type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS;

type AdjustStockInput = {
  productId: number;
  countedQuantity: number;
  reason: AdjustmentReason;
  notes?: string | null;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseInput(data: unknown): AdjustStockInput {
  const body = (data ?? {}) as Record<string, unknown>;

  const productId = Number(body.productId);
  const countedQuantity = Number(body.countedQuantity);
  const reason = String(body.reason ?? "") as AdjustmentReason;
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new ServiceError("Select a product.");
  }
  if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
    throw new ServiceError("Counted quantity must be a whole number of 0 or more.");
  }
  if (!(reason in ADJUSTMENT_REASONS)) {
    throw new ServiceError("Select a reason for the adjustment.");
  }

  return { productId, countedQuantity, reason, notes: notes || null };
}

export async function adjustStock(data: unknown, userId: number) {
  const input = parseInput(data);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, productName: true },
    });

    if (!product) {
      throw new ServiceError("Product not found.", 404);
    }

    // Sellable batches: not expired, oldest expiry first, then oldest received
    const batches = (
      await tx.stockBatch.findMany({
        where: {
          productId: product.id,
          OR: [{ expiryDate: null }, { expiryDate: { gte: startOfToday() } }],
        },
        orderBy: [{ createdAt: "asc" }],
      })
    ).sort((a, b) => {
      const ae = a.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const be = b.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ae - be || a.createdAt.getTime() - b.createdAt.getTime();
    });

    const before = batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const difference = input.countedQuantity - before;

    if (difference === 0) {
      throw new ServiceError(
        `The count matches the system (${before}). Nothing to adjust.`,
      );
    }

    const label = ADJUSTMENT_REASONS[input.reason];
    const note = `Stock adjustment (${label})${input.notes ? `: ${input.notes}` : ""}`;

    let value = new Prisma.Decimal(0);

    if (difference < 0) {
      // ---------------- Fewer units: take them off the batches ----------------
      let toRemove = -difference;

      for (const batch of batches) {
        if (toRemove === 0) break;
        if (batch.quantity <= 0) continue;

        const taken = Math.min(batch.quantity, toRemove);
        toRemove -= taken;
        value = value.add(new Prisma.Decimal(batch.purchasePrice).mul(taken));

        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: taken } },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            stockBatchId: batch.id,
            userId,
            type: "ADJUSTMENT",
            quantity: -taken,
            notes: note,
          },
        });
      }
    } else {
      // ---------------- More units: add them to the newest batch ----------------
      const newest = [...batches].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      // Cost for the found units: the newest batch, or the last price paid
      const lastBatch =
        newest ??
        (await tx.stockBatch.findFirst({
          where: { productId: product.id },
          orderBy: { createdAt: "desc" },
        }));

      if (!lastBatch) {
        throw new ServiceError(
          "This product has never been stocked, so its cost is unknown. Add it through a purchase or opening stock instead.",
        );
      }

      const unitCost = new Prisma.Decimal(lastBatch.purchasePrice);
      value = unitCost.mul(difference);

      const batch = newest
        ? await tx.stockBatch.update({
            where: { id: newest.id },
            data: { quantity: { increment: difference } },
          })
        : await tx.stockBatch.create({
            data: {
              product: { connect: { id: product.id } },
              user: { connect: { id: userId } },
              quantity: difference,
              purchasePrice: unitCost,
              expiryDate: null,
            },
          });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          stockBatchId: batch.id,
          userId,
          type: "ADJUSTMENT",
          quantity: difference,
          notes: note,
        },
      });
    }

    // ---------------- Product stock cache ----------------
    const remaining = await tx.stockBatch.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { stockQuantity: remaining._sum.quantity ?? 0 },
    });

    // ---------------- Accounting ----------------
    if (value.gt(0)) {
      const inventory = await tx.chartAccount.findUnique({
        where: { code: INVENTORY_CODE },
        select: { id: true },
      });

      if (!inventory) {
        throw new ServiceError(`Chart account ${INVENTORY_CODE} (Inventory) not found.`, 500);
      }

      // Created the first time stock is adjusted
      const adjustment = await tx.chartAccount.upsert({
        where: { code: ADJUSTMENT_CODE },
        update: {},
        create: {
          code: ADJUSTMENT_CODE,
          name: ADJUSTMENT_NAME,
          type: ChartAccountType.EXPENSE,
        },
        select: { id: true },
      });

      const lost = difference < 0;

      await tx.journalEntry.create({
        data: {
          date: new Date(),
          reference: `ADJ-${Date.now()}`,
          description: `${note} — ${product.productName} ${before} → ${input.countedQuantity}`,
          lines: {
            create: [
              {
                accountId: lost ? adjustment.id : inventory.id,
                debit: value,
                credit: 0,
              },
              {
                accountId: lost ? inventory.id : adjustment.id,
                debit: 0,
                credit: value,
              },
            ],
          },
        },
      });
    }

    return {
      productName: product.productName,
      before,
      after: input.countedQuantity,
      difference,
      value: Number(value),
      reason: label,
    };
  });
}
