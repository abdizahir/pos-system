import { Router } from "express";
import * as ownerController from "../controllers/owner.controller.js";
import { authenticate, requireManager } from "../middleware/auth.middleware.js";

const router = Router();

// Withdrawals (before "/:id" so "withdrawals" isn't read as an ID)
router.get("/withdrawals", authenticate, ownerController.listWithdrawals);
// Only the manager takes money out for the owners
router.post("/withdrawals", authenticate, requireManager, ownerController.createWithdrawal);
router.delete("/withdrawals/:id", authenticate, requireManager, ownerController.undoWithdrawal);

// Owners
router.get("/", authenticate, ownerController.list);
router.get("/:id", authenticate, ownerController.getById);
router.post("/", authenticate, ownerController.create);
router.put("/:id", authenticate, ownerController.update);
router.delete("/:id", authenticate, ownerController.remove);

export default router;
