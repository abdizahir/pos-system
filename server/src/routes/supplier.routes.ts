import { Router } from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";

const router = Router();

// GET all suppliers
router.get("/suppliers", getSuppliers);

// GET supplier by ID
router.get("/suppliers/:id", getSupplierById);

// CREATE supplier
router.post("/suppliers", createSupplier);

// UPDATE supplier
router.patch("/suppliers/:id", updateSupplier);

// DELETE supplier
router.delete("/suppliers/:id", deleteSupplier);

export default router;