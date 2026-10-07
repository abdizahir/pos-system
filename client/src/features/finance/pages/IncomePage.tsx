import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiEdit2,
  FiHome,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiSmartphone,
  FiTrash2,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

import {
  useCreateIncomeMutation,
  useDeleteIncomeMutation,
  useGetAccountsQuery,
  useGetIncomesQuery,
  useGetProfitLossQuery,
  useUpdateIncomeMutation,
  type Income,
  type IncomeInput,
  type IncomePaymentMethod,
} from "../../../api/api";

// ============================================================
// HELPERS
// ============================================================

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function errorMessage(error: unknown, fallback: string) {
  return typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data
    ? String(error.data.message)
    : fallback;
}

const PRESETS = [
  {
    key: "month",
    label: "This month",
    range: () => {
      const now = new Date();
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateInput(now),
      };
    },
  },
  {
    key: "today",
    label: "Today",
    range: () => ({ from: toDateInput(new Date()), to: toDateInput(new Date()) }),
  },
  {
    key: "7d",
    label: "Last 7 days",
    range: () => ({ from: toDateInput(daysAgo(6)), to: toDateInput(new Date()) }),
  },
  {
    key: "30d",
    label: "Last 30 days",
    range: () => ({ from: toDateInput(daysAgo(29)), to: toDateInput(new Date()) }),
  },
  {
    key: "last-month",
    label: "Last month",
    range: () => {
      const now = new Date();
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    key: "year",
    label: "This year",
    range: () => {
      const now = new Date();
      return {
        from: toDateInput(new Date(now.getFullYear(), 0, 1)),
        to: toDateInput(now),
      };
    },
  },
];

const METHODS: { value: IncomePaymentMethod; label: string; icon: IconType }[] = [
  { value: "CASH", label: "Cash", icon: FiDollarSign },
  { value: "BANK", label: "Bank", icon: FiHome },
  { value: "CARD", label: "Card", icon: FiCreditCard },
  { value: "MOBILE", label: "Mobile", icon: FiSmartphone },
];

const METHOD_LABEL: Record<IncomePaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank",
  CARD: "Card",
  MOBILE: "Mobile",
};

const DEFAULT_CATEGORIES = [
  "Service Fee",
  "Commission",
  "Delivery Fee",
  "Rent Received",
  "Interest",
  "Discount Received",
  "Other",
];

const CATEGORY_COLORS = [
  "bg-[#FE9F43]",
  "bg-[#3675DF]",
  "bg-[#15935A]",
  "bg-[#805AD5]",
  "bg-[#D53F8C]",
  "bg-[#A0A7AE]",
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// ============================================================
// MODAL SHELL
// ============================================================

function Modal({
  title,
  onClose,
  children,
  width = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#E6EAED] px-6 py-4">
          <h2 className="text-lg font-semibold text-text-two">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-[#8A94A3] hover:bg-[#F4F6F8] hover:text-text-two"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ============================================================
// FORM
// ============================================================

function IncomeForm({
  income,
  categories,
  onClose,
}: {
  income: Income | null;
  categories: string[];
  onClose: () => void;
}) {
  const { data: accounts = [] } = useGetAccountsQuery();
  const [createIncome, { isLoading: creating }] = useCreateIncomeMutation();
  const [updateIncome, { isLoading: updating }] = useUpdateIncomeMutation();
  const saving = creating || updating;

  const [title, setTitle] = useState(income?.title ?? "");
  const [category, setCategory] = useState(income?.category ?? "");
  const [amount, setAmount] = useState(income ? String(Number(income.amount)) : "");
  const [date, setDate] = useState(
    income ? toDateInput(new Date(income.date)) : toDateInput(new Date()),
  );
  const [method, setMethod] = useState<IncomePaymentMethod>(
    income?.paymentMethod ?? "CASH",
  );
  const [accountId, setAccountId] = useState<number | null>(income?.accountId ?? null);
  const [reference, setReference] = useState(income?.reference ?? "");
  const [notes, setNotes] = useState(income?.notes ?? "");
  const [error, setError] = useState("");

  const methodAccounts = accounts.filter(
    (account) =>
      account.status === "ACTIVE" &&
      (method === "MOBILE"
        ? account.type === "WALLET" || account.type === "MERCHANT"
        : account.type === "BANK"),
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const value = Number(amount);

    if (!title.trim()) return setError("Please enter a title.");
    if (!category.trim()) return setError("Please choose a category.");
    if (!Number.isFinite(value) || value <= 0) {
      return setError("Amount must be greater than 0.");
    }
    if (method !== "CASH" && accountId === null) {
      return setError(
        `Please select a ${method === "MOBILE" ? "wallet or merchant" : "bank"} account.`,
      );
    }

    const payload: IncomeInput = {
      title: title.trim(),
      category: category.trim(),
      amount: value,
      date,
      paymentMethod: method,
      accountId: method === "CASH" ? null : accountId,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (income) {
        await updateIncome({ id: income.id, ...payload }).unwrap();
      } else {
        await createIncome(payload).unwrap();
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Unable to save income."));
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#E6EAED] bg-white px-3 py-2.5 text-sm text-text-two outline-none transition placeholder:text-[#A0A7AE] focus:border-[#FE9F43] focus:ring-4 focus:ring-[#FE9F43]/15";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#646B72]";

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={labelClass}>Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Delivery fee from customer"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Category</label>
            <input
              list="income-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Choose or type"
              className={inputClass}
            />
            <datalist id="income-categories">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelClass}>Amount (ETB)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} tabular-nums`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={date}
            max={toDateInput(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Received via</label>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);
                  setAccountId(null);
                }}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition ${
                  method === value
                    ? "border-[#FE9F43] bg-[#FFF7ED] text-[#E8862A]"
                    : "border-[#E6EAED] text-[#646B72] hover:bg-gray-50"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {method !== "CASH" && (
          <div>
            <label className={labelClass}>
              {method === "MOBILE" ? "Wallet / Merchant account" : "Bank account"}
            </label>
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
                </option>
              ))}
            </select>
            {methodAccounts.length === 0 && (
              <p className="mt-1 text-xs text-red-500">No active accounts for this method.</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt / transaction ID"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-[#E6EAED] bg-[#FAFBFC] px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-[#E6EAED] bg-white px-4 py-2 text-sm font-medium text-text-two hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-lg bg-[#FE9F43] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : income ? "Save changes" : "Add income"}
        </button>
      </footer>
    </form>
  );
}

// ============================================================
// KPI
// ============================================================

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconType;
  tone: string;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlight
          ? "border-transparent bg-linear-to-br from-[#15935A] to-[#0F7A49] text-white"
          : "border-[#E6EAED] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${highlight ? "text-white/80" : "text-[#646B72]"}`}>
          {label}
        </p>
        <span className={`rounded-xl p-2.5 ${highlight ? "bg-white/15 text-white" : tone}`}>
          <Icon size={18} />
        </span>
      </div>
      {loading ? (
        <span className="mt-3 block h-7 w-32 animate-pulse rounded bg-[#EEF1F4]" />
      ) : (
        <p
          className={`mt-2 truncate text-2xl font-bold tabular-nums ${
            highlight ? "text-white" : "text-text-two"
          }`}
        >
          {value}
        </p>
      )}
      {sub && (
        <p className={`mt-1.5 text-xs ${highlight ? "text-white/75" : "text-[#8A94A3]"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function IncomePage() {
  const defaultRange = PRESETS[0].range();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || defaultRange.from;
  const to = searchParams.get("to") || defaultRange.to;
  const invalidRange = from > to;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState<"ALL" | IncomePaymentMethod>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formIncome, setFormIncome] = useState<Income | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Income | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: incomes = [],
    isFetching,
    isError,
    refetch,
  } = useGetIncomesQuery({ from, to }, { skip: invalidRange, refetchOnMountOrArgChange: true });

  const { data: profitLoss, isFetching: plLoading } = useGetProfitLossQuery(
    { from, to },
    { skip: invalidRange },
  );

  const [deleteIncome, { isLoading: deletePending }] = useDeleteIncomeMutation();

  const setRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("from", nextFrom);
    next.set("to", nextTo);
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.from === from && range.to === to;
  })?.key;

  // ---------------- Numbers ----------------
  const otherIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const salesRevenue =
    profitLoss?.revenue.accounts.find((account) => account.code === "4000")?.amount ?? 0;
  const totalIncome = salesRevenue + otherIncome;

  const categories = useMemo(
    () =>
      Array.from(
        new Set([...DEFAULT_CATEGORIES, ...incomes.map((income) => income.category)]),
      ).sort(),
    [incomes],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    incomes.forEach((income) =>
      map.set(income.category, (map.get(income.category) ?? 0) + Number(income.amount)),
    );
    return Array.from(map, ([name, amount]) => ({ name, amount })).sort(
      (a, b) => b.amount - a.amount,
    );
  }, [incomes]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incomes.filter((income) => {
      if (categoryFilter !== "ALL" && income.category !== categoryFilter) return false;
      if (methodFilter !== "ALL" && income.paymentMethod !== methodFilter) return false;
      if (!query) return true;

      return (
        income.title.toLowerCase().includes(query) ||
        income.category.toLowerCase().includes(query) ||
        (income.reference ?? "").toLowerCase().includes(query) ||
        (income.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [incomes, search, categoryFilter, methodFilter]);

  const filteredTotal = filtered.reduce((sum, income) => sum + Number(income.amount), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  const usedCategories = Array.from(new Set(incomes.map((income) => income.category))).sort();
  const loading = isFetching && incomes.length === 0;

  const handleDownloadCsv = () => {
    const rows: (string | number)[][] = [
      ["Income"],
      ["Period", `${from} to ${to}`],
      ["Sales Revenue", salesRevenue.toFixed(2)],
      ["Other Income", otherIncome.toFixed(2)],
      ["Total Income", totalIncome.toFixed(2)],
      [],
      ["Date", "Title", "Category", "Method", "Account", "Reference", "Notes", "Amount"],
      ...filtered.map((income) => [
        toDateInput(new Date(income.date)),
        income.title,
        income.category,
        METHOD_LABEL[income.paymentMethod],
        income.account ? `${income.account.name} (${income.account.number})` : "",
        income.reference ?? "",
        income.notes ?? "",
        Number(income.amount).toFixed(2),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `income-${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    try {
      await deleteIncome(deleting.id).unwrap();
      setDeleting(null);
    } catch (err) {
      setDeleteError(errorMessage(err, "Unable to delete income."));
    }
  };

  return (
    <section className="min-h-full bg-[#F4F6F8] p-4 sm:p-6">
      <div className="mx-auto max-w-350 space-y-5">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#FE9F43]">
              Finance
            </p>
            <h1 className="text-2xl font-bold text-text-two">Income</h1>
            <p className="text-sm text-[#646B72]">
              Sales revenue plus any other money your store earns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filtered.length === 0}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E6EAED] bg-white px-4 py-2.5 text-sm font-medium text-text-two shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload size={15} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormIncome(null)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#FE9F43] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#FE9F43]/30 transition hover:bg-[#F28F2F]"
            >
              <FiPlus size={16} />
              Add income
            </button>
          </div>
        </header>

        {/* ---------------- Range ---------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6EAED] bg-white p-3 shadow-sm">
          <div className="flex gap-1.5 overflow-x-auto">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  const range = preset.range();
                  setRange(range.from, range.to);
                }}
                className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  activePreset === preset.key
                    ? "bg-text-two text-white"
                    : "bg-[#F4F6F8] text-[#646B72] hover:bg-[#E9ECEF]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-[#E6EAED] px-3 py-1.5 text-sm focus-within:border-[#FE9F43]">
              <FiCalendar className="text-[#A0A7AE]" size={14} />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => e.target.value && setRange(e.target.value, to)}
                className="bg-transparent text-text-two outline-none"
              />
            </label>
            <span className="text-[#A0A7AE]">–</span>
            <label className="flex items-center gap-2 rounded-lg border border-[#E6EAED] px-3 py-1.5 text-sm focus-within:border-[#FE9F43]">
              <FiCalendar className="text-[#A0A7AE]" size={14} />
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => e.target.value && setRange(from, e.target.value)}
                className="bg-transparent text-text-two outline-none"
              />
            </label>
          </div>
        </div>

        {invalidRange && (
          <p className="text-sm text-red-600">Start date must be before end date.</p>
        )}

        {/* ---------------- KPIs ---------------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Total Income"
            value={money(totalIncome)}
            sub="Sales revenue + other income"
            icon={FiTrendingUp}
            tone=""
            loading={loading || plLoading}
            highlight
          />
          <Kpi
            label="Sales Revenue"
            value={money(salesRevenue)}
            sub={totalIncome ? `${((salesRevenue / totalIncome) * 100).toFixed(1)}% of income` : "From POS sales"}
            icon={FiShoppingCart}
            tone="bg-[#E8F1FF] text-[#3675DF]"
            loading={plLoading}
          />
          <Kpi
            label="Other Income"
            value={money(otherIncome)}
            sub={totalIncome ? `${((otherIncome / totalIncome) * 100).toFixed(1)}% of income` : "Recorded here"}
            icon={FiDollarSign}
            tone="bg-[#FFF0E1] text-[#F27D16]"
            loading={loading}
          />
          <Kpi
            label="Entries"
            value={incomes.length.toLocaleString("en-US")}
            sub={incomes.length ? `Avg ${money(otherIncome / incomes.length)}` : "No entries yet"}
            icon={FiEdit2}
            tone="bg-[#F1EBFF] text-[#805AD5]"
            loading={loading}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------------- Table ---------------- */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E6EAED] bg-white shadow-sm">
            <div className="grid gap-2 border-b border-[#E6EAED] p-4 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A7AE]"
                  size={15}
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search title, category, reference..."
                  className="w-full rounded-lg border border-[#E6EAED] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FE9F43]"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
              >
                <option value="ALL">All categories</option>
                {usedCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value as "ALL" | IncomePaymentMethod);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
              >
                <option value="ALL">All methods</option>
                {METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <p className="text-sm text-red-600">Failed to load income.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="cursor-pointer rounded-lg border border-[#E6EAED] px-4 py-2 text-sm font-medium text-text-two hover:bg-gray-50"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E6EAED] bg-[#FAFBFC] text-xs uppercase tracking-wide text-[#646B72]">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">Income</th>
                      <th className="px-3 py-3 font-medium">Category</th>
                      <th className="px-3 py-3 font-medium">Received via</th>
                      <th className="px-3 py-3 text-right font-medium">Amount</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-[#F3F4F6]">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="h-6 animate-pulse rounded bg-[#F1F3F5]" />
                          </td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F8]">
                            <FiTrendingUp className="text-[#A0A7AE]" size={20} />
                          </div>
                          <p className="text-sm font-medium text-text-two">
                            {incomes.length ? "No income matches your filters" : "No other income in this period"}
                          </p>
                          <p className="text-xs text-[#8A94A3]">
                            Record service fees, commissions, rent received and more.
                          </p>
                          {!incomes.length && (
                            <button
                              type="button"
                              onClick={() => setFormIncome(null)}
                              className="mt-3 cursor-pointer text-sm font-medium text-[#FE9F43] hover:underline"
                            >
                              Add your first income
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((income) => (
                        <tr
                          key={income.id}
                          className={`border-b border-[#F3F4F6] last:border-b-0 hover:bg-[#FAFBFC] ${
                            isFetching ? "opacity-60" : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-text-two">
                            {formatDate(income.date)}
                          </td>
                          <td className="max-w-64 px-3 py-3">
                            <p className="truncate font-medium text-text-two">{income.title}</p>
                            {(income.reference || income.notes) && (
                              <p className="truncate text-xs text-[#8A94A3]">
                                {[income.reference, income.notes].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-block whitespace-nowrap rounded-full bg-[#FFF0E1] px-2.5 py-0.5 text-xs font-medium text-[#C2610C]">
                              {income.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-[#646B72]">
                            <p className="font-medium text-text-two">
                              {METHOD_LABEL[income.paymentMethod]}
                            </p>
                            {income.account && (
                              <p className="truncate">
                                {income.account.name} ({income.account.number})
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-emerald-600">
                            {money(Number(income.amount))}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setFormIncome(income)}
                                className="cursor-pointer rounded-lg p-2 text-[#8A94A3] transition hover:bg-[#FFF0E1] hover:text-[#E8862A]"
                                title="Edit"
                              >
                                <FiEdit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleting(income);
                                }}
                                className="cursor-pointer rounded-lg p-2 text-[#8A94A3] transition hover:bg-red-50 hover:text-red-500"
                                title="Delete"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E6EAED] px-5 py-3 text-sm text-[#646B72] sm:flex-row">
                <div className="flex items-center gap-2">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-[#E6EAED] bg-white px-2 py-1 outline-none focus:border-[#FE9F43]"
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span>
                    {pageStart + 1}–{Math.min(pageStart + rowsPerPage, filtered.length)} of{" "}
                    {filtered.length} · <span className="font-medium text-text-two">{money(filteredTotal)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#E6EAED] transition hover:bg-[#FE9F43] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#646B72]"
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="min-w-20 text-center">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#E6EAED] transition hover:bg-[#FE9F43] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#646B72]"
                    aria-label="Next page"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Side: breakdown ---------------- */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-text-two">Income mix</h2>
              <p className="text-xs text-[#8A94A3]">Where this period's income came from</p>

              {totalIncome === 0 ? (
                <p className="mt-6 text-center text-sm text-[#A0A7AE]">No income yet.</p>
              ) : (
                <>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#F1F3F5]">
                    <div
                      className="bg-[#3675DF]"
                      style={{ width: `${(salesRevenue / totalIncome) * 100}%` }}
                      title={`Sales: ${money(salesRevenue)}`}
                    />
                    <div
                      className="bg-[#FE9F43]"
                      style={{ width: `${(otherIncome / totalIncome) * 100}%` }}
                      title={`Other: ${money(otherIncome)}`}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-[#646B72]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#3675DF]" /> Sales
                      </span>
                      <span className="font-medium tabular-nums text-text-two">{money(salesRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-[#646B72]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FE9F43]" /> Other income
                      </span>
                      <span className="font-medium tabular-nums text-text-two">{money(otherIncome)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-text-two">Other income by category</h2>

              {byCategory.length === 0 ? (
                <p className="mt-6 text-center text-sm text-[#A0A7AE]">Nothing recorded yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {byCategory.slice(0, 6).map((item, index) => (
                    <li key={item.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter(item.name);
                            setCurrentPage(1);
                          }}
                          className="cursor-pointer truncate text-[#646B72] hover:text-[#E8862A]"
                        >
                          {item.name}
                        </button>
                        <span className="font-medium tabular-nums text-text-two">{money(item.amount)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F1F3F5]">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}
                          style={{ width: `${(item.amount / otherIncome) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to="/profit-loss"
                className="mt-5 block text-center text-xs font-medium text-[#FE9F43] hover:underline"
              >
                See it in Profit & Loss →
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ---------------- Modals ---------------- */}
      {formIncome !== undefined && (
        <Modal
          title={formIncome ? "Edit income" : "Add income"}
          onClose={() => setFormIncome(undefined)}
        >
          <IncomeForm
            income={formIncome}
            categories={categories}
            onClose={() => setFormIncome(undefined)}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete income" onClose={() => setDeleting(null)} width="max-w-md">
          <div className="space-y-3 px-6 py-5 text-sm text-[#646B72]">
            <p>
              Delete <span className="font-semibold text-text-two">{deleting.title}</span> for{" "}
              <span className="font-semibold text-text-two">{money(Number(deleting.amount))}</span>?
            </p>
            <p>Its journal entry is removed too, so account balances go back as if it never happened.</p>
            {deleteError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                {deleteError}
              </p>
            )}
          </div>
          <footer className="flex justify-end gap-2 border-t border-[#E6EAED] bg-[#FAFBFC] px-6 py-4">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="cursor-pointer rounded-lg border border-[#E6EAED] bg-white px-4 py-2 text-sm font-medium text-text-two hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deletePending}
              className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          </footer>
        </Modal>
      )}
    </section>
  );
}
