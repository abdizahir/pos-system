import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
  FiAlertCircle,
  FiCheck,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiSmartphone,
  FiX,
} from "react-icons/fi";

import {
  useCreateVatPaymentMutation,
  useGetAccountsQuery,
  useGetLedgerBalancesQuery,
  type TaxAuthority,
  type VatPayment,
} from "../../../api/api";
import { AUTHORITIES } from "../vat";

type Method = VatPayment["paymentMethod"];

const METHODS: { value: Method; label: string; icon: IconType }[] = [
  { value: "CASH", label: "Cash", icon: FiDollarSign },
  { value: "BANK", label: "Bank", icon: FiHome },
  { value: "CARD", label: "Card", icon: FiCreditCard },
  { value: "MOBILE", label: "Mobile", icon: FiSmartphone },
];

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function etb(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Props = {
  owed: number;
  onClose: () => void;
};

export default function PayVatModal({ owed, onClose }: Props) {
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: balances } = useGetLedgerBalancesQuery(undefined, { refetchOnMountOrArgChange: true });
  const [createVatPayment, { isLoading }] = useCreateVatPaymentMutation();

  const [authority, setAuthority] = useState<TaxAuthority | "">("");
  const [amount, setAmount] = useState(owed > 0 ? owed.toFixed(2) : "");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Method>("BANK");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isLoading && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isLoading]);

  const methodAccounts = accounts.filter(
    (account) =>
      account.status === "ACTIVE" &&
      (method === "MOBILE"
        ? account.type === "WALLET" || account.type === "MERCHANT"
        : account.type === "BANK"),
  );

  const available =
    method === "CASH"
      ? balances?.CASH
      : accountId !== null
        ? Number(accounts.find((account) => account.id === accountId)?.currentBalance ?? 0)
        : undefined;

  const value = Number(amount);
  const authorityName = AUTHORITIES.find((a) => a.value === authority)?.name;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!authority) return setError("Choose who you are paying.");
    if (!Number.isFinite(value) || value <= 0) return setError("Amount must be greater than 0.");
    if (value > owed + 0.005) return setError(`You only owe ${etb(owed)} in VAT.`);
    if (method !== "CASH" && accountId === null) {
      return setError(`Select a ${method === "MOBILE" ? "wallet or merchant" : "bank"} account.`);
    }
    if (available !== undefined && value > available + 0.005) {
      return setError(`Not enough money — only ${etb(available)} is available.`);
    }

    try {
      await createVatPayment({
        authority,
        amount: value,
        date,
        paymentMethod: method,
        accountId: method === "CASH" ? null : accountId,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      }).unwrap();
      onClose();
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "data" in err &&
        typeof err.data === "object" &&
        err.data !== null &&
        "message" in err.data
          ? String(err.data.message)
          : "Unable to record the VAT payment.";
      setError(message);
    }
  };

  const inputClass =
    "w-full rounded-xl border-0 bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none ring-1 ring-[#E2E8F0] transition focus:bg-white focus:ring-2 focus:ring-[#FE9F43]/50";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748B]";

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-[2px]"
      onClick={() => !isLoading && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Pay VAT</h2>
            <p className="text-sm text-[#64748B]">
              You owe <span className="font-semibold text-[#0F172A]">{etb(owed)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2">
          {/* Authority */}
          <div>
            <span className={labelClass}>Pay to</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {AUTHORITIES.map((option) => {
                const selected = authority === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAuthority(option.value)}
                    className={`relative flex cursor-pointer flex-col items-start gap-1 rounded-2xl p-4 text-left ring-1 transition ${
                      selected
                        ? "bg-[#FFF7ED] ring-2 ring-[#FE9F43]"
                        : "bg-white ring-[#E2E8F0] hover:ring-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold ${
                        selected ? "bg-[#FE9F43] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {option.initials}
                    </span>
                    <span className="text-sm font-semibold leading-snug text-[#0F172A]">{option.name}</span>
                    {selected && (
                      <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#FE9F43] text-white">
                        <FiCheck size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={labelClass.replace("mb-1.5 ", "")}>Amount (ETB)</span>
                {owed > 0 && Number(amount) !== Number(owed.toFixed(2)) && (
                  <button
                    type="button"
                    onClick={() => setAmount(owed.toFixed(2))}
                    className="cursor-pointer text-xs font-semibold text-[#E8862A] hover:underline"
                  >
                    Pay all
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} text-base font-semibold tabular-nums`}
              />
            </div>
            <label className="block">
              <span className={labelClass}>Payment date</span>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {/* Method */}
          <div>
            <span className={labelClass}>Pay from</span>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ value: methodValue, label, icon: Icon }) => (
                <button
                  key={methodValue}
                  type="button"
                  onClick={() => {
                    setMethod(methodValue);
                    setAccountId(null);
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium ring-1 transition ${
                    method === methodValue
                      ? "bg-[#FFF7ED] text-[#E8862A] ring-2 ring-[#FE9F43]"
                      : "bg-white text-[#64748B] ring-[#E2E8F0] hover:ring-[#CBD5E1]"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {method !== "CASH" && (
            <label className="block">
              <span className={labelClass}>{method === "MOBILE" ? "Wallet / Merchant account" : "Bank account"}</span>
              <select
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              >
                <option value="">Select account</option>
                {methodAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName ? `${account.bankName} · ` : ""}
                    {account.name} ({account.number}) — {etb(Number(account.currentBalance))}
                  </option>
                ))}
              </select>
            </label>
          )}

          {available !== undefined && (
            <p className="-mt-2 text-xs text-[#64748B]">
              Available: <span className="font-semibold text-[#0F172A]">{etb(available)}</span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Receipt / reference</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt number"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. September VAT"
                className={inputClass}
              />
            </label>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <footer className="mt-4 flex flex-col-reverse gap-2 border-t border-[#F1F5F9] bg-[#FAFBFC] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || owed <= 0}
            className="cursor-pointer rounded-xl bg-[#FE9F43] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#FE9F43]/30 transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Paying..."
              : `Pay ${Number.isFinite(value) && value > 0 ? etb(value) : "VAT"}${authorityName ? ` to ${authorityName.split(" Revenue")[0]}` : ""}`}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
