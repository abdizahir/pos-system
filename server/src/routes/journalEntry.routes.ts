import { Router } from "express";

import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  deleteJournalEntry,
} from "../controllers/journalEntry.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createJournalEntry);
router.get("/", authenticate, getJournalEntries);
router.get("/:id", authenticate, getJournalEntryById);
router.delete("/:id", authenticate, deleteJournalEntry);

export default router;
