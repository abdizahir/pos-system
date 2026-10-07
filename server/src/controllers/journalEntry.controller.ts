import type { Request, Response } from "express";

import {
  createJournalEntryService,
  getJournalEntriesService,
  getJournalEntryByIdService,
  deleteJournalEntryService,
  JournalEntryLockedError,
} from "../services/journalEntry.service.js";

export const createJournalEntry = async (req: Request, res: Response) => {
  try {
    const { date, reference, description, lines } = req.body;

    const journalEntry = await createJournalEntryService({
      ...(date ? { date: new Date(date) } : {}),
      ...(reference !== undefined ? { reference } : {}),
      ...(description !== undefined ? { description } : {}),
      lines,
    });

    return res.status(201).json(journalEntry);
  } catch (error) {
    console.error("Failed to create journal entry:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create journal entry",
    });
  }
};

export const getJournalEntries = async (_req: Request, res: Response) => {
  try {
    const journalEntries = await getJournalEntriesService();

    return res.status(200).json(journalEntries);
  } catch (error) {
    console.error("Failed to get journal entries:", error);

    return res.status(500).json({
      message: "Failed to get journal entries",
    });
  }
};

export const getJournalEntryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid journal entry ID",
      });
    }

    const journalEntry = await getJournalEntryByIdService(id);

    return res.status(200).json(journalEntry);
  } catch (error) {
    console.error("Failed to get journal entry:", error);

    return res.status(404).json({
      message:
        error instanceof Error ? error.message : "Journal entry not found",
    });
  }
};

export const deleteJournalEntry = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid journal entry ID",
      });
    }

    await deleteJournalEntryService(id);

    return res.status(200).json({
      message: "Journal entry deleted successfully",
    });
  } catch (error) {
    if (error instanceof JournalEntryLockedError) {
      return res.status(409).json({ message: error.message });
    }

    console.error("Failed to delete journal entry:", error);

    return res.status(404).json({
      message:
        error instanceof Error ? error.message : "Journal entry not found",
    });
  }
};
