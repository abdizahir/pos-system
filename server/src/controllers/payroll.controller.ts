import type { Request, Response } from "express";
import * as payrollService from "../services/payroll.service.js";
import { ServiceError } from "../services/employee.service.js";

function handleError(err: unknown, res: Response) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res
    .status(500)
    .json({ message: "Something went wrong on the server." });
}

// GET /api/payroll?period=YYYY-MM
export async function list(req: Request, res: Response) {
  try {
    res.json(await payrollService.getPayments(String(req.query.period ?? "")));
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/payroll/pay
export async function pay(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. User information is missing." });
  }

  try {
    res.status(201).json(await payrollService.paySalaries(req.body, Number(userId)));
  } catch (err) {
    handleError(err, res);
  }
}

// DELETE /api/payroll/:id  (undo a payment)
export async function undo(req: Request, res: Response) {
  try {
    await payrollService.undoPayment(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}
