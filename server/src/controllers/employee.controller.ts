import type { Request, Response } from "express";
import * as employeeService from "../services/employee.service.js";
import { ServiceError } from "../services/employee.service.js";

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
    res.json(await employeeService.getAll());
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// GET ONE
// ============================================================

export async function getById(req: Request, res: Response) {
  try {
    res.json(await employeeService.getById(Number(req.params.id)));
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// CREATE
// ============================================================

export async function create(req: Request, res: Response) {
  try {
    res.status(201).json(await employeeService.create(req.body));
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function update(req: Request, res: Response) {
  try {
    res.json(await employeeService.update(Number(req.params.id), req.body));
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================
// DELETE
// ============================================================

export async function remove(req: Request, res: Response) {
  try {
    await employeeService.remove(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}
