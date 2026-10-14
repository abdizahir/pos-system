import type { Request, Response } from "express";
import { AuthError, authService } from "../services/auth.service.js";
import { prisma } from "../db/prisma.js";

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    // Bad credentials or disabled account
    if (err instanceof AuthError) {
      return res.status(401).json({ message: err.message });
    }

    // Anything else is a server problem, not the user's password
    console.error("Login error:", err);
    res.status(500).json({ message: "Login is unavailable right now. Please try again." });
  }
}

// POST /api/auth/logout — ends every login of this user, so a copied
// token stops working too
export async function logout(req: Request, res: Response) {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokensValidAfter: new Date() },
    });
    res.json({ message: "Signed out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Could not sign out on the server." });
  }
}
