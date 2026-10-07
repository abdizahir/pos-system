// client/src/features/finance/pages/TrialBalancePage.tsx

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiLayers,
  FiMinusCircle,
  FiPlusCircle,
  FiPrinter,
  FiSearch,
  FiX,
} from "react-icons/fi";

import {
  useGetTrialBalanceQuery,
  type TrialBalanceAccount,
} from "../../../api/api";

// ============================================================
// HELPERS
// ============================================================

type AccountType = TrialBalanceAccount["type"];

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function amount(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const PRESETS = [
  { key: "today", label: "Today", date: () => toDateInput(new Date()) },
  {
    key: "last-month",
    label: "End of last month",
    date: () => {
      const now = new Date();
      return toDateInput(new Date(now.getFullYear(), now.getMonth(), 0));
    },
  },
  {
    key: "last-quarter",
    label: "End of last quarter",
    date: () => {
      const now = new Date();
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return toDateInput(new Date(now.getFullYear(), quarterStart, 0));
    },
  },
  {
    key: "last-year",
    label: "End of last year",
    date: () => toDateInput(new Date(new Date().getFullYear() - 1, 11, 31)),
  },
];

const TYPE_ORDER: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

const TYPE_STYLE: Record<AccountType, { label: string; plural: string; accent: string; badge: string }> = {
  ASSET: { label: "Asset", plural: "Assets", accent: "bg-[#3675DF]", badge: "bg-blue-50 text-blue-700" },
  LIABILITY: { label: "Liability", plural: "Liabilities", accent: "bg-[#E53E3E]", badge: "bg-red-50 text-red-600" },
  EQUITY: { label: "Equity", plural: "Equity", accent: "bg-[#15935A]", badge: "bg-emerald-50 text-emerald-700" },
  REVENUE: { label: "Revenue", plural: "Revenue", accent: "bg-[#805AD5]", badge: "bg-purple-50 text-purple-700" },
  EXPENSE: { label: "Expense", plural: "Expenses", accent: "bg-[#F27D16]", badge: "bg-orange-50 text-orange-700" },
};

// Where each account's detail lives
function detailLink(code: string, asOf: string): string | undefined {
  const statement = (type: string) => `/money-overview/${type}/statement?to=${asOf}`;

  switch (code) {
    case "1000":
      return statement("cash");
    case "1010":
      return statement("bank");
    case "1020":
      return statement("wallet");
    case "1030":
      return statement("merchant");
    case "1100":
      return "/stock";
    case "1200":
      return "/customers";
    case "2000":
      return "/suppliers";
    case "2100":
      return "/vat";
    case "3100":
      return "/owners";
    case "4100":
      return "/income";
    case "5100":
      return "/expenses";
    case "5200":
      return "/employees";
    default:
      return code.startsWith("4") || code.startsWith("5") ? "/profit-loss" : undefined;
  }
}

// ============================================================
// PIECES
// ============================================================

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string | undefined;
  sub?: string;
  icon: IconType;
  tone: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#646B72]">{label}</p>
        <span className={`rounded-xl p-2.5 print:hidden ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      {loading || value === undefined ? (
        <span className="mt-3 block h-7 w-36 animate-pulse rounded bg-[#EEF1F4]" />
      ) : (
        <p className="mt-2 truncate text-2xl font-bold tabular-nums text-text-two">{value}</p>
      )}
      {sub && <p className="mt-1.5 text-xs text-[#8A94A3]">{sub}</p>}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function TrialBalancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOf = searchParams.get("asOf") || toDateInput(new Date());
  const isToday = asOf === toDateInput(new Date());

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | AccountType>("ALL");
  const [hideZero, setHideZero] = useState(true);

  const setAsOf = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("asOf", value);
    setSearchParams(next, { replace: true });
  };

  const { data, isFetching, isError, refetch } = useGetTrialBalanceQuery(
    { asOf },
    { refetchOnMountOrArgChange: true },
  );

  const loading = isFetching && !data;
  const activePreset = PRESETS.find((preset) => preset.date() === asOf)?.key;

  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const activeCount = accounts.filter((a) => a.debit !== 0 || a.credit !== 0).length;

  // Filtered accounts grouped by type, in chart order
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();

    const visible = accounts.filter((account) => {
      if (typeFilter !== "ALL" && account.type !== typeFilter) return false;
      if (hideZero && account.debit === 0 && account.credit === 0) return false;
      if (!query) return true;
      return (
        account.code.toLowerCase().includes(query) ||
        account.name.toLowerCase().includes(query)
      );
    });

    return TYPE_ORDER.map((type) => {
      const rows = visible
        .filter((account) => account.type === type)
        .sort((a, b) => a.code.localeCompare(b.code));

      return {
        type,
        rows,
        debit: rows.reduce((sum, row) => sum + row.debit, 0),
        credit: rows.reduce((sum, row) => sum + row.credit, 0),
      };
    }).filter((group) => group.rows.length > 0);
  }, [accounts, search, typeFilter, hideZero]);

  const isFiltered = search.trim() !== "" || typeFilter !== "ALL";
  const shownCount = groups.reduce((sum, group) => sum + group.rows.length, 0);

  // Debit / credit totals per type for the overview bar
  const byType = useMemo(
    () =>
      TYPE_ORDER.map((type) => {
        const rows = accounts.filter((account) => account.type === type);
        return {
          type,
          debit: rows.reduce((sum, row) => sum + row.debit, 0),
          credit: rows.reduce((sum, row) => sum + row.credit, 0),
        };
      }),
    [accounts],
  );

  const handleDownloadCsv = () => {
    if (!data) return;

    const rows: (string | number)[][] = [
      ["Trial Balance"],
      ["As of", asOf],
      [],
      ["Code", "Account", "Type", "Debit", "Credit"],
      ...groups.flatMap((group) => [
        ...group.rows.map((row) => [
          row.code,
          row.name,
          TYPE_STYLE[row.type].label,
          row.debit.toFixed(2),
          row.credit.toFixed(2),
        ]),
        ["", `Total ${TYPE_STYLE[group.type].plural}`, "", group.debit.toFixed(2), group.credit.toFixed(2)],
      ]),
      [],
      ["", "TOTAL", "", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2)],
      ["Balanced", data.isBalanced ? "Yes" : `No (difference ${data.balanceDifference.toFixed(2)})`],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trial-balance-${asOf}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-full bg-[#F4F6F8] p-4 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#FE9F43] print:hidden">
              Reports
            </p>
            <h1 className="text-2xl font-bold text-text-two">Trial Balance</h1>
            <p className="text-sm text-[#646B72]">
              Debit and credit balance of every account{isToday ? " today" : ""} · as of{" "}
              <span className="font-medium text-text-two">{formatLongDate(asOf)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!data}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E6EAED] bg-white px-4 py-2 text-sm font-medium text-text-two shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload size={15} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!data}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#FE9F43] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiPrinter size={15} />
              Print
            </button>
          </div>
        </header>

        {/* ---------------- Date ---------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6EAED] bg-white p-3 shadow-sm print:hidden">
          <div className="flex gap-1.5 overflow-x-auto">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setAsOf(preset.date())}
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

          <label className="flex items-center gap-2 rounded-lg border border-[#E6EAED] px-3 py-1.5 text-sm focus-within:border-[#FE9F43]">
            <FiCalendar className="text-[#A0A7AE]" size={14} />
            <span className="text-[#646B72]">As of</span>
            <input
              type="date"
              value={asOf}
              max={toDateInput(new Date())}
              onChange={(e) => e.target.value && setAsOf(e.target.value)}
              className="bg-transparent text-text-two outline-none"
            />
          </label>
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load the trial balance.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-medium underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------- Balance check ---------------- */}
        {data && (
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-5 py-3.5 ${
              data.isBalanced
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              {data.isBalanced ? <FiCheckCircle /> : <FiAlertTriangle />}
              {data.isBalanced ? "Balanced" : `Out of balance by ${money(data.balanceDifference)}`}
            </span>
            <span className="text-sm tabular-nums">
              Total debit {money(data.totalDebit)} = Total credit {money(data.totalCredit)}
            </span>
          </div>
        )}

        {/* ---------------- KPIs ---------------- */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi
            label="Total Debit"
            value={data ? money(data.totalDebit) : undefined}
            sub="Assets and expenses"
            icon={FiPlusCircle}
            tone="bg-[#E8F1FF] text-[#3675DF]"
            loading={loading}
          />
          <Kpi
            label="Total Credit"
            value={data ? money(data.totalCredit) : undefined}
            sub="Liabilities, equity and revenue"
            icon={FiMinusCircle}
            tone="bg-[#F1EBFF] text-[#805AD5]"
            loading={loading}
          />
          <Kpi
            label="Accounts"
            value={data ? `${activeCount} of ${accounts.length}` : undefined}
            sub="with a balance"
            icon={FiLayers}
            tone="bg-[#FFF0E1] text-[#F27D16]"
            loading={loading}
          />
        </div>

        {/* ---------------- By type ---------------- */}
        {data && (
          <div className="grid gap-3 sm:grid-cols-5 print:hidden">
            {byType.map((group) => {
              const style = TYPE_STYLE[group.type];
              const net = Math.abs(group.debit - group.credit);
              const active = typeFilter === group.type;

              return (
                <button
                  key={group.type}
                  type="button"
                  onClick={() => setTypeFilter(active ? "ALL" : group.type)}
                  className={`cursor-pointer rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    active ? "border-[#FE9F43] ring-2 ring-[#FE9F43]/20" : "border-[#E6EAED]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${style.accent}`} />
                    <p className="text-xs font-medium uppercase tracking-wide text-[#646B72]">
                      {style.plural}
                    </p>
                  </div>
                  <p className="mt-1.5 truncate text-base font-bold tabular-nums text-text-two">
                    {money(net)}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ---------------- Table ---------------- */}
        <div className="overflow-hidden rounded-2xl border border-[#E6EAED] bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E6EAED] p-4 print:hidden">
            <div className="relative min-w-60 flex-1">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A7AE]"
                size={15}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or account name..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | AccountType)}
              className="rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm text-text-two outline-none focus:border-[#FE9F43]"
            >
              <option value="ALL">All types</option>
              {TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {TYPE_STYLE[type].plural}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#646B72]">
              <input
                type="checkbox"
                checked={hideZero}
                onChange={(e) => setHideZero(e.target.checked)}
                className="h-4 w-4 accent-[#FE9F43]"
              />
              Hide zero balances
            </label>
          </div>

          {isFiltered && data && (
            <p className="border-b border-[#E6EAED] bg-[#FFFBF5] px-5 py-2 text-xs text-[#8A6A3F] print:hidden">
              Showing {shownCount} of {accounts.length} accounts. Grand totals are for all accounts.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-170 text-sm print:min-w-0 print:text-xs">
              <thead>
                <tr className="border-b border-[#E6EAED] bg-[#FAFBFC] text-xs uppercase tracking-wide text-[#646B72] print:bg-white">
                  <th className="px-5 py-3 text-left font-medium print:px-1">Code</th>
                  <th className="px-3 py-3 text-left font-medium print:px-1">Account</th>
                  <th className="px-3 py-3 text-right font-medium print:px-1">Debit (ETB)</th>
                  <th className="px-5 py-3 text-right font-medium print:px-1">Credit (ETB)</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6]">
                      <td colSpan={4} className="px-5 py-3">
                        <div className="h-5 animate-pulse rounded bg-[#F1F3F5]" />
                      </td>
                    </tr>
                  ))
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-[#646B72]">
                      No accounts match your filters.
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => {
                    const style = TYPE_STYLE[group.type];

                    return [
                      <tr key={`${group.type}-head`} className="break-inside-avoid">
                        <td colSpan={4} className="bg-[#FAFBFC] px-5 py-2 print:bg-white print:px-1">
                          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#646B72]">
                            <span className={`h-3.5 w-1 rounded-full ${style.accent}`} />
                            {style.plural}
                          </span>
                        </td>
                      </tr>,

                      ...group.rows.map((row) => {
                        const to = detailLink(row.code, asOf);

                        return (
                          <tr
                            key={row.id}
                            className={`group border-b border-[#F3F4F6] break-inside-avoid hover:bg-[#FAFBFC] ${
                              isFetching ? "opacity-60" : ""
                            }`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-[#646B72] print:px-1 print:py-1.5">
                              {row.code}
                            </td>
                            <td className="px-3 py-3 print:px-1 print:py-1.5">
                              {to ? (
                                <Link
                                  to={to}
                                  className="inline-flex items-center gap-1.5 font-medium text-text-two hover:text-[#E8862A] print:pointer-events-none"
                                >
                                  {row.name}
                                  <FiArrowRight
                                    size={12}
                                    className="text-[#D5DADF] transition group-hover:translate-x-0.5 group-hover:text-[#FE9F43] print:hidden"
                                  />
                                </Link>
                              ) : (
                                <span className="font-medium text-text-two">{row.name}</span>
                              )}
                              <span
                                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium print:hidden ${style.badge}`}
                              >
                                {style.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-text-two print:px-1 print:py-1.5">
                              {row.debit > 0 ? amount(row.debit) : <span className="text-[#C2C8CF]">—</span>}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums text-text-two print:px-1 print:py-1.5">
                              {row.credit > 0 ? amount(row.credit) : <span className="text-[#C2C8CF]">—</span>}
                            </td>
                          </tr>
                        );
                      }),

                      <tr key={`${group.type}-total`} className="border-b border-[#E6EAED] break-inside-avoid">
                        <td className="px-5 py-2.5 print:px-1" />
                        <td className="px-3 py-2.5 text-xs font-semibold text-[#646B72] print:px-1">
                          Total {style.plural.toLowerCase()}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-text-two print:px-1">
                          {group.debit > 0 ? amount(group.debit) : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-right text-xs font-semibold tabular-nums text-text-two print:px-1">
                          {group.credit > 0 ? amount(group.credit) : "—"}
                        </td>
                      </tr>,
                    ];
                  })
                )}
              </tbody>

              {data && (
                <tfoot>
                  <tr className="bg-text-two text-white print:border-t-2 print:border-text-two print:bg-white print:text-text-two">
                    <td className="px-5 py-4 print:px-1" />
                    <td className="px-3 py-4 font-semibold print:px-1">Grand total</td>
                    <td className="px-3 py-4 text-right text-base font-bold tabular-nums print:px-1">
                      {amount(data.totalDebit)}
                    </td>
                    <td className="px-5 py-4 text-right text-base font-bold tabular-nums print:px-1">
                      {amount(data.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="hidden text-xs text-[#8A94A3] print:block">
          Generated {new Date().toLocaleString("en-GB")}
        </p>
      </div>
    </section>
  );
}
