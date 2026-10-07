import type { Request, Response } from "express";
import { AuthError, authService } from "../services/auth.service.js";

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
