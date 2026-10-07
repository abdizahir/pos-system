import { Router } from "express";
import { accountController } from "../controllers/accounts.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Get all accounts
router.get("/", authenticate, accountController.getAllAccounts);

// Get ledger balances by account type
router.get("/ledger/balances", authenticate, accountController.getLedgerBalances);

// Get ledger statement by account type (CASH, BANK, WALLET, MERCHANT)
router.get("/ledger/:type/statement", authenticate, accountController.getLedgerStatementByType);

// Get account by ID
router.get("/:id", authenticate, accountController.getAccountById);

// Create account
router.post("/", authenticate, accountController.createAccount);

// Update account
router.put("/:id", authenticate, accountController.updateAccount);

// Delete account
router.delete("/:id", authenticate, accountController.deleteAccount);

export default router;
