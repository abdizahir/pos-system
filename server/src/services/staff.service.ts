// server/src/services/staff.service.ts
//
// How each staff member is selling, for the manager.

import { prisma } from "../db/prisma.js";

export async function getStaffPerformance(from: Date, to: Date) {
  const range = { gte: from, lte: to };

  const [users, sales, returns] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.findMany({
      where: { createdAt: range, status: { not: "CANCELLED" } },
      select: {
        userId: true,
        total: true,
        dueAmount: true,
        createdAt: true,
        items: { select: { quantity: true, returnedQuantity: true } },
      },
    }),
    prisma.saleReturn.findMany({
      where: { createdAt: range },
      select: { total: true, sale: { select: { userId: true } } },
    }),
  ]);

  const rows = users.map((user) => {
    const own = sales.filter((sale) => sale.userId === user.id);
    const ownReturns = returns.filter((r) => r.sale.userId === user.id);

    const revenue = own.reduce((sum, sale) => sum + Number(sale.total), 0);
    const refunded = ownReturns.reduce((sum, r) => sum + Number(r.total), 0);
    const credit = own.reduce((sum, sale) => sum + Number(sale.dueAmount), 0);
    const itemsSold = own.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((s, item) => s + item.quantity - item.returnedQuantity, 0),
      0,
    );
    const lastSaleAt = own.reduce<Date | null>(
      (latest, sale) => (!latest || sale.createdAt > latest ? sale.createdAt : latest),
      null,
    );

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      salesCount: own.length,
      revenue,
      refunded,
      netSales: revenue - refunded,
      creditGiven: credit,
      itemsSold,
      averageSale: own.length ? revenue / own.length : 0,
      returnsCount: ownReturns.length,
      lastSaleAt,
    };
  });

  const totalNet = rows.reduce((sum, row) => sum + row.netSales, 0);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      salesCount: rows.reduce((sum, row) => sum + row.salesCount, 0),
      netSales: totalNet,
      refunded: rows.reduce((sum, row) => sum + row.refunded, 0),
      itemsSold: rows.reduce((sum, row) => sum + row.itemsSold, 0),
    },
    staff: rows
      .map((row) => ({ ...row, share: totalNet > 0 ? row.netSales / totalNet : 0 }))
      .sort((a, b) => b.netSales - a.netSales),
  };
}
