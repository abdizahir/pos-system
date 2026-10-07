import { prisma } from "../db/prisma.js";

export async function findAll() {
    return prisma.category.findMany({
        orderBy: {
            name: "asc",
        }
    })
}