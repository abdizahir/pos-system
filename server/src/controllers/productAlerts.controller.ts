// server/src/controllers/productAlerts.controller.ts

import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

// GET /api/products/alerts
// Small counts for the header bell, instead of every product + batch
export async function getProductAlerts(_req: Request, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 30);

    const [outOfStock, lowStockRows, expired, expiringSoon] = await Promise.all([
      prisma.product.count({ where: { stockQuantity: { lte: 0 } } }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM products
        WHERE stock_quantity > 0 AND stock_quantity <= low_stock_limit`,
      prisma.stockBatch.count({
        where: { quantity: { gt: 0 }, expiryDate: { lt: today } },
      }),
      prisma.stockBatch.count({
        where: { quantity: { gt: 0 }, expiryDate: { gte: today, lte: soon } },
      }),
    ]);

    return res.json({
      outOfStock,
      lowStock: lowStockRows[0]?.count ?? 0,
      expired,
      expiringSoon,
    });
  } catch (error) {
    console.error("Product alerts error:", error);
    return res.status(500).json({ message: "Failed to load stock alerts" });
  }
}
