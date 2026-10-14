import { Router } from "express";
import * as customerController from "../controllers/customer.controller.js";
import { requireManagement } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", customerController.list);
router.get("/:id", customerController.getById);
// Cashiers add customers at the till; changing or removing them is
// the manager's job
router.post("/", customerController.create);
router.put("/:id", requireManagement, customerController.update);
router.delete("/:id", requireManagement, customerController.remove);

export default router;