import {
  PrismaClient,
  ChartAccountType,
} from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // ============================================================
  // CATEGORIES
  // ============================================================

  const categories = [
    "Beverages",
    "Food",
    "Snacks",
    "Dairy",
    "Bakery",
    "Frozen Foods",
    "Fruits & Vegetables",
    "Meat & Poultry",
    "Seafood",
    "Personal Care",
    "Household",
    "Cleaning Supplies",
    "Baby Products",
    "Stationery",
    "Electronics",
    "Other",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ============================================================
  // UNITS
  // ============================================================

  const units = [
    "Piece",
    "Kg",
    "Gram",
    "Liter",
    "Milliliter",
    "Bottle",
    "Box",
    "Pack",
    "Carton",
  ];

  for (const name of units) {
    await prisma.unit.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ============================================================
  // CHART OF ACCOUNTS
  // ============================================================

const chartAccounts = [
  {
    code: "1000",
    name: "Cash",
    type: ChartAccountType.ASSET,
  },
  {
    code: "1010",
    name: "Bank Accounts",
    type: ChartAccountType.ASSET,
  },
  {
    code: "1020",
    name: "Mobile Wallets",
    type: ChartAccountType.ASSET,
  },
  {
    code: "1030",
    name: "Merchant Accounts",
    type: ChartAccountType.ASSET,
  },
  {
    code: "1100",
    name: "Inventory",
    type: ChartAccountType.ASSET,
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    type: ChartAccountType.ASSET,
  },
  {
    code: "2000",
    name: "Accounts Payable",
    type: ChartAccountType.LIABILITY,
  },
  {
    code: "2100",
    name: "VAT Payable",
    type: ChartAccountType.LIABILITY,
  },
  {
    code: "3000",
    name: "Owner Capital",
    type: ChartAccountType.EQUITY,
  },
  {
    code: "3100",
    name: "Owner Withdrawals",
    type: ChartAccountType.EQUITY,
  },
  {
    code: "4000",
    name: "Sales Revenue",
    type: ChartAccountType.REVENUE,
  },
  {
    code: "4100",
    name: "Other Income",
    type: ChartAccountType.REVENUE,
  },
  {
    code: "5000",
    name: "Cost of Goods Sold",
    type: ChartAccountType.EXPENSE,
  },
  {
    code: "5100",
    name: "Operating Expenses",
    type: ChartAccountType.EXPENSE,
  },
  {
    code: "5200",
    name: "Salary/Wages Expense",
    type: ChartAccountType.EXPENSE,
  },
];

  for (const account of chartAccounts) {
    await prisma.chartAccount.upsert({
      where: {
        code: account.code,
      },
      update: {
        name: account.name,
        type: account.type,
        isActive: true,
      },
      create: account,
    });
  }

  console.log("Categories, units, and chart accounts seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
