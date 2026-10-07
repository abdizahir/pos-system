import type { Request, Response } from "express";
import * as supplierService from "../services/supplier.service.js";

// ============================================================
// GET ALL SUPPLIERS
// ============================================================

export async function getSuppliers(
  req: Request,
  res: Response
) {
  try {
    const suppliers = await supplierService.getAllSuppliers();

    return res.status(200).json(suppliers);
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      message: "Failed to fetch suppliers",
    });
  }
}

// ============================================================
// GET SUPPLIER BY ID
// ============================================================

export async function getSupplierById(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid supplier ID",
      });
    }

    const supplier = await supplierService.getSupplierById(id);

    return res.status(200).json(supplier);
  } catch (error) {
    console.error("Get supplier error:", error);

    if (
      error instanceof Error &&
      error.message === "Supplier not found"
    ) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "Invalid supplier ID"
    ) {
      return res.status(400).json({
        message: "Invalid supplier ID",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch supplier",
    });
  }
}

// ============================================================
// CREATE SUPPLIER
// ============================================================

export async function createSupplier(
  req: Request,
  res: Response
) {
  try {
    const { name, email, phone, address } = req.body;

    const supplier = await supplierService.createSupplier({
      name,
      email,
      phone,
      address,
    });

    return res.status(201).json({
      message: "Supplier created successfully",
      supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    if (
      error instanceof Error &&
      error.message === "Supplier name is required"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "A supplier with this name already exists"
    ) {
      return res.status(409).json({
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "A supplier with this email already exists"
    ) {
      return res.status(409).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create supplier",
    });
  }
}

// ============================================================
// UPDATE SUPPLIER
// ============================================================

export async function updateSupplier(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid supplier ID",
      });
    }

    const { name, email, phone, address } = req.body;

    const supplier = await supplierService.updateSupplier(id, {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
    });

    return res.status(200).json({
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    if (!(error instanceof Error)) {
      return res.status(500).json({
        message: "Failed to update supplier",
      });
    }

    switch (error.message) {
      case "Invalid supplier ID":
        return res.status(400).json({
          message: error.message,
        });

      case "Supplier not found":
        return res.status(404).json({
          message: error.message,
        });

      case "Supplier name cannot be empty":
        return res.status(400).json({
          message: error.message,
        });

      case "A supplier with this name already exists":
        return res.status(409).json({
          message: error.message,
        });

      case "A supplier with this email already exists":
        return res.status(409).json({
          message: error.message,
        });

      default:
        return res.status(500).json({
          message: "Failed to update supplier",
        });
    }
  }
}

// ============================================================
// DELETE SUPPLIER
// ============================================================

export async function deleteSupplier(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid supplier ID",
      });
    }

    const supplier = await supplierService.deleteSupplier(id);

    return res.status(200).json({
      message: "Supplier deleted successfully",
      supplier,
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    if (!(error instanceof Error)) {
      return res.status(500).json({
        message: "Failed to delete supplier",
      });
    }

    switch (error.message) {
      case "Invalid supplier ID":
        return res.status(400).json({
          message: error.message,
        });

      case "Supplier not found":
        return res.status(404).json({
          message: error.message,
        });

      case "Cannot delete a supplier with purchase history":
        return res.status(409).json({
          message: error.message,
        });

      case "Cannot delete a supplier with stock history":
        return res.status(409).json({
          message: error.message,
        });

      default:
        return res.status(500).json({
          message: "Failed to delete supplier",
        });
    }
  }
}