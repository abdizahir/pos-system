import { Router } from "express";
import * as payrollController from "../controllers/payroll.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, payrollController.list);
router.post("/pay", authenticate, payrollController.pay);
router.delete("/:id", authenticate, payrollController.undo);

export default router;
