import { Router } from "express";
import rateLimit from "express-rate-limit";

import { login } from "../controllers/auth.controller.js";
import { loginSchema } from "../validators/validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// Slow down password guessing: 10 failed tries per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

// Users are created on the server: npm run users -- help
router.post("/login", loginLimiter, validate(loginSchema), login);

export default router;
