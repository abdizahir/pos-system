// server/src/controllers/vat.controller.ts

import type { Request, Response } from "express";
import { getVatStatement } from "../services/vat.service.js";
import * as vatPaymentService from "../services/vatPayment.service.js";
import { ServiceError } from "../services/service-error.js";

function handleError(err: unknown, res: Response, fallback: string) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ message: fallback });
}

// GET /api/reports/vat/payments?from&to
export async function listVatPaymentsController(req: Request, res: Response) {
  try {
    const day = (value: unknown, edge: string) =>
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T${edge}`)
        : undefined;

    res.json(
      await vatPaymentService.getVatPayments({
        from: day(req.query.from, "00:00:00.000"),
        to: day(req.query.to, "23:59:59.999"),
      }),
    );
  } catch (err) {
    handleError(err, res, "Failed to fetch VAT payments");
  }
}

// GET /api/reports/vat/payable  (VAT owed right now)
export async function vatPayableController(_req: Request, res: Response) {
  try {
    res.json(await vatPaymentService.getVatPayableNow());
  } catch (err) {
    handleError(err, res, "Failed to fetch VAT payable");
  }
}

// POST /api/reports/vat/payments
export async function createVatPaymentController(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. User information is missing." });
  }

  try {
    res.status(201).json(await vatPaymentService.createVatPayment(req.body, Number(userId)));
  } catch (err) {
    handleError(err, res, "Failed to record VAT payment");
  }
}

// DELETE /api/reports/vat/payments/:id  (undo)
export async function undoVatPaymentController(req: Request, res: Response) {
  try {
    await vatPaymentService.undoVatPayment(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res, "Failed to undo VAT payment");
  }
}

// GET /api/reports/vat?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getVatController(req: Request, res: Response) {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from : null;
    const toRaw = typeof req.query.to === "string" ? req.query.to : null;

    if (!fromRaw || !toRaw) {
      return res.status(400).json({ message: "from and to are required" });
    }

    // Local start / end of day
    const from = new Date(`${fromRaw}T00:00:00.000`);
    const to = new Date(`${toRaw}T23:59:59.999`);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res
        .status(400)
        .json({ message: "from and to must be valid dates" });
    }

    if (from.getTime() > to.getTime()) {
      return res
        .status(400)
        .json({ message: "from must be before or equal to to" });
    }

    return res.status(200).json(await getVatStatement(from, to));
  } catch (error) {
    console.error("VAT report error:", error);

    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to build VAT report",
    });
  }
}
