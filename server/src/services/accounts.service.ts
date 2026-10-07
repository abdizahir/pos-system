import {
  AccountStatus,
  AccountType,
} from "../../generated/prisma/client.js";

import { accountRepository } from "../repositories/accounts.repository.js";
import { prisma } from "../db/prisma.js";
import {
  CHART_CODE_BY_ACCOUNT_TYPE,
  getLedgerBalance,
  getLedgerBalances,
} from "../utils/payment-accounts.js";

import type {
  CreateAccountData,
  UpdateAccountData,
} from "../repositories/accounts.repository.js";

export const LEDGER_CODE_BY_TYPE = {
  CASH: "1000",
  ...CHART_CODE_BY_ACCOUNT_TYPE,
} as const;

export type LedgerType = keyof typeof LEDGER_CODE_BY_TYPE;

// "YYYY-MM-DD" -> start or end of that day
function parseDay(value: string, edge: "start" | "end") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date");
  }

  const date = new Date(
    `${value}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}`,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return date;
}

function ledgerSource(entry: {
  description: string | null;
  saleId: number | null;
  purchaseId: number | null;
  expenseId: number | null;
  incomeId: number | null;
  salaryPaymentId: number | null;
  ownerWithdrawalId: number | null;
  vatPaymentId: number | null;
  saleReturnId: number | null;
}) {
  if (entry.saleReturnId) return "Sale Return";
  if (entry.saleId) return "Sale";
  if (entry.expenseId) return "Expense";
  if (entry.incomeId) return "Income";
  if (entry.salaryPaymentId) return "Salary";
  if (entry.ownerWithdrawalId) return "Owner Withdrawal";
  if (entry.vatPaymentId) return "VAT Payment";

  if (entry.purchaseId) {
    return entry.description?.startsWith("Supplier payment")
      ? "Supplier Payment"
      : "Purchase";
  }

  if (entry.description?.startsWith("Money transfer")) {
    return "Transfer";
  }

  return "Journal";
}

export const accountService = {
  // --------------------------------------------------
  // GET ALL ACCOUNTS
  // --------------------------------------------------
  // currentBalance comes from posted journal lines
  async getAllAccounts() {
    const accounts = await accountRepository.findAll();
    const balances = await getLedgerBalances(
      prisma,
      accounts.map((account) => account.id),
    );

    return accounts.map((account) => ({
      ...account,
      currentBalance: balances.get(account.id) ?? 0,
    }));
  },

  // --------------------------------------------------
  // GET ACCOUNT BY ID
  // --------------------------------------------------
  async getAccountById(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Invalid account ID");
    }

    const account = await accountRepository.findById(id);

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      ...account,
      currentBalance: await getLedgerBalance(prisma, id),
    };
  },

  // --------------------------------------------------
  // LEDGER BALANCES BY TYPE
  // --------------------------------------------------
  // Chart account balances for CASH (1000), BANK (1010),
  // WALLET (1020) and MERCHANT (1030)
  async getLedgerBalancesByType() {
    const codes = Object.values(LEDGER_CODE_BY_TYPE);
    const rows = await accountRepository.sumLedgerByChartCodes(codes);

    const balances = {} as Record<LedgerType, number>;

    for (const [type, code] of Object.entries(LEDGER_CODE_BY_TYPE)) {
      balances[type as LedgerType] = rows.get(code) ?? 0;
    }

    return balances;
  },

  // --------------------------------------------------
  // LEDGER STATEMENT BY ACCOUNT TYPE
  // --------------------------------------------------
  // Built from posted journal lines (chart accounts 1000-1030).
  // Pass accountIds to narrow to specific bank / wallet /
  // merchant accounts.
  async getLedgerStatementByType(
    type: LedgerType,
    options: {
      from?: string;
      to?: string;
      accountIds?: number[];
    } = {},
  ) {
    const { from, to } = options;
    const accountIds = options.accountIds?.length
      ? Array.from(new Set(options.accountIds))
      : undefined;

    const code = LEDGER_CODE_BY_TYPE[type];

    if (!code) {
      throw new Error("Invalid account type");
    }

    const fromDate = from ? parseDay(from, "start") : undefined;
    const toDate = to ? parseDay(to, "end") : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new Error("Start date must be before end date");
    }

    const chartAccount =
      await accountRepository.findChartAccountByCode(code);

    if (!chartAccount) {
      throw new Error("Ledger account not found");
    }

    // Selected accounts must exist and belong to this type
    const accounts = accountIds
      ? await accountRepository.findManyByIds(accountIds)
      : [];

    if (accountIds) {
      if (type === "CASH") {
        throw new Error("Cash has no accounts to filter by");
      }

      if (
        accounts.length !== accountIds.length ||
        accounts.some((account) => account.type !== type)
      ) {
        throw new Error("Invalid account selection");
      }
    }

    let openingBalance = 0;

    if (fromDate) {
      const before = await accountRepository.sumLedgerBefore(
        chartAccount.id,
        fromDate,
        accountIds,
      );

      openingBalance =
        Number(before._sum.debit ?? 0) -
        Number(before._sum.credit ?? 0);
    }

    const lines = await accountRepository.findLedgerLines(
      chartAccount.id,
      fromDate,
      toDate,
      accountIds,
    );

    let runningBalance = openingBalance;
    let totalIn = 0;
    let totalOut = 0;

    const transactions = lines.map((line) => {
      const amountIn = Number(line.debit);
      const amountOut = Number(line.credit);
      const entry = line.journalEntry;

      runningBalance += amountIn - amountOut;
      totalIn += amountIn;
      totalOut += amountOut;

      return {
        id: line.id,
        journalEntryId: entry.id,
        date: entry.date.toISOString(),
        source: ledgerSource(entry),
        reference: entry.reference,
        description: entry.description ?? "",
        account: line.paymentAccount,
        amountIn,
        amountOut,
        balance: runningBalance,
      };
    });

    // Newest first
    transactions.reverse();

    return {
      ledger: {
        type,
        code: chartAccount.code,
        name: chartAccount.name,
      },
      accounts: accounts.map((account) => ({
        id: account.id,
        bankName: account.bankName,
        name: account.name,
        number: account.number,
        type: account.type,
      })),
      period: {
        from: from ?? null,
        to: to ?? null,
      },
      summary: {
        openingBalance,
        totalIn,
        totalOut,
        closingBalance: runningBalance,
        transactionCount: transactions.length,
      },
      transactions,
    };
  },

  // --------------------------------------------------
  // CREATE ACCOUNT
  // --------------------------------------------------
  async createAccount(data: CreateAccountData) {
    // Validate account type
    const validTypes = Object.values(AccountType);

    if (!validTypes.includes(data.type)) {
      throw new Error("Invalid account type");
    }

    // Validate account name
    if (!data.name || data.name.trim() === "") {
      throw new Error("Account name is required");
    }

    // Validate account number
    if (!data.number || data.number.trim() === "") {
      throw new Error("Account number is required");
    }

    const name = data.name.trim();
    const number = data.number.trim();

    // Bank name is required only for BANK accounts
    const bankName = data.bankName?.trim() || null;

    if (data.type === AccountType.BANK && !bankName) {
      throw new Error("Bank name is required for bank accounts");
    }

    // Check duplicate account number
    const existingAccount =
      await accountRepository.findByNumber(number);

    if (existingAccount) {
      throw new Error("Account number already exists");
    }

    // Validate status if supplied
    if (data.status !== undefined) {
      const validStatuses = Object.values(AccountStatus);

      if (!validStatuses.includes(data.status)) {
        throw new Error("Invalid account status");
      }
    }

    return accountRepository.create({
      bankName,
      name,
      number,
      type: data.type,
      status: data.status ?? AccountStatus.ACTIVE,
    });
  },

  // --------------------------------------------------
  // UPDATE ACCOUNT
  // --------------------------------------------------
  async updateAccount(id: number, data: UpdateAccountData) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Invalid account ID");
    }

    const existingAccount =
      await accountRepository.findById(id);

    if (!existingAccount) {
      throw new Error("Account not found");
    }

    const updateData: UpdateAccountData = {};

    // ----------------------------------------------
    // Determine the resulting account type
    // ----------------------------------------------
    const newType =
      data.type !== undefined
        ? data.type
        : existingAccount.type;

    // Validate type
    if (data.type !== undefined) {
      const validTypes = Object.values(AccountType);

      if (!validTypes.includes(data.type)) {
        throw new Error("Invalid account type");
      }

      updateData.type = data.type;
    }

    // ----------------------------------------------
    // Account name
    // ----------------------------------------------
    if (data.name !== undefined) {
      const name = data.name.trim();

      if (name === "") {
        throw new Error("Account name cannot be empty");
      }

      updateData.name = name;
    }

    // ----------------------------------------------
    // Account number
    // ----------------------------------------------
    if (data.number !== undefined) {
      const number = data.number.trim();

      if (number === "") {
        throw new Error("Account number cannot be empty");
      }

      const accountWithNumber =
        await accountRepository.findByNumber(number);

      if (
        accountWithNumber &&
        accountWithNumber.id !== id
      ) {
        throw new Error("Account number already exists");
      }

      updateData.number = number;
    }

    // ----------------------------------------------
    // Bank name
    // ----------------------------------------------
    if (data.bankName !== undefined) {
      const bankName = data.bankName?.trim() || null;

      if (
        newType === AccountType.BANK &&
        !bankName
      ) {
        throw new Error(
          "Bank name is required for bank accounts"
        );
      }

      updateData.bankName = bankName;
    } else {
      // If changing an account to BANK,
      // make sure an existing bank name is available.
      if (
        newType === AccountType.BANK &&
        !existingAccount.bankName
      ) {
        throw new Error(
          "Bank name is required for bank accounts"
        );
      }

      // If changing to WALLET, keep the existing
      // bankName unless the frontend explicitly clears it.
    }

    // ----------------------------------------------
    // Status
    // ----------------------------------------------
    if (data.status !== undefined) {
      const validStatuses = Object.values(AccountStatus);

      if (!validStatuses.includes(data.status)) {
        throw new Error("Invalid account status");
      }

      updateData.status = data.status;
    }

    return accountRepository.update(id, updateData);
  },

  // --------------------------------------------------
  // DELETE ACCOUNT
  // --------------------------------------------------
  async deleteAccount(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Invalid account ID");
    }

    const existingAccount =
      await accountRepository.findById(id);

    if (!existingAccount) {
      throw new Error("Account not found");
    }

    // Posted history must stay intact; deactivate instead
    if (await accountRepository.hasJournalLines(id)) {
      throw new Error(
        "Account has posted transactions and cannot be deleted. Set it to INACTIVE instead.",
      );
    }

    return accountRepository.delete(id);
  },
};