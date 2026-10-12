// Shared pieces for the sale modals (view / resume / return / cancel),
// matching the system modal design used by Add Purchase, Add Expense, etc.

import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";

import type { Account } from "../../../api/api";
import {
  FIELD,
  LABEL,
  STATUS_STYLE,
  accountsForMethod,
  type PaymentMethod,
} from "./saleHelpers";

// ------------------------------------------------------------
// Header: title on the left, red close button on the right
// ------------------------------------------------------------

export function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3.75">
        <div>
          <h4 className="text-lg text-text-two font-semibold">{title}</h4>
          {subtitle && <p className="text-sm text-[#646B72]">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
    </>
  );
}

// ------------------------------------------------------------
// Footer: grey Cancel + orange (or red) action
// ------------------------------------------------------------

export function ModalFooter({
  onCancel,
  cancelLabel = "Cancel",
  action,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  };
}) {
  return (
    <>
      <hr className="border-t border-[#D1D5DB]" />
      <div className="flex items-center justify-end gap-2 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md bg-gray-600 text-white text-sm cursor-pointer"
        >
          {cancelLabel}
        </button>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`px-4 py-2 rounded-md text-white text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              action.danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[#FE9F43] hover:bg-[#e88d2f]"
            }`}
          >
            {action.label}
          </button>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Small building blocks
// ------------------------------------------------------------

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#E6EAED] bg-white ${className}`}>
      {children}
    </div>
  );
}

export function SummaryRow({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "red" | "green";
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 text-sm ${
        strong ? "border-t border-[#E6EAED] mt-1 pt-2.5 font-semibold text-text-two" : "text-[#646B72]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums ${
          tone === "red" ? "text-red-500 font-semibold" : tone === "green" ? "text-green-600 font-semibold" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ------------------------------------------------------------
// Payment method + account (bank for Bank/Card, wallet or
// merchant for Mobile; cash needs no account)
// ------------------------------------------------------------

export function MethodAndAccount({
  methodLabel,
  method,
  onMethodChange,
  accountId,
  onAccountChange,
  accounts,
  disabled,
}: {
  methodLabel: string;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  accountId: number | null;
  onAccountChange: (accountId: number | null) => void;
  accounts: Account[];
  disabled?: boolean;
}) {
  const options = accountsForMethod(accounts, method);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label htmlFor="sale-method" className={LABEL}>
          {methodLabel}
        </label>
        <select
          id="sale-method"
          value={method}
          onChange={(e) => {
            onMethodChange(e.target.value as PaymentMethod);
            onAccountChange(null);
          }}
          disabled={disabled}
          className={FIELD}
        >
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
          <option value="CARD">Card</option>
          <option value="MOBILE">Mobile</option>
        </select>
      </div>

      {method !== "CASH" && (
        <div>
          <label htmlFor="sale-account" className={LABEL}>
            {method === "MOBILE" ? "Wallet / Merchant" : "Bank Account"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <select
            id="sale-account"
            value={accountId ?? ""}
            onChange={(e) => onAccountChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className={FIELD}
          >
            <option value="">Select account</option>
            {options.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bankName
                  ? `${account.bankName} - ${account.name} (${account.number})`
                  : `${account.name} (${account.number})`}
              </option>
            ))}
          </select>
          {options.length === 0 && (
            <p className="mt-1 text-xs text-red-500">No active accounts for this method.</p>
          )}
        </div>
      )}
    </div>
  );
}

