import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import categoryRoutes from "./routes/category.route.js";
import unitRoutes from "./routes/unit.route.js";
import saleRouter from "./routes/sale.routes.js";
import saleReturnRouter from "./routes/SaleReturn.route.js";
import supplierRouter from "./routes/supplier.routes.js";
import purchaseRouter from "./routes/purchase.routes.js";
import expenseRouter from "./routes/expense.routes.js";
import accountsRoutes from "./routes/accounts.routes.js";
import journalEntryRoutes from "./routes/journalEntry.routes.js";
import reportRoutes from "./routes/report.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import helmet from "helmet";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./db/prisma.js";
import type { Request, Response, NextFunction } from "express";
import {
  authenticate,
  managementForWrites,
  requireManagement,
} from "./middleware/auth.middleware.js";

const app = express();

// Behind a hosting proxy (e.g. Railway): use the visitor's real IP, so
// the login rate limit counts each visitor separately
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet());

// The shop's website address(es), comma-separated, e.g.
// "https://shop.up.railway.app". Browsers send the origin without a
// trailing "/", so spaces and trailing slashes are removed here.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

console.log(`CORS allows: ${allowedOrigins.join(", ") || "(none)"}`);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// ------------------------------------------------------------
// Public
// ------------------------------------------------------------

// For the host's health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// This shop's details for the login page, invoices and reports.
// Each shop's install sets them in its own environment variables.
app.get("/api/shop", (_req: Request, res: Response) => {
  res.json({
    name: process.env.SHOP_NAME?.trim() || "My Shop",
    address: process.env.SHOP_ADDRESS?.trim() || null,
    phone: process.env.SHOP_PHONE?.trim() || null,
    tin: process.env.SHOP_TIN?.trim() || null,
  });
});

app.use("/api/auth", authRoutes);

// ------------------------------------------------------------
// Everything below needs a valid login
// ------------------------------------------------------------
app.use("/api", authenticate);

// Who am I? Role comes from the database, so menus stay accurate
app.get("/api/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Cashier (teller) and manager: selling, returns and customers
app.use("/api/sales", saleRouter);
app.use("/api/sale-returns", saleReturnRouter);
app.use("/api/customers", customerRoutes);

// Anyone can look up (the POS needs products and accounts); only the manager can change
app.use("/api/products", managementForWrites, productRoutes);
app.use("/api/stocks", managementForWrites, stockRoutes);
app.use("/api/categories", managementForWrites, categoryRoutes);
app.use("/api/units", managementForWrites, unitRoutes);
app.use("/api/accounts", managementForWrites, accountsRoutes);
app.use("/api/suppliers", managementForWrites);
app.use("/api", supplierRouter);

// Manager: dashboard, money, people and reports
app.use("/api/dashboard", requireManagement, dashboardRoutes);
app.use("/api/purchases", requireManagement, purchaseRouter);
app.use("/api/expenses", requireManagement, expenseRouter);
app.use("/api/journal-entries", requireManagement, journalEntryRoutes);
app.use("/api/employees", requireManagement, employeeRoutes);
app.use("/api/payroll", requireManagement, payrollRoutes);
app.use("/api/reports", requireManagement, reportRoutes);

// User accounts are managed on the server: npm run users -- help

// Turn errors into safe responses. Database and unexpected errors
// never expose their internals to the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A record with these details already exists." });
    }
    if (err.code === "P2003") {
      return res.status(409).json({
        message: "This record is still used by other records (for example sales or stock) and can't be deleted.",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found." });
    }
  }

  // Form validation (zod): tell the user which field is wrong
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    return res.status(400).json({
      message: issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid input.",
    });
  }

  console.error(err);

  // Plain validation errors thrown by our services
  if (err instanceof Error && err.constructor === Error && !err.name.startsWith("Prisma")) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: "Something went wrong on the server." });
});

export default app;
