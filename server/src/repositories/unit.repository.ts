import { prisma } from "../db/prisma.js";

export async function findAll() {
  return prisma.unit.findMany({
    orderBy: {
      name: "asc",
    },
  });
}