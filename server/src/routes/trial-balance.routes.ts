import { Router } from "express";

import * as trialBalanceController from "../controllers/trial-balance.controller.js";

const router = Router();

router.get(
  "/",
  trialBalanceController.getTrialBalance,
);

export default router;