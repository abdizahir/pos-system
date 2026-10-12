// server/src/controllers/overdueSales.controller.ts

import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

// A customer's unpaid balance becomes overdue this many days after the sale
export const OVERDUE_AFTER_DAYS = 7;

// How many sales the header bell lists (the count covers all of them)
const LIST_LIMIT = 20;

// GET /api/sales/overdue
// Credit sales still owing money a week or more after the sale day,
// oldest first, for the header notifications.
export async function getOverdueSales(_req: Request, res: Response) {
  try {
    // Start of the day a week ago: a sale made on Oct 1 is overdue from Oct 8
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - OVERDUE_AFTER_DAYS + 1);

    const where = {
      dueAmount: { gt: 0 },
      status: { not: "CANCELLED" as const },
      createdAt: { lt: cutoff },
    };

    const [sales, totals] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: LIST_LIMIT,
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
          dueAmount: true,
          customer: {
            select: { id: true, fname: true, lname: true, phone: true },
          },
        },
      }),
      prisma.sale.aggregate({
        where,
        _count: { _all: true },
        _sum: { dueAmount: true },
      }),
    ]);

    const now = Date.now();

    return res.json({
      overdueAfterDays: OVERDUE_AFTER_DAYS,
      count: totals._count._all,
      totalDue: Number(totals._sum.dueAmount ?? 0),
      sales: sales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        createdAt: sale.createdAt.toISOString(),
        dueAmount: Number(sale.dueAmount),
        daysSinceSale: Math.floor((now - sale.createdAt.getTime()) / 86_400_000),
        customer: sale.customer,
      })),
    });
  } catch (error) {
    console.error("Overdue sales error:", error);
    return res.status(500).json({ message: "Failed to load overdue customer dues" });
  }
}
