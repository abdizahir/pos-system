// Helpers shared by the sale modals and the sales table.

import type { Account } from "../../../api/api";

export type PaymentMethod = "CASH" | "CARD" | "MOBILE" | "BANK";

export const FIELD =
  "w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100";

export const LABEL = "text-sm font-medium mb-2 block text-text-two";

export function etb(value: number | string | null | undefined) {
  return `ETB ${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function customerName(
  customer: { fname: string; lname: string } | null | undefined,
) {
  return customer ? `${customer.fname} ${customer.lname}` : "Walk-in Customer";
}

export const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  CANCELLED: "bg-red-50 text-red-500",
  RETURNED: "bg-blue-50 text-blue-600",
};

export function accountsForMethod(accounts: Account[], method: PaymentMethod) {
  if (method === "CASH") return [];
  return accounts.filter(
    (account) =>
      account.status === "ACTIVE" &&
      (method === "MOBILE"
        ? account.type === "WALLET" || account.type === "MERCHANT"
        : account.type === "BANK"),
  );
}

// Server message from an RTK Query error, if it sent one
export function apiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: unknown }).data === "object" &&
    (error as { data?: { message?: unknown } }).data?.message
  ) {
    return String((error as { data: { message: unknown } }).data.message);
  }
  return fallback;
}
