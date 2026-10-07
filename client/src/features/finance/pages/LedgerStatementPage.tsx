import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowDownLeft,
  FiArrowLeft,
  FiArrowUpRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiX,
} from "react-icons/fi";

import {
  useGetAccountsQuery,
  useGetLedgerStatementQuery,
  type Account,
  type LedgerStatement,
  type LedgerType,
} from "../../../api/api";

const LEDGER_TITLES: Record<LedgerType, string> = {
  CASH: "Cash in Drawer",
  BANK: "Banks",
  WALLET: "Wallets",
  MERCHANT: "Merchants",
};

const SOURCE_TONES: Record<string, string> = {
  Sale: "bg-emerald-50 text-emerald-700",
  "Sale Return": "bg-amber-50 text-amber-700",
  Expense: "bg-red-50 text-red-600",
  Purchase: "bg-blue-50 text-blue-700",
  "Supplier Payment": "bg-indigo-50 text-indigo-700",
  Transfer: "bg-purple-50 text-purple-700",
  Journal: "bg-gray-100 text-gray-600",
};

type Preset = {
  key: string;
  label: string;
  range: () => { from: string; to: string };
};

type Transaction = LedgerStatement["transactions"][number];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Local "YYYY-MM-DD"
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

const PRESETS: Preset[] = [
  { key: "all", label: "All time", range: () => ({ from: "", to: "" }) },
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

function formatCurrency(value: number) {
  return `ETB ${Number(value ?? 0).toLocaleString("en-US", {
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

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriod(from: string, to: string) {
  if (!from && !to) return "All time";
  if (from && to) {
    return from === to
      ? formatDate(from)
      : `${formatDate(from)} – ${formatDate(to)}`;
  }
  return from ? `From ${formatDate(from)}` : `Up to ${formatDate(to)}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function isLedgerType(value: string): value is LedgerType {
  return value in LEDGER_TITLES;
}

// Accounts are grouped by bank (or provider name for wallets/merchants)
function groupKey(account: Pick<Account, "bankName" | "name">) {
  return account.bankName?.trim() || account.name;
}

function accountLabel(
  account: Pick<Account, "bankName" | "name" | "number">,
) {
  return account.bankName
    ? `${account.bankName} · ${account.name} (${account.number})`
    : `${account.name} (${account.number})`;
}

export default function LedgerStatementPage() {
  const params = useParams();
  const type = String(params.type ?? "").toUpperCase();
  const validType = isLedgerType(type);
  const hasAccounts = validType && type !== "CASH";

  // Date range and bank/account live in the URL so reload / share / print keep them
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // ---------------- Bank / account selection ----------------
  const { data: allAccounts = [], isLoading: accountsLoading } =
    useGetAccountsQuery(undefined, { skip: !hasAccounts });

  const typeAccounts = useMemo(
    () => allAccounts.filter((account) => account.type === type),
    [allAccounts, type],
  );

  const banks = useMemo(() => {
    const map = new Map<string, Account[]>();

    typeAccounts.forEach((account) => {
      const key = groupKey(account);
      map.set(key, [...(map.get(key) ?? []), account]);
    });

    return Array.from(map, ([name, accounts]) => ({ name, accounts })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [typeAccounts]);

  const accountParam = Number(searchParams.get("account")) || null;
  const selectedAccount =
    typeAccounts.find((account) => account.id === accountParam) ?? null;
  const selectedBankName =
    searchParams.get("bank") ??
    (selectedAccount ? groupKey(selectedAccount) : "");
  const selectedBank =
    banks.find((bank) => bank.name === selectedBankName) ?? null;

  // A bank with a single account is the same as picking that account
  const effectiveAccount =
    selectedAccount ??
    (selectedBank?.accounts.length === 1 ? selectedBank.accounts[0] : null);

  const accountIds = effectiveAccount
    ? [effectiveAccount.id]
    : selectedBank
      ? selectedBank.accounts.map((account) => account.id)
      : undefined;

  // Wait for accounts before resolving a bank/account from the URL
  const waitingForAccounts =
    hasAccounts &&
    (accountParam !== null || !!searchParams.get("bank")) &&
    accountsLoading;

  const setSelection = (bank: string, account: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (bank) next.set("bank", bank);
    else next.delete("bank");
    if (account) next.set("account", String(account));
    else next.delete("account");
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "IN" | "OUT">(
    "ALL",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const {
    data: statement,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetLedgerStatementQuery(
    {
      type: type as LedgerType,
      from: from || undefined,
      to: to || undefined,
      accountIds,
    },
    {
      skip: !validType || waitingForAccounts || (!!from && !!to && from > to),
      // Ledger changes with every sale/expense/transfer
      refetchOnMountOrArgChange: true,
    },
  );

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.from === from && range.to === to;
  })?.key;

  const setRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextFrom) next.set("from", nextFrom);
    else next.delete("from");
    if (nextTo) next.set("to", nextTo);
    else next.delete("to");
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };

  const transactions = useMemo(
    () => statement?.transactions ?? [],
    [statement],
  );

  const sources = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.source))).sort(),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((t) => {
      if (sourceFilter !== "ALL" && t.source !== sourceFilter) return false;
      if (directionFilter === "IN" && t.amountIn <= 0) return false;
      if (directionFilter === "OUT" && t.amountOut <= 0) return false;
      if (!query) return true;

      return (
        t.description.toLowerCase().includes(query) ||
        (t.reference ?? "").toLowerCase().includes(query) ||
        t.source.toLowerCase().includes(query)
      );
    });
  }, [transactions, search, sourceFilter, directionFilter]);

  const isFiltered =
    search.trim() !== "" || sourceFilter !== "ALL" || directionFilter !== "ALL";

  const filteredIn = filteredTransactions.reduce((sum, t) => sum + t.amountIn, 0);
  const filteredOut = filteredTransactions.reduce(
    (sum, t) => sum + t.amountOut,
    0,
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / rowsPerPage),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageEnd = pageStart + rowsPerPage;

  const title = validType ? LEDGER_TITLES[type] : "Statement";
  const periodLabel = formatPeriod(from, to);
  const selectionLabel = effectiveAccount
    ? accountLabel(effectiveAccount)
    : selectedBank
      ? `${selectedBank.name} · all ${selectedBank.accounts.length} accounts`
      : hasAccounts
        ? `All ${title.toLowerCase()}`
        : "";
  // Show which account each line belongs to when several are combined
  const showAccountColumn = hasAccounts && !effectiveAccount;

  const handleDownloadCsv = () => {
    if (!statement) return;

    const rows: (string | number)[][] = [
      [`${title} Statement`],
      ["Ledger", `${statement.ledger.code} - ${statement.ledger.name}`],
      ...(selectionLabel ? [["Account", selectionLabel]] : []),
      ["Period", periodLabel],
      ["Opening Balance", statement.summary.openingBalance.toFixed(2)],
      ["Closing Balance", statement.summary.closingBalance.toFixed(2)],
      [],
      [
        "Date",
        "Time",
        "Source",
        "Reference",
        "Description",
        ...(showAccountColumn ? ["Account"] : []),
        "Money In",
        "Money Out",
        "Balance",
      ],
      ...filteredTransactions.map((t) => [
        toDateInput(new Date(t.date)),
        formatTime(t.date),
        t.source,
        t.reference ?? "",
        t.description,
        ...(showAccountColumn
          ? [t.account ? accountLabel(t.account) : "Unassigned"]
          : []),
        t.amountIn.toFixed(2),
        t.amountOut.toFixed(2),
        t.balance.toFixed(2),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const accountPart = effectiveAccount
      ? `-${effectiveAccount.number}`
      : selectedBank
        ? `-${selectedBank.name.replace(/\s+/g, "-")}`
        : "";
    link.download = `${type.toLowerCase()}${accountPart}-statement${
      from ? `-${from}` : ""
    }${to ? `_${to}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!validType) {
    return (
      <section className="flex items-center justify-center bg-[#F7F7F7] p-6">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-medium text-red-600">Unknown statement type.</p>
          <Link
            to="/money-overview"
            className="mt-3 inline-block text-sm font-medium text-[#FE9F43] hover:underline"
          >
            Back to overview
          </Link>
        </div>
      </section>
    );
  }

  const errorMessage =
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data
      ? String(error.data.message)
      : "Failed to load statement.";

  return (
    <section className="min-h-full bg-[#F4F6F8] p-4 sm:p-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl space-y-4 print:max-w-none print:space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/money-overview"
            className="flex items-center gap-2 text-sm font-medium text-[#646B72] hover:text-text-two"
          >
            <FiArrowLeft size={16} />
            Back to overview
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!statement || isFetching}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E6EAED] bg-white px-4 py-2 text-sm font-medium text-text-two transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload size={15} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!statement || isFetching}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#FE9F43] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiPrinter size={15} />
              Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 rounded-2xl border border-[#E6EAED] bg-white p-4 shadow-sm print:hidden">
          {hasAccounts && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#646B72]">
                  {type === "BANK" ? "Bank" : "Provider"}
                </span>
                <select
                  value={selectedBank?.name ?? ""}
                  onChange={(e) => setSelection(e.target.value, null)}
                  disabled={accountsLoading}
                  className="w-full rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
                >
                  <option value="">
                    All {type === "BANK" ? "banks" : "providers"}
                  </option>
                  {banks.map((bank) => (
                    <option key={bank.name} value={bank.name}>
                      {bank.name}
                      {bank.accounts.length > 1
                        ? ` (${bank.accounts.length} accounts)`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#646B72]">
                  Account
                </span>
                {selectedBank && selectedBank.accounts.length > 1 ? (
                  <select
                    value={selectedAccount?.id ?? ""}
                    onChange={(e) =>
                      setSelection(
                        selectedBank.name,
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
                  >
                    <option value="">
                      All {selectedBank.name} accounts
                    </option>
                    {selectedBank.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.number})
                        {account.status === "INACTIVE" ? " · Inactive" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border border-[#E6EAED] bg-[#F9FAFB] px-3 py-2 text-sm text-[#646B72]">
                    {effectiveAccount
                      ? `${effectiveAccount.name} (${effectiveAccount.number})`
                      : `Choose a ${type === "BANK" ? "bank" : "provider"} to pick an account`}
                  </p>
                )}
              </label>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
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

          <div className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto_auto]">
            <label className="flex items-center gap-2 rounded-lg border border-[#E6EAED] px-3 py-2 text-sm focus-within:border-[#FE9F43]">
              <FiCalendar className="text-[#A0A7AE]" size={15} />
              <span className="text-[#646B72]">From</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setRange(e.target.value, to)}
                className="bg-transparent text-text-two outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-[#E6EAED] px-3 py-2 text-sm focus-within:border-[#FE9F43]">
              <FiCalendar className="text-[#A0A7AE]" size={15} />
              <span className="text-[#646B72]">To</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setRange(from, e.target.value)}
                className="bg-transparent text-text-two outline-none"
              />
            </label>

            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A7AE]"
                size={15}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search reference or description..."
                className="w-full rounded-lg border border-[#E6EAED] py-2 pl-9 pr-8 text-sm outline-none focus:border-[#FE9F43]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-[#A0A7AE] hover:text-text-two"
                  aria-label="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
            >
              <option value="ALL">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg border border-[#E6EAED] p-0.5 text-sm">
              {(["ALL", "IN", "OUT"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => {
                    setDirectionFilter(direction);
                    setCurrentPage(1);
                  }}
                  className={`cursor-pointer rounded-md px-3 py-1.5 font-medium transition ${
                    directionFilter === direction
                      ? "bg-[#FFF0E1] text-[#E8862A]"
                      : "text-[#646B72] hover:bg-gray-50"
                  }`}
                >
                  {direction === "ALL" ? "All" : direction === "IN" ? "In" : "Out"}
                </button>
              ))}
            </div>
          </div>

          {from && to && from > to && (
            <p className="text-sm text-red-600">
              Start date must be before end date.
            </p>
          )}
        </div>

        {/* Statement */}
        <article className="overflow-hidden rounded-2xl border border-[#E6EAED] bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6EAED] px-6 py-5 print:px-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FE9F43]">
                Statement
              </p>
              <h1 className="mt-1 text-2xl font-bold text-text-two">{title}</h1>
              {statement && (
                <p className="mt-0.5 text-sm text-[#646B72]">
                  Ledger {statement.ledger.code} · {statement.ledger.name}
                </p>
              )}
              {selectionLabel && (
                <p className="mt-1 text-sm font-medium text-text-two">
                  {selectionLabel}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="text-[#646B72]">Period</p>
              <p className="font-semibold text-text-two">{periodLabel}</p>
              <p className="mt-1 text-xs text-[#A0A7AE]">
                Generated {new Date().toLocaleString("en-GB")}
              </p>
            </div>
          </header>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="cursor-pointer rounded-lg border border-[#E6EAED] px-4 py-2 text-sm font-medium text-text-two hover:bg-gray-50 print:hidden"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-px border-b border-[#E6EAED] bg-[#E6EAED] md:grid-cols-4">
                <SummaryTile
                  label="Opening Balance"
                  value={statement?.summary.openingBalance}
                  loading={isFetching}
                />
                <SummaryTile
                  label="Money In"
                  value={isFiltered ? filteredIn : statement?.summary.totalIn}
                  loading={isFetching}
                  tone="text-emerald-600"
                  icon={<FiArrowDownLeft />}
                />
                <SummaryTile
                  label="Money Out"
                  value={isFiltered ? filteredOut : statement?.summary.totalOut}
                  loading={isFetching}
                  tone="text-red-500"
                  icon={<FiArrowUpRight />}
                />
                <SummaryTile
                  label="Closing Balance"
                  value={statement?.summary.closingBalance}
                  loading={isFetching}
                  emphasis
                />
              </div>

              {isFiltered && statement && (
                <p className="border-b border-[#E6EAED] bg-[#FFFBF5] px-6 py-2 text-xs text-[#8A6A3F]">
                  Showing {filteredTransactions.length} of{" "}
                  {statement.transactions.length} transactions. Money In/Out
                  reflect the filtered rows; opening and closing balances are
                  for the whole period.
                </p>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm print:min-w-0 print:text-xs">
                  <thead>
                    <tr className="border-b border-[#E6EAED] bg-[#FAFBFC] text-xs uppercase tracking-wide text-[#646B72] print:bg-white">
                      <th className="px-6 py-3 font-medium print:px-1">Date</th>
                      <th className="px-3 py-3 font-medium print:px-1">Source</th>
                      <th className="px-3 py-3 font-medium print:px-1">Reference</th>
                      <th className="px-3 py-3 font-medium print:px-1">Description</th>
                      {showAccountColumn && (
                        <th className="px-3 py-3 font-medium print:px-1">Account</th>
                      )}
                      <th className="px-3 py-3 text-right font-medium print:px-1">In</th>
                      <th className="px-3 py-3 text-right font-medium print:px-1">Out</th>
                      <th className="px-6 py-3 text-right font-medium print:px-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetching && !statement ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[#F3F4F6]">
                          <td colSpan={showAccountColumn ? 8 : 7} className="px-6 py-3">
                            <div className="h-5 animate-pulse rounded bg-[#F1F3F5]" />
                          </td>
                        </tr>
                      ))
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showAccountColumn ? 8 : 7}
                          className="px-6 py-14 text-center text-[#646B72]"
                        >
                          No transactions found for this period
                          {isFiltered ? " and filters" : ""}.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t, index) => (
                        <StatementRow
                          key={t.id}
                          transaction={t}
                          // Screen shows one page; print shows every row
                          onPage={index >= pageStart && index < pageEnd}
                          dimmed={isFetching}
                          showAccount={showAccountColumn}
                        />
                      ))
                    )}
                  </tbody>
                  {filteredTransactions.length > 0 && (
                    <tfoot className="hidden print:table-footer-group">
                      <tr className="border-t-2 border-text-two font-semibold">
                        <td
                          colSpan={showAccountColumn ? 5 : 4}
                          className="px-1 py-2"
                        >
                          Total ({filteredTransactions.length} transactions)
                        </td>
                        <td className="px-1 py-2 text-right">
                          {formatCurrency(filteredIn)}
                        </td>
                        <td className="px-1 py-2 text-right">
                          {formatCurrency(filteredOut)}
                        </td>
                        <td className="px-1 py-2 text-right">
                          {statement &&
                            formatCurrency(statement.summary.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination */}
              {filteredTransactions.length > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E6EAED] px-6 py-4 text-sm text-[#646B72] sm:flex-row print:hidden">
                  <div className="flex items-center gap-2">
                    <span>Rows</span>
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
                      {pageStart + 1}–
                      {Math.min(pageEnd, filteredTransactions.length)} of{" "}
                      {filteredTransactions.length}
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
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  loading,
  tone = "text-text-two",
  icon,
  emphasis,
}: {
  label: string;
  value?: number;
  loading: boolean;
  tone?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`px-6 py-4 print:px-1 ${emphasis ? "bg-[#FFF7ED]" : "bg-white"}`}>
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[#646B72]">
        {icon}
        {label}
      </p>
      {loading && value === undefined ? (
        <div className="mt-2 h-6 w-28 animate-pulse rounded bg-[#F1F3F5]" />
      ) : (
        <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>
          {formatCurrency(value ?? 0)}
        </p>
      )}
    </div>
  );
}

function StatementRow({
  transaction: t,
  onPage,
  dimmed,
  showAccount,
}: {
  transaction: Transaction;
  onPage: boolean;
  dimmed: boolean;
  showAccount: boolean;
}) {
  return (
    <tr
      className={`border-b border-[#F3F4F6] break-inside-avoid last:border-b-0 hover:bg-[#FAFBFC] ${
        onPage ? "" : "hidden print:table-row"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <td className="whitespace-nowrap px-6 py-3 print:px-1 print:py-1.5">
        <p className="font-medium text-text-two">{formatDate(t.date)}</p>
        <p className="text-xs text-[#A0A7AE]">{formatTime(t.date)}</p>
      </td>
      <td className="px-3 py-3 print:px-1 print:py-1.5">
        <span
          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium print:bg-transparent print:p-0 ${
            SOURCE_TONES[t.source] ?? SOURCE_TONES.Journal
          }`}
        >
          {t.source}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-text-two print:px-1 print:py-1.5">
        {t.reference ?? "—"}
      </td>
      <td className="max-w-80 px-3 py-3 text-text-two print:max-w-none print:px-1 print:py-1.5">
        {t.description || "—"}
      </td>
      {showAccount && (
        <td className="px-3 py-3 text-xs text-[#646B72] print:px-1 print:py-1.5">
          {t.account ? (
            <>
              <p className="font-medium text-text-two">{t.account.name}</p>
              <p>{t.account.number}</p>
            </>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </td>
      )}
      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-emerald-600 print:px-1 print:py-1.5">
        {t.amountIn > 0 ? formatCurrency(t.amountIn) : "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-red-500 print:px-1 print:py-1.5">
        {t.amountOut > 0 ? formatCurrency(t.amountOut) : "—"}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right font-semibold tabular-nums text-text-two print:px-1 print:py-1.5">
        {formatCurrency(t.balance)}
      </td>
    </tr>
  );
}
