import type { Request, Response } from "express";
import {
  accountService,
  LEDGER_CODE_BY_TYPE,
  type LedgerType,
} from "../services/accounts.service.js";

export const accountController = {
  async getAllAccounts(req: Request, res: Response) {
    try {
      const accounts = await accountService.getAllAccounts();

      return res.status(200).json(accounts);
    } catch (error) {
      console.error("Get all accounts error:", error);

      return res.status(500).json({
        message: "Failed to fetch accounts",
      });
    }
  },

  /**
   * GET /api/accounts/:id
   * Get account by ID
   */
  async getAccountById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid account ID",
        });
      }

      const account = await accountService.getAccountById(id);

      return res.status(200).json(account);
    } catch (error) {
      console.error("Get account error:", error);

      if (error instanceof Error && error.message === "Account not found") {
        return res.status(404).json({
          message: "Account not found",
        });
      }

      return res.status(500).json({
        message: "Failed to fetch account",
      });
    }
  },

  /**
   * GET /api/accounts/ledger/balances
   * Ledger balances for CASH, BANK, WALLET and MERCHANT
   */
  async getLedgerBalances(_req: Request, res: Response) {
    try {
      const balances = await accountService.getLedgerBalancesByType();

      return res.status(200).json(balances);
    } catch (error) {
      console.error("Get ledger balances error:", error);

      return res.status(500).json({
        message: "Failed to fetch ledger balances",
      });
    }
  },

  /**
   * GET /api/accounts/ledger/:type/statement?from=YYYY-MM-DD&to=YYYY-MM-DD&accountIds=1,2
   * Ledger statement for CASH, BANK, WALLET or MERCHANT
   */
  async getLedgerStatementByType(req: Request, res: Response) {
    try {
      const type = String(req.params.type).toUpperCase();

      if (!(type in LEDGER_CODE_BY_TYPE)) {
        return res.status(400).json({
          message: "Invalid account type",
        });
      }

      const from =
        typeof req.query.from === "string" && req.query.from
          ? req.query.from
          : undefined;
      const to =
        typeof req.query.to === "string" && req.query.to
          ? req.query.to
          : undefined;

      const accountIdsParam =
        typeof req.query.accountIds === "string"
          ? req.query.accountIds.trim()
          : "";

      const accountIds = accountIdsParam
        ? accountIdsParam.split(",").map(Number)
        : undefined;

      if (
        accountIds?.some((id) => !Number.isInteger(id) || id <= 0)
      ) {
        return res.status(400).json({
          message: "Invalid account selection",
        });
      }

      const statement = await accountService.getLedgerStatementByType(
        type as LedgerType,
        {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(accountIds ? { accountIds } : {}),
        },
      );

      return res.status(200).json(statement);
    } catch (error) {
      console.error("Get ledger statement error:", error);

      if (
        error instanceof Error &&
        [
          "Invalid date",
          "Invalid account type",
          "Start date must be before end date",
          "Invalid account selection",
          "Cash has no accounts to filter by",
        ].includes(error.message)
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message === "Ledger account not found"
      ) {
        return res.status(404).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Failed to fetch ledger statement",
      });
    }
  },

  /**
   * POST /api/accounts
   * Create a new account
   */
  async createAccount(req: Request, res: Response) {
    try {
      const { bankName, name, number, type, status } = req.body;

      const account = await accountService.createAccount({
        bankName,
        name,
        number,
        type,
        status,
      });

      return res.status(201).json(account);
    } catch (error) {
      console.error("Create account error:", error);

      if (error instanceof Error) {
        if (error.message === "Bank name is required") {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (error.message === "Account name is required") {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (error.message === "Account number is required") {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (error.message === "Account number already exists") {
          return res.status(409).json({
            message: error.message,
          });
        }

        if (error.message === "Invalid account type") {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (error.message === "Invalid account status") {
          return res.status(400).json({
            message: error.message,
          });
        }
      }

      return res.status(500).json({
        message: "Failed to create account",
      });
    }
  },

  /**
   * PUT /api/accounts/:id
   * Update an existing account
   */
  async updateAccount(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid account ID",
        });
      }

      const { bankName, name, number, type, status } = req.body;

      const account = await accountService.updateAccount(id, {
        bankName,
        name,
        number,
        type,
        status,
      });

      return res.status(200).json(account);
    } catch (error) {
      console.error("Update account error:", error);

      if (error instanceof Error) {
        if (error.message === "Account not found") {
          return res.status(404).json({
            message: error.message,
          });
        }

        if (
          error.message === "Bank name cannot be empty" ||
          error.message === "Account name cannot be empty" ||
          error.message === "Account number cannot be empty" ||
          error.message === "Invalid account type" ||
          error.message === "Invalid account status"
        ) {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (error.message === "Account number already exists") {
          return res.status(409).json({
            message: error.message,
          });
        }
      }

      return res.status(500).json({
        message: "Failed to update account",
      });
    }
  },

  /**
   * DELETE /api/accounts/:id
   * Delete an account
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid account ID",
        });
      }

      await accountService.deleteAccount(id);

      return res.status(200).json({
        message: "Account deleted successfully",
      });
    } catch (error) {
      console.error("Delete account error:", error);

      if (
        error instanceof Error &&
        error.message.startsWith("Account has posted transactions")
      ) {
        return res.status(409).json({
          message: error.message,
        });
      }

      if (error instanceof Error && error.message === "Account not found") {
        return res.status(404).json({
          message: "Account not found",
        });
      }

      return res.status(500).json({
        message: "Failed to delete account",
      });
    }
  },
};