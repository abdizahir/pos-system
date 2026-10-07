// server/src/routes/staff.routes.ts  (mounted behind requireManagement)

import { Router, type Request, type Response } from "express";

import { getStaffPerformance } from "../services/staff.service.js";

const router = Router();

// GET /api/staff/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/performance", async (req: Request, res: Response) => {
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const fromRaw = String(req.query.from ?? "");
  const toRaw = String(req.query.to ?? "");

  if (!day.test(fromRaw) || !day.test(toRaw)) {
    return res.status(400).json({ message: "from and to must be dates like 2026-10-01" });
  }

  try {
    res.json(
      await getStaffPerformance(
        new Date(`${fromRaw}T00:00:00.000`),
        new Date(`${toRaw}T23:59:59.999`),
      ),
    );
  } catch (err) {
    console.error("Staff performance error:", err);
    res.status(500).json({ message: "Failed to load staff performance" });
  }
});

export default router;
