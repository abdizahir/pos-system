import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiRotateCcw,
  FiSmartphone,
  FiX,
} from "react-icons/fi";

import {
  useGetAccountsQuery,
  useGetEmployeesQuery,
  useGetSalaryPaymentsQuery,
  usePaySalariesMutation,
  useUndoSalaryPaymentMutation,
  type SalaryPayment,
} from "../../../../api/api";
import { currentPeriod, periodLabel } from "../payroll";

type Method = SalaryPayment["paymentMethod"];

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }),
);

// This year and the four before it
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

const METHODS: { value: Method; label: string; icon: IconType }[] = [
  { value: "CASH", label: "Cash", icon: FiDollarSign },
  { value: "BANK", label: "Bank", icon: FiHome },
  { value: "CARD", label: "Card", icon: FiCreditCard },
  { value: "MOBILE", label: "Mobile", icon: FiSmartphone },
];

function today() {
  const now = new Date();
  return `${currentPeriod()}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function apiError(error: unknown, fallback: string) {
  return typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data
    ? String(error.data.message)
    : fallback;
}

type Props = {
  // Pre-select these employees (e.g. the row's "Pay" button)
  employeeIds?: number[];
  onClose: () => void;
};

export default function PayrollModal({ employeeIds, onClose }: Props) {
  const [period, setPeriod] = useState(currentPeriod);
  const [paidAt, setPaidAt] = useState(today);
  const [method, setMethod] = useState<Method>("CASH");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(employeeIds ?? []),
  );
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const { data: employees = [], isLoading: employeesLoading } = useGetEmployeesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: payments = [], isFetching: paymentsLoading } = useGetSalaryPaymentsQuery(
    period,
    { skip: !/^\d{4}-\d{2}$/.test(period), refetchOnMountOrArgChange: true },
  );

  const [paySalaries, { isLoading: paying }] = usePaySalariesMutation();
  const [undoPayment, { isLoading: undoing }] = useUndoSalaryPaymentMutation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const paidByEmployee = useMemo(
    () => new Map(payments.map((payment) => [payment.employeeId, payment])),
    [payments],
  );

  const unpaid = employees.filter((employee) => !paidByEmployee.has(employee.id));

  // Already-paid employees can't stay selected
  const effectiveSelected = [...selected].filter((id) => !paidByEmployee.has(id));

  const amountFor = (id: number, salary: number | string) =>
    amounts[id] ?? String(Number(salary));

  const items = employees
    .filter((employee) => effectiveSelected.includes(employee.id))
    .map((employee) => ({
      employeeId: employee.id,
      amount: Number(amountFor(employee.id, employee.salary)),
    }));

  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const methodAccounts = accounts.filter(
    (account) =>
      account.status === "ACTIVE" &&
      (method === "MOBILE"
        ? account.type === "WALLET" || account.type === "MERCHANT"
        : account.type === "BANK"),
  );

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allUnpaidSelected =
    unpaid.length > 0 && unpaid.every((employee) => effectiveSelected.includes(employee.id));

  const toggleAll = () =>
    setSelected(allUnpaidSelected ? new Set() : new Set(unpaid.map((employee) => employee.id)));

  const handlePay = async () => {
    setError("");
    setDone("");

    if (items.length === 0) return setError("Select at least one unpaid employee.");
    if (items.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      return setError("Every salary amount must be greater than 0.");
    }
    if (method !== "CASH" && accountId === null) {
      return setError(`Select a ${method === "MOBILE" ? "wallet or merchant" : "bank"} account.`);
    }

    try {
      await paySalaries({
        period,
        paidAt,
        paymentMethod: method,
        accountId: method === "CASH" ? null : accountId,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        items,
      }).unwrap();

      setDone(
        `Paid ${items.length} employee${items.length === 1 ? "" : "s"} · ${money(total)} for ${periodLabel(period)}.`,
      );
      setSelected(new Set());
    } catch (err) {
      setError(apiError(err, "Unable to pay salaries."));
    }
  };

  const handleUndo = async (payment: SalaryPayment) => {
    const name = `${payment.employee.fname} ${payment.employee.lname}`;
    if (!window.confirm(`Undo ${name}'s salary for ${periodLabel(period)}? The money goes back to its account.`)) {
      return;
    }

    setError("");
    setDone("");
    try {
      await undoPayment(payment.id).unwrap();
    } catch (err) {
      setError(apiError(err, "Unable to undo payment."));
    }
  };

  const changePeriod = (next: string) => {
    setPeriod(next);
    setDone("");
    setError("");
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FE9F43]";

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-[#F7F7F7] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.75">
          <div>
            <h4 className="text-lg font-semibold text-text-two">Pay Salaries</h4>
            <p className="text-xs text-[#646B72]">Posts to 5200 Salary/Wages Expense</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full bg-red-500 p-0.5"
            aria-label="Close"
          >
            <FiX size={20} color="white" />
          </button>
        </div>

        <hr className="border-t border-[#D1D5DB]" />

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Month */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            {/* Two selects, not <input type="month">: desktop Firefox and
                Safari show that as a plain text box */}
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium">Salary month</legend>
              <div className="flex gap-2">
                <select
                  aria-label="Month"
                  value={period.slice(5, 7)}
                  onChange={(e) => changePeriod(`${period.slice(0, 4)}-${e.target.value}`)}
                  className={inputClass}
                >
                  {MONTHS.map((label, index) => {
                    const value = String(index + 1).padStart(2, "0");
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <select
                  aria-label="Year"
                  value={period.slice(0, 4)}
                  onChange={(e) => changePeriod(`${e.target.value}-${period.slice(5, 7)}`)}
                  className={`${inputClass} w-28!`}
                >
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
            <p className="text-sm text-[#646B72]">
              {payments.length} of {employees.length} paid for {periodLabel(period)}
              {paidTotal > 0 && (
                <> · <span className="font-medium text-text-two">{money(paidTotal)}</span></>
              )}
            </p>
          </div>

          {/* Employees */}
          <div className="overflow-x-auto rounded-lg border border-[#E6EAED] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allUnpaidSelected}
                      onChange={toggleAll}
                      disabled={unpaid.length === 0}
                      className="h-4 w-4 cursor-pointer accent-[#FE9F43]"
                      aria-label="Select all unpaid"
                    />
                  </th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {employeesLoading || paymentsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#646B72]">
                      Loading...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#646B72]">
                      No employees yet. Add employees first.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const payment = paidByEmployee.get(employee.id);
                    const isSelected = effectiveSelected.includes(employee.id);

                    return (
                      <tr
                        key={employee.id}
                        className={`border-b border-gray-100 last:border-b-0 ${
                          isSelected ? "bg-[#FFF7ED]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(employee.id)}
                            disabled={!!payment}
                            className="h-4 w-4 cursor-pointer accent-[#FE9F43] disabled:cursor-not-allowed"
                            aria-label={`Select ${employee.fname} ${employee.lname}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-[#212529]">
                            {employee.fname} {employee.lname}
                          </p>
                          <p className="font-mono text-xs text-[#8A94A3]">{employee.nationalId}</p>
                        </td>
                        <td className="px-3 py-3">
                          {payment ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                <FiCheckCircle size={12} /> Paid
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUndo(payment)}
                                disabled={undoing}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#8A94A3] hover:text-red-500 disabled:opacity-50"
                                title="Undo this payment"
                              >
                                <FiRotateCcw size={12} /> Undo
                              </button>
                            </div>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payment ? (
                            <span className="font-medium tabular-nums text-[#212529]">
                              {money(Number(payment.amount))}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={amountFor(employee.id, employee.salary)}
                              onChange={(e) =>
                                setAmounts((current) => ({
                                  ...current,
                                  [employee.id]: e.target.value,
                                }))
                              }
                              className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-right tabular-nums outline-none focus:border-[#FE9F43]"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Payment details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-sm font-medium">Pay from</span>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Payment date</span>
              <input
                type="date"
                value={paidAt}
                max={today()}
                onChange={(e) => setPaidAt(e.target.value)}
                className={inputClass}
              />
            </label>

            {method !== "CASH" && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">
                  {method === "MOBILE" ? "Wallet / Merchant account" : "Bank account"}
                </span>
                <select
                  value={accountId ?? ""}
                  onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                >
                  <option value="">Select account</option>
                  {methodAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName
                        ? `${account.bankName} · ${account.name} (${account.number})`
                        : `${account.name} (${account.number})`}
                      {` — ${money(Number(account.currentBalance))}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Reference</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transfer / receipt ID"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {done && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <FiCheckCircle /> {done}
            </p>
          )}
        </div>

        {/* Footer */}
        <hr className="border-t border-[#D1D5DB]" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-[#646B72]">
            {items.length} selected · Total{" "}
            <span className="text-base font-bold tabular-nums text-text-two">{money(total)}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={paying}
              className="cursor-pointer rounded-md bg-gray-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {done ? "Close" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || items.length === 0}
              className="cursor-pointer rounded-md bg-[#FE9F43] px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paying ? "Paying..." : `Pay ${money(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
