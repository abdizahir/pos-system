// server/src/services/owner.service.ts
//
// Business owners and their withdrawals (drawings). A withdrawal posts:
//   Dr 3100 Owner Withdrawals
//   Cr Cash / Bank / Wallet / Merchant   (tagged with the account)

import { prisma } from "../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  getPaymentChartCode,
  paymentAccountIdFor,
} from "../utils/payment-accounts.js";
import { availableBalance, parsePaymentMethod } from "../utils/money-source.js";
import { formatNationalId } from "./employee.service.js";
import {
  ServiceError,
  toServiceError,
  toServiceErrorSync,
} from "./service-error.js";

const OWNER_WITHDRAWALS_CODE = "3100";
const GENDERS = ["MALE", "FEMALE"] as const;

export type OwnerInput = {
  nationalId: string;
  fname: string;
  lname: string;
  gender: string;
  email?: string | null;
  address?: string | null;
};

export type WithdrawalInput = {
  ownerId: number;
  amount: number;
  date?: string; // "YYYY-MM-DD", defaults to today
  paymentMethod: string;
  accountId?: number | null;
  reference?: string | null;
  notes?: string | null;
};

const WITHDRAWAL_INCLUDE = {
  owner: { select: { id: true, fname: true, lname: true } },
  account: {
    select: { id: true, bankName: true, name: true, number: true, type: true },
  },
} as const;

function parseId(id: number, label: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError(`Invalid ${label} ID.`);
  }
  return id;
}

// ============================================================
// OWNERS
// ============================================================

function cleanOwner(data: OwnerInput) {
  const nationalIdRaw = String(data.nationalId ?? "").trim();
  const nationalId = formatNationalId(nationalIdRaw);
  const fname = String(data.fname ?? "").trim();
  const lname = String(data.lname ?? "").trim();
  const gender = String(data.gender ?? "").toUpperCase();
  const email = String(data.email ?? "").trim().toLowerCase() || null;
  const address = String(data.address ?? "").trim() || null;

  if (!nationalIdRaw) throw new ServiceError("National ID is required.");
  if (!nationalId) {
    throw new ServiceError(
      "National ID must be 16 digits (e.g. 1234-5678-9012-3456).",
    );
  }
  if (!fname) throw new ServiceError("First name is required.");
  if (!lname) throw new ServiceError("Last name is required.");
  if (!GENDERS.includes(gender as (typeof GENDERS)[number])) {
    throw new ServiceError("Gender must be Male or Female.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError("Email address is not valid.");
  }

  return {
    nationalId,
    fname,
    lname,
    gender: gender as (typeof GENDERS)[number],
    email,
    address,
  };
}

function rethrowUnique(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    // Field is in meta.target or nested under driverAdapterError
    const target = JSON.stringify(err.meta ?? {});
    throw new ServiceError(
      target.includes("email")
        ? "An owner with this email already exists."
        : "An owner with this National ID already exists.",
      409,
    );
  }

  throw err;
}

// Owners with their total withdrawn
export async function getAll() {
  const [owners, totals] = await Promise.all([
    prisma.owner.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.ownerWithdrawal.groupBy({
      by: ["ownerId"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return owners.map((owner) => {
    const total = totals.find((t) => t.ownerId === owner.id);
    return {
      ...owner,
      totalWithdrawn: Number(total?._sum.amount ?? 0),
      withdrawalCount: total?._count._all ?? 0,
    };
  });
}

export async function getById(id: number) {
  const owner = await prisma.owner.findUnique({
    where: { id: parseId(id, "owner") },
  });

  if (!owner) throw new ServiceError("Owner not found.", 404);
  return owner;
}

export async function create(data: OwnerInput) {
  try {
    return await prisma.owner.create({ data: cleanOwner(data) });
  } catch (err) {
    rethrowUnique(err);
  }
}

export async function update(id: number, data: OwnerInput) {
  await getById(id);

  try {
    return await prisma.owner.update({ where: { id }, data: cleanOwner(data) });
  } catch (err) {
    rethrowUnique(err);
  }
}

export async function remove(id: number) {
  await getById(id);

  // Withdrawals are part of the books, so keep the owner
  const count = await prisma.ownerWithdrawal.count({ where: { ownerId: id } });
  if (count > 0) {
    throw new ServiceError(
      `This owner has ${count} withdrawal${count === 1 ? "" : "s"} and cannot be deleted.`,
      409,
    );
  }

  await prisma.owner.delete({ where: { id } });
}

// ============================================================
// WITHDRAWALS
// ============================================================

export async function getWithdrawals(ownerId?: number) {
  return prisma.ownerWithdrawal.findMany({
    where: ownerId ? { ownerId } : {},
    include: WITHDRAWAL_INCLUDE,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

export async function createWithdrawal(data: WithdrawalInput, userId: number) {
  const ownerId = parseId(Number(data.ownerId), "owner");
  const method = toServiceErrorSync(() => parsePaymentMethod(data.paymentMethod));
  const amountValue = Number(data.amount);

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new ServiceError("Amount must be greater than 0.");
  }

  const date = data.date ? new Date(`${data.date}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ServiceError("Invalid date.");
  }

  const accountId = method === "CASH" ? null : Number(data.accountId) || null;
  const amount = new Prisma.Decimal(amountValue.toFixed(2));

  return prisma.$transaction(async (tx) => {
    const owner = await tx.owner.findUnique({
      where: { id: ownerId },
      select: { id: true, fname: true, lname: true },
    });
    if (!owner) throw new ServiceError("Owner not found.", 404);

    const available = await availableBalance(tx, method, accountId).catch(
      toServiceError,
    );

    if (amountValue > available + 0.005) {
      throw new ServiceError(
        `Not enough money. Withdrawal is ETB ${amountValue.toFixed(2)} but only ETB ${available.toFixed(2)} is available.`,
      );
    }

    const withdrawal = await tx.ownerWithdrawal.create({
      data: {
        ownerId,
        amount,
        date,
        paymentMethod: method,
        accountId,
        reference: data.reference?.trim() || null,
        notes: data.notes?.trim() || null,
        userId,
      },
    });

    const withdrawalsChart = await tx.chartAccount.findUnique({
      where: { code: OWNER_WITHDRAWALS_CODE },
      select: { id: true },
    });
    const moneyChart = await tx.chartAccount.findUnique({
      where: { code: await getPaymentChartCode(tx, method, accountId) },
      select: { id: true },
    });

    if (!withdrawalsChart || !moneyChart) {
      throw new ServiceError("Chart of accounts is missing an account.", 500);
    }

    await tx.journalEntry.create({
      data: {
        date,
        reference: withdrawal.reference ?? `WDR-${withdrawal.id}`,
        description: `Owner withdrawal - ${owner.fname} ${owner.lname}`,
        ownerWithdrawalId: withdrawal.id,
        lines: {
          create: [
            { accountId: withdrawalsChart.id, debit: amount, credit: 0 },
            {
              accountId: moneyChart.id,
              paymentAccountId: paymentAccountIdFor(method, accountId),
              debit: 0,
              credit: amount,
            },
          ],
        },
      },
    });

    return tx.ownerWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
      include: WITHDRAWAL_INCLUDE,
    });
  });
}

export async function undoWithdrawal(id: number) {
  parseId(id, "withdrawal");

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.ownerWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new ServiceError("Withdrawal not found.", 404);

    await tx.journalEntry.deleteMany({ where: { ownerWithdrawalId: id } });
    await tx.ownerWithdrawal.delete({ where: { id } });
  });
}
