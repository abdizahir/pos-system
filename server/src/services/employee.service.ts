// server/src/services/employee.service.ts

import { prisma } from "../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

import { ServiceError } from "./service-error.js";

export { ServiceError };

const GENDERS = ["MALE", "FEMALE"] as const;
type Gender = (typeof GENDERS)[number];

export type EmployeeInput = {
  nationalId: string;
  fname: string;
  lname: string;
  gender: string;
  email?: string | null;
  address?: string | null;
  salary: number | string;
};

// ============================================================
// VALIDATION
// ============================================================

// National ID: 16 digits, stored as 1234-5678-9012-3456
export function formatNationalId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 16) return null;
  return digits.match(/.{4}/g)!.join("-");
}

function clean(data: EmployeeInput) {
  const nationalIdRaw = String(data.nationalId ?? "").trim();
  const nationalId = formatNationalId(nationalIdRaw);
  const fname = String(data.fname ?? "").trim();
  const lname = String(data.lname ?? "").trim();
  const gender = String(data.gender ?? "").toUpperCase();
  const email = String(data.email ?? "").trim().toLowerCase() || null;
  const address = String(data.address ?? "").trim() || null;
  const salary = Number(data.salary);

  if (!nationalIdRaw) throw new ServiceError("National ID is required.");
  if (!nationalId) {
    throw new ServiceError(
      "National ID must be 16 digits (e.g. 1234-5678-9012-3456).",
    );
  }
  if (!fname) throw new ServiceError("First name is required.");
  if (!lname) throw new ServiceError("Last name is required.");

  if (!GENDERS.includes(gender as Gender)) {
    throw new ServiceError("Gender must be Male or Female.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError("Email address is not valid.");
  }

  if (!Number.isFinite(salary) || salary < 0) {
    throw new ServiceError("Salary must be 0 or more.");
  }

  return {
    nationalId,
    fname,
    lname,
    gender: gender as Gender,
    email,
    address,
    salary: new Prisma.Decimal(salary.toFixed(2)),
  };
}

// Turn unique-constraint errors into friendly messages
function rethrowUnique(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    // The field is in meta.target, or nested under driverAdapterError
    // when using a driver adapter
    const target = JSON.stringify(err.meta ?? {});
    throw new ServiceError(
      target.includes("email")
        ? "An employee with this email already exists."
        : "An employee with this National ID already exists.",
      409,
    );
  }

  throw err;
}

function parseId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("Invalid employee ID.");
  }
  return id;
}

// ============================================================
// SERVICE
// ============================================================

export async function getAll() {
  return prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getById(id: number) {
  const employee = await prisma.employee.findUnique({
    where: { id: parseId(id) },
  });

  if (!employee) throw new ServiceError("Employee not found.", 404);
  return employee;
}

export async function create(data: EmployeeInput) {
  try {
    return await prisma.employee.create({ data: clean(data) });
  } catch (err) {
    rethrowUnique(err);
  }
}

export async function update(id: number, data: EmployeeInput) {
  await getById(id);

  try {
    return await prisma.employee.update({
      where: { id },
      data: clean(data),
    });
  } catch (err) {
    rethrowUnique(err);
  }
}

export async function remove(id: number) {
  await getById(id);

  // Salary history is part of the books, so keep the employee
  const payments = await prisma.salaryPayment.count({ where: { employeeId: id } });
  if (payments > 0) {
    throw new ServiceError(
      `This employee has ${payments} salary payment${payments === 1 ? "" : "s"} and cannot be deleted.`,
      409,
    );
  }

  await prisma.employee.delete({ where: { id } });
}
