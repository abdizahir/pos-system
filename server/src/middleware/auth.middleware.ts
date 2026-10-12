import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { prisma } from "../db/prisma.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = auth.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is missing");
    return res.status(500).json({
      message: "JWT secret is not configured",
    });
  }

  let payload: { id: number };

  try {
    payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as { id: number };
  } catch {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  try {
    // Role and active status come from the database, so a role change
    // or deactivation takes effect immediately, not when the token expires
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Your account is no longer active.",
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (
      allowedRoles.length &&
      !allowedRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "You don't have permission to do this.",
      });
    }

    next();
  };
}

// Running the store: everything except the teller desk is the manager's job
export const requireManagement = authorize("MANAGER");

// Anyone logged in can read; only the manager can change
export function managementForWrites(req: Request, res: Response, next: NextFunction) {
  return req.method === "GET" ? next() : requireManagement(req, res, next);
}
