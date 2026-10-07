// server/src/routes/cashFlow.routes.ts

import { Router } from "express";
import { getCashFlowController } from "../controllers/cashFlow.controller.js";

const router = Router();

router.get("/", getCashFlowController);

export default router;