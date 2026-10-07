import { prisma } from "../db/prisma.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  create(data: { email: string; passwordHash: string; role: string }) {
    return prisma.user.create({
      data,
    });
  },
};
