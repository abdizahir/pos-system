// server/src/services/user.service.ts
//
// User accounts. Managed on the server with: npm run users -- help

import bcrypt from "bcrypt";

import { prisma } from "../db/prisma.js";
import { USER_ROLES, type UserRole } from "./auth.service.js";
import { ServiceError } from "./service-error.js";

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

function parseRole(value: unknown): UserRole {
  const role = String(value ?? "").toUpperCase();
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new ServiceError(`Role must be one of: ${USER_ROLES.join(", ")}.`);
  }
  return role as UserRole;
}

function parsePassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 8) {
    throw new ServiceError("Password must be at least 8 characters.");
  }
  return password;
}

async function findByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new ServiceError(`No user with email ${email}.`, 404);
  return user;
}

// Only one active manager: they are the one who takes owner withdrawals
async function assertNoOtherManager(exceptId?: number) {
  const other = await prisma.user.findFirst({
    where: {
      role: "MANAGER",
      isActive: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { email: true },
  });

  if (other) {
    throw new ServiceError(
      `${other.email} is already the manager. There can only be one active manager.`,
      409,
    );
  }
}

export async function listUsers() {
  return prisma.user.findMany({ select: PUBLIC_FIELDS, orderBy: { id: "asc" } });
}

export async function createUser(email: string, password: string, role: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ServiceError("Enter a valid email address.");
  }

  const parsedRole = parseRole(role);

  if (await prisma.user.findUnique({ where: { email: normalized } })) {
    throw new ServiceError("A user with this email already exists.", 409);
  }

  if (parsedRole === "MANAGER") await assertNoOtherManager();

  return prisma.user.create({
    data: {
      email: normalized,
      passwordHash: await bcrypt.hash(parsePassword(password), 10),
      role: parsedRole,
    },
    select: PUBLIC_FIELDS,
  });
}

export async function setRole(email: string, role: string) {
  const user = await findByEmail(email);
  const parsedRole = parseRole(role);
  if (parsedRole === "MANAGER" && user.isActive) await assertNoOtherManager(user.id);

  return prisma.user.update({ where: { id: user.id }, data: { role: parsedRole }, select: PUBLIC_FIELDS });
}

export async function setActive(email: string, isActive: boolean) {
  const user = await findByEmail(email);
  if (isActive && user.role === "MANAGER") await assertNoOtherManager(user.id);

  return prisma.user.update({ where: { id: user.id }, data: { isActive }, select: PUBLIC_FIELDS });
}

export async function setPassword(email: string, password: string) {
  const user = await findByEmail(email);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsePassword(password), 10) },
  });
}
