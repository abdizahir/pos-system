import type { Request, Response } from "express";
import * as customerService from "../services/customer.service.js";
import { ServiceError } from "../services/customer.service.js";

// ============================================================
// ERROR HANDLER
// ============================================================

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
// GET ALL
// ============================================================

export async function list(_req: Request, res: Response) {
  try {
    const customers = await customerService.getAll();
    res.json(customers);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// GET ONE
// ============================================================

export async function getById(req: Request, res: Response) {
  try {
    const customer = await customerService.getById(
      Number(req.params.id),
    );
    res.json(customer);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// CREATE
// ============================================================

export async function create(req: Request, res: Response) {
  try {
    const customer = await customerService.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function update(req: Request, res: Response) {
  try {
    const customer = await customerService.update(
      Number(req.params.id),
      req.body,
    );
    res.json(customer);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// DELETE
// ============================================================

export async function remove(req: Request, res: Response) {
  try {
    await customerService.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}