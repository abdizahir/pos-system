import { type FormEvent, useState } from "react";
import type { IconType } from "react-icons";
import { FiCreditCard, FiDollarSign, FiHome, FiSmartphone, FiX } from "react-icons/fi";

import {
  useCreateWithdrawalMutation,
  useGetAccountsQuery,
  useGetLedgerBalancesQuery,
  useGetOwnersQuery,
  type OwnerWithdrawal,
} from "../../../../api/api";

type Method = OwnerWithdrawal["paymentMethod"];

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

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100";

type Props = {
  ownerId?: number;
  onClose: () => void;
};

export default function WithdrawalForm({ ownerId, onClose }: Props) {
  const { data: owners = [] } = useGetOwnersQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: balances } = useGetLedgerBalancesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [createWithdrawal, { isLoading }] = useCreateWithdrawalMutation();

  const [selectedOwner, setSelectedOwner] = useState<number | "">(ownerId ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Method>("CASH");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const value = Number(amount);

    if (!selectedOwner) return setFormError("Please select an owner.");
    if (!Number.isFinite(value) || value <= 0) {
      return setFormError("Amount must be greater than 0.");
    }
    if (method !== "CASH" && accountId === null) {
      return setFormError(`Select a ${method === "MOBILE" ? "wallet or merchant" : "bank"} account.`);
    }
    if (available !== undefined && value > available) {
      return setFormError(`Not enough money. Only ${money(available)} is available.`);
    }

    try {
      await createWithdrawal({
        ownerId: Number(selectedOwner),
        amount: value,
        date,
        paymentMethod: method,
        accountId: method === "CASH" ? null : accountId,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      }).unwrap();
      onClose();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data
          ? String(error.data.message)
          : "Unable to record the withdrawal.";

      setFormError(message);
    }
  };

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.75">
        <div className="text-left">
          <h4 className="text-lg text-text-two font-semibold">Owner Withdrawal</h4>
          <p className="text-xs text-[#646B72]">Posts to 3100 Owner Withdrawals</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
          aria-label="Close"
        >
          <FiX size={20} color="white" />
        </button>
      </div>

      <hr className="border-t border-[#D1D5DB]" />

      <form autoComplete="off" onSubmit={handleSubmit}>
        <div className="p-5 max-h-[60vh] overflow-y-auto text-left space-y-4">
          <div>
            <label htmlFor="owner" className="block text-sm font-medium mb-2">
              Owner <span className="text-red-500">*</span>
            </label>
            <select
              id="owner"
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value ? Number(e.target.value) : "")}
              disabled={isLoading}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select owner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fname} {owner.lname}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-2">
                Amount (ETB) <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className={`${inputClass} tabular-nums`}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-2">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Take from</span>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setMethod(value);
                    setAccountId(null);
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border py-2 text-xs font-medium transition ${
                    method === value
                      ? "border-[#FE9F43] bg-[#FFF7ED] text-[#E8862A]"
                      : "border-gray-300 bg-white text-[#646B72] hover:bg-gray-50"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {method !== "CASH" && (
            <div>
              <label htmlFor="account" className="block text-sm font-medium mb-2">
                {method === "MOBILE" ? "Wallet / Merchant account" : "Bank account"}
              </label>
              <select
                id="account"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                disabled={isLoading}
                className={`${inputClass} bg-white`}
              >
                <option value="">Select account</option>
                {methodAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName
                      ? `${account.bankName} · ${account.name} (${account.number})`
                      : `${account.name} (${account.number})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {available !== undefined && (
            <p className="text-xs text-[#646B72]">
              Available: <span className="font-semibold text-text-two">{money(available)}</span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reference" className="block text-sm font-medium mb-2">
                Reference
              </label>
              <input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt / transfer ID"
                disabled={isLoading}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2">
                Notes
              </label>
              <input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                disabled={isLoading}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {formError && (
          <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700">
            {formError}
          </p>
        )}

        <hr className="border-t border-[#D1D5DB]" />

        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || owners.length === 0}
            className="bg-[#FE9F43] text-white px-4 py-2 rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Make Withdrawal"}
          </button>
        </div>
      </form>
    </div>
  );
}
