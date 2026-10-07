import type { Request, Response } from "express";
import * as ownerService from "../services/owner.service.js";
import { ServiceError } from "../services/service-error.js";

function handleError(err: unknown, res: Response) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res
    .status(500)
    .json({ message: "Something went wrong on the server." });
}

// ============================================================
// OWNERS
// ============================================================

export async function list(_req: Request, res: Response) {
  try {
    res.json(await ownerService.getAll());
  } catch (err) {
    handleError(err, res);
  }
}

export async function getById(req: Request, res: Response) {
  try {
    res.json(await ownerService.getById(Number(req.params.id)));
  } catch (err) {
    handleError(err, res);
  }
}

export async function create(req: Request, res: Response) {
  try {
    res.status(201).json(await ownerService.create(req.body));
  } catch (err) {
    handleError(err, res);
  }
}

export async function update(req: Request, res: Response) {
  try {
    res.json(await ownerService.update(Number(req.params.id), req.body));
  } catch (err) {
    handleError(err, res);
  }
}

export async function remove(req: Request, res: Response) {
  try {
    await ownerService.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// WITHDRAWALS
// ============================================================

// GET /api/owners/withdrawals?ownerId=1
export async function listWithdrawals(req: Request, res: Response) {
  try {
    const ownerId = Number(req.query.ownerId) || undefined;
    res.json(await ownerService.getWithdrawals(ownerId));
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/owners/withdrawals
export async function createWithdrawal(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized. User information is missing." });
  }

  try {
    res.status(201).json(await ownerService.createWithdrawal(req.body, Number(userId)));
  } catch (err) {
    handleError(err, res);
  }
}

// DELETE /api/owners/withdrawals/:id  (undo)
export async function undoWithdrawal(req: Request, res: Response) {
  try {
    await ownerService.undoWithdrawal(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}
