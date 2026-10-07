import type { NextFunction, Request, Response } from "express";
import * as categoryService from "../services/category.service.js";

export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await categoryService.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
}