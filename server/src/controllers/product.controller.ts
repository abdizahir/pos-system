import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as productService from "../services/product.service.js";

// ============================================================
// GET ALL PRODUCTS
// ============================================================

export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const products =
      await productService.getProducts();

    return res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET ONE PRODUCT
// ============================================================

export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);

    const product =
      await productService.getProduct(id);

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CREATE PRODUCT
// ============================================================

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const product =
      await productService.createProduct(req.body);

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);

    const product =
      await productService.updateProduct(
        id,
        req.body,
      );

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// DELETE PRODUCT
// ============================================================

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);

    await productService.deleteProduct(id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}