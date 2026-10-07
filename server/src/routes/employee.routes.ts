import { Router } from "express";
import * as employeeController from "../controllers/employee.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Salaries are sensitive, so every route requires login
router.get("/", authenticate, employeeController.list);
router.get("/:id", authenticate, employeeController.getById);
router.post("/", authenticate, employeeController.create);
router.put("/:id", authenticate, employeeController.update);
router.delete("/:id", authenticate, employeeController.remove);

export default router;
