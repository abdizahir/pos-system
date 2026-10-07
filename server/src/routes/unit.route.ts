import { Router } from "express";
import { getUnits } from "../controllers/unit.controller.js";

const router = Router();

router.get("/", getUnits);

export default router;