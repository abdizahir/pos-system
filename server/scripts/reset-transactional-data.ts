import dotenv from "dotenv";

dotenv.config();

const { prisma } = await import("../src/db/prisma.js");

const modelNames = [
  "journalEntry",
  "saleReturn",
  "payment",
  "saleItem",
  "stockMovement",
  "purchaseItem",
  "stockBatch",
  "sale",
  "purchase",
  "expense",
  "product",
  "supplier",
  "account",
] as const;

async function getCounts() {
  return Object.fromEntries(
    await Promise.all(
      modelNames.map(async (name) => [name, await prisma[name].count()]),
    ),
  );
}

try {
  const before = await getCounts();

  if (!process.argv.includes("--execute")) {
    console.table(before);
    console.log("Dry run only. Run with --execute to remove these records.");
    process.exitCode = 0;
  } else {
    const deleted = await prisma.$transaction(async (tx) => ({
      journalEntry: (await tx.journalEntry.deleteMany()).count,
      saleReturn: (await tx.saleReturn.deleteMany()).count,
      payment: (await tx.payment.deleteMany()).count,
      saleItem: (await tx.saleItem.deleteMany()).count,
      stockMovement: (await tx.stockMovement.deleteMany()).count,
      purchaseItem: (await tx.purchaseItem.deleteMany()).count,
      stockBatch: (await tx.stockBatch.deleteMany()).count,
      sale: (await tx.sale.deleteMany()).count,
      purchase: (await tx.purchase.deleteMany()).count,
      expense: (await tx.expense.deleteMany()).count,
      product: (await tx.product.deleteMany()).count,
      supplier: (await tx.supplier.deleteMany()).count,
      account: (await tx.account.deleteMany()).count,
    }));

    console.table(deleted);
    console.table(await getCounts());
    console.log(
      "Kept: users, categories, units, and chart accounts. Transactional data removed.",
    );
  }
} finally {
  await prisma.$disconnect();
}
