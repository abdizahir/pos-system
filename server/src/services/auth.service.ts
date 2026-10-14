import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { userRepository } from "../repositories/auth.repository.js";

export const USER_ROLES = ["MANAGER", "CASHIER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Wrong email/password, a duplicate user or a disabled account
export class AuthError extends Error {}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email.trim().toLowerCase());

    // Same message either way so emails can't be probed
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AuthError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new AuthError("This account has been deactivated. Contact your administrator.");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      // About one shop day; signing out also ends it early
      { algorithm: "HS256", expiresIn: "12h" },
    );

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  },
};
