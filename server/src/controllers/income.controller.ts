// server/src/controllers/income.controller.ts

import type { Request, Response } from "express";
import {
  createIncome,
  deleteIncome,
  getIncomeById,
  getIncomes,
  updateIncome,
} from "../services/income.service.js";

const NOT_FOUND = "Income not found";

function parseId(req: Request) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendError(res: Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === NOT_FOUND) {
    return res.status(404).json({ message });
  }

  // Validation errors from the service are user-facing
  if (error instanceof Error && !("code" in error)) {
    return res.status(400).json({ message });
  }

  return res.status(500).json({ message: fallback });
}

// GET /api/incomes?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getIncomesController(req: Request, res: Response) {
  try {
    const from =
      typeof req.query.from === "string" && req.query.from
        ? new Date(`${req.query.from}T00:00:00.000`)
        : undefined;
    const to =
      typeof req.query.to === "string" && req.query.to
        ? new Date(`${req.query.to}T23:59:59.999`)
        : undefined;

    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime()))
    ) {
      return res.status(400).json({ message: "Invalid date" });
    }

    return res.status(200).json(await getIncomes({ from, to }));
  } catch (error) {
    console.error("Get incomes error:", error);
    return res.status(500).json({ message: "Failed to fetch income" });
  }
}

// GET /api/incomes/:id
export async function getIncomeByIdController(req: Request, res: Response) {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: "Invalid income ID" });

  try {
    return res.status(200).json(await getIncomeById(id));
  } catch (error) {
    console.error("Get income error:", error);
    return sendError(res, error, "Failed to fetch income");
  }
}

// POST /api/incomes
export async function createIncomeController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized. User information is missing.",
    });
  }

  try {
    const income = await createIncome(req.body, Number(userId));
    return res.status(201).json(income);
  } catch (error) {
    console.error("Create income error:", error);
    return sendError(res, error, "Failed to create income");
  }
}

// PUT /api/incomes/:id
export async function updateIncomeController(req: Request, res: Response) {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: "Invalid income ID" });

  try {
    return res.status(200).json(await updateIncome(id, req.body));
  } catch (error) {
    console.error("Update income error:", error);
    return sendError(res, error, "Failed to update income");
  }
}

// DELETE /api/incomes/:id
export async function deleteIncomeController(req: Request, res: Response) {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: "Invalid income ID" });

  try {
    await deleteIncome(id);
    return res.status(200).json({ message: "Income deleted successfully" });
  } catch (error) {
    console.error("Delete income error:", error);
    return sendError(res, error, "Failed to delete income");
  }
}
