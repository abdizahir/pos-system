import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  deleteJournalEntry,
} from "../repositories/journalEntry.repository.js";

type JournalLineInput = {
  accountId: number;
  paymentAccountId?: number | null;
  debit?: number;
  credit?: number;
};

type CreateJournalEntryInput = {
  date?: Date;
  reference?: string;
  description?: string;
  lines: JournalLineInput[];
};

export const createJournalEntryService = async (
  data: CreateJournalEntryInput
) => {
  if (!data.lines || data.lines.length < 2) {
    throw new Error("A journal entry must have at least two lines");
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of data.lines) {
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;

    if (debit < 0 || credit < 0) {
      throw new Error("Debit and credit amounts cannot be negative");
    }

    if (debit > 0 && credit > 0) {
      throw new Error(
        "A journal line cannot have both debit and credit"
      );
    }

    if (debit === 0 && credit === 0) {
      throw new Error(
        "A journal line must have either a debit or credit amount"
      );
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
    );
  }

  return createJournalEntry(data);
};

export const getJournalEntriesService = async () => {
  return getJournalEntries();
};

export const getJournalEntryByIdService = async (id: number) => {
  const journalEntry = await getJournalEntryById(id);

  if (!journalEntry) {
    throw new Error("Journal entry not found");
  }

  return journalEntry;
};

export const deleteJournalEntryService = async (id: number) => {
  const journalEntry = await getJournalEntryById(id);

  if (!journalEntry) {
    throw new Error("Journal entry not found");
  }

  // Entries posted by a sale, purchase, payroll etc. must be undone
  // from that record, or the books stop matching it
  const source = [
    ["saleId", "a sale"],
    ["purchaseId", "a purchase"],
    ["expenseId", "an expense"],
    ["incomeId", "an income"],
    ["saleReturnId", "a sale return"],
    ["salaryPaymentId", "a salary payment"],
    ["ownerWithdrawalId", "an owner withdrawal"],
    ["vatPaymentId", "a VAT payment"],
  ].find(([field]) => (journalEntry as Record<string, unknown>)[field!] != null);

  if (source) {
    throw new JournalEntryLockedError(
      `This entry was posted by ${source[1]}. Undo or cancel that record instead.`,
    );
  }

  return deleteJournalEntry(id);
};

export class JournalEntryLockedError extends Error {}