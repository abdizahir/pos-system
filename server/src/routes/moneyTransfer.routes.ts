import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { moneyTransferController } from "../controllers/moneyTransfer.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  moneyTransferController.getMoneyTransfers,
);

router.post(
  "/",
  authenticate,
  moneyTransferController.createMoneyTransfer,
);

export default router;
