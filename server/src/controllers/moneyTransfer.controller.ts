import type { Request, Response } from "express";
import { moneyTransferService } from "../services/moneyTransfer.service.js";

export const moneyTransferController = {
  async getMoneyTransfers(
    _req: Request,
    res: Response,
  ) {
    try {
      const transfers =
        await moneyTransferService.getMoneyTransfers();

      return res.status(200).json(transfers);
    } catch (error) {
      console.error(
        "Get money transfers error:",
        error,
      );

      return res.status(500).json({
        message: "Failed to fetch money transfers.",
      });
    }
  },

  async createMoneyTransfer(
    req: Request,
    res: Response,
  ) {
    try {
      const user = req.user;

      if (!user?.id) {
        return res.status(401).json({
          message:
            "Unauthorized. User information is missing.",
        });
      }

      const {
        fromAccountId,
        toAccountId,
        amount,
      } = req.body;

      const transfer =
        await moneyTransferService.createMoneyTransfer({
          fromAccountId: Number(fromAccountId),
          toAccountId: Number(toAccountId),
          amount: Number(amount),
          userId: Number(user.id),
        });

      return res.status(201).json(transfer);
    } catch (error) {
      console.error(
        "Create money transfer error:",
        error,
      );

      if (error instanceof Error) {
        if (
          error.message ===
            "Invalid from account ID." ||
          error.message ===
            "Invalid to account ID." ||
          error.message ===
            "From account and to account must be different." ||
          error.message ===
            "Transfer amount must be greater than 0." ||
          error.message ===
            "Invalid user ID."
        ) {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (
          error.message ===
            "From account not found." ||
          error.message === "To account not found."
        ) {
          return res.status(404).json({
            message: error.message,
          });
        }

        if (
          error.message ===
            "From account is inactive." ||
          error.message === "To account is inactive."
        ) {
          return res.status(400).json({
            message: error.message,
          });
        }

        if (
          error.message ===
          "Insufficient balance in from account."
        ) {
          return res.status(409).json({
            message: error.message,
          });
        }
      }

      return res.status(500).json({
        message: "Failed to create money transfer.",
      });
    }
  },
};
