// client/src/features/finance/pages/BalanceSheetPage.tsx

import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiHome,
  FiPieChart,
  FiPrinter,
  FiShield,
  FiSmartphone,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

import { useGetBalanceSheetQuery, type BalanceSheet } from "../../../api/api";

// ============================================================
// HELPERS
// ============================================================

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function money(value: number) {
  const formatted = Math.abs(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(ETB ${formatted})` : `ETB ${formatted}`;
}

function percent(part: number, whole: number) {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
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

// ============================================================
// LINES
// ============================================================

type Line = {
  key: string;
  label: string;
  hint?: string;
  amount: number;
  icon?: IconType;
  to?: string;
};

type Section = {
  title: string;
  lines: Line[];
};

const KNOWN_ASSET_CODES = ["1000", "1010", "1020", "1030", "1100", "1200"];

function buildAssets(data: BalanceSheet, asOf: string): Section[] {
  const statement = (type: string) =>
    `/money-overview/${type}/statement?to=${asOf}`;

  const otherAssets = (data.accountBalances ?? [])
    .filter(
      (account) =>
        account.type === "ASSET" &&
        !KNOWN_ASSET_CODES.includes(account.code) &&
        account.amount !== 0,
    )
    .map((account) => ({
      key: account.code,
      label: account.name,
      hint: account.code,
      amount: account.amount,
    }));

  return [
    {
      title: "Cash & money accounts",
      lines: [
        { key: "cash", label: "Cash", hint: "1000", amount: data.assets.cash, icon: FiDollarSign, to: statement("cash") },
        { key: "bank", label: "Bank Accounts", hint: "1010", amount: data.assets.bankAccounts, icon: FiHome, to: statement("bank") },
        { key: "wallet", label: "Mobile Wallets", hint: "1020", amount: data.assets.mobileWallets, icon: FiSmartphone, to: statement("wallet") },
        { key: "merchant", label: "Merchant Accounts", hint: "1030", amount: data.assets.merchantAccounts ?? 0, icon: FiCreditCard, to: statement("merchant") },
      ],
    },
    {
      title: "Stock & receivables",
      lines: [
        { key: "inventory", label: "Inventory", hint: "1100 · at cost", amount: data.assets.inventory, icon: FiBox, to: "/stock" },
        { key: "ar", label: "Accounts Receivable", hint: "1200 · customers owe you", amount: data.assets.accountsReceivable, icon: FiUsers, to: "/customers" },
        ...otherAssets,
      ],
    },
  ];
}

function buildLiabilities(data: BalanceSheet): Line[] {
  const accounts = (data.accountBalances ?? []).filter(
    (account) => account.type === "LIABILITY",
  );

  // Name each liability account; always show payables and VAT
  const lines: Line[] = accounts
    .filter((account) => account.amount !== 0 || ["2000", "2100"].includes(account.code))
    .map((account) => ({
      key: account.code,
      label: account.code === "2000" ? "Supplier Payables" : account.name,
      hint:
        account.code === "2000"
          ? "2000 · you owe suppliers"
          : account.code === "2100"
            ? "2100 · owed to the tax authority"
            : account.code,
      amount: account.amount,
      to: account.code === "2000" ? "/suppliers" : account.code === "2100" ? "/vat" : undefined,
    }));

  // Fall back to the summary if the server sent no breakdown
  if (lines.length === 0) {
    return [
      { key: "ap", label: "Supplier Payables", amount: data.liabilities.supplierPayables, to: "/suppliers" },
      { key: "loans", label: "Loans", amount: data.liabilities.loans },
      { key: "other", label: "Other Liabilities", amount: data.liabilities.otherDebts },
    ].filter((line) => line.key === "ap" || line.amount !== 0);
  }

  return lines;
}

function buildEquity(data: BalanceSheet): Line[] {
  const accounts = (data.accountBalances ?? []).filter(
    (account) => account.type === "EQUITY",
  );

  const lines: Line[] = accounts
    .filter((account) => account.amount !== 0 || ["3000", "3100"].includes(account.code))
    .map((account) => ({
      key: account.code,
      label: account.code === "3000" ? "Owner's Capital" : account.name,
      hint:
        account.code === "3100"
          ? "3100 · money owners took out"
          : account.code,
      amount: account.amount,
      to: account.code === "3100" ? "/owners" : undefined,
    }));

  if (lines.length === 0) {
    lines.push(
      { key: "capital", label: "Owner's Capital", amount: data.equity.ownersCapital },
      ...(data.equity.otherEquity !== 0
        ? [{ key: "other", label: "Other Equity", amount: data.equity.otherEquity }]
        : []),
    );
  }

  lines.push({
    key: "retained",
    label: "Retained Profit",
    hint: "all profit to date",
    amount: data.equity.retainedProfit,
    to: "/profit-loss",
  });

  return lines;
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
  value: number | undefined;
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
        <p className="mt-2 truncate text-2xl font-bold tabular-nums text-text-two">
          {money(value)}
        </p>
      )}
      {sub && <p className="mt-1.5 text-xs text-[#8A94A3]">{sub}</p>}
    </div>
  );
}

function LineRow({ line, total, bar }: { line: Line; total: number; bar: string }) {
  const Icon = line.icon;
  const share = total > 0 ? Math.max(line.amount, 0) / total : 0;

  const content = (
    <div className="group flex items-center gap-3 px-5 py-3 transition hover:bg-[#FAFBFC] print:px-0 print:py-1.5">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F6F8] text-[#646B72] print:hidden">
          <Icon size={15} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium text-text-two">{line.label}</p>
          <p
            className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
              line.amount < 0 ? "text-red-500" : "text-text-two"
            }`}
          >
            {money(line.amount)}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F3F5] print:hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${share * 100}%` }} />
          </div>
          <p className="w-28 shrink-0 truncate text-right text-[11px] text-[#A0A7AE]">
            {line.hint ? `${line.hint}` : ""}
            {line.amount > 0 && total > 0 && <span className="ml-1">· {percent(line.amount, total)}</span>}
          </p>
        </div>
      </div>
      {line.to && (
        <FiArrowRight
          size={14}
          className="shrink-0 text-[#D5DADF] transition group-hover:translate-x-0.5 group-hover:text-[#FE9F43] print:hidden"
        />
      )}
    </div>
  );

  return line.to ? (
    <Link to={line.to} className="block print:pointer-events-none">
      {content}
    </Link>
  ) : (
    content
  );
}

function Card({
  title,
  total,
  accent,
  children,
}: {
  title: string;
  total: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E6EAED] bg-white shadow-sm break-inside-avoid print:rounded-none print:border-0 print:shadow-none">
      <header className="flex items-center justify-between gap-3 border-b border-[#E6EAED] px-5 py-4 print:px-0">
        <div className="flex items-center gap-2.5">
          <span className={`h-6 w-1.5 rounded-full ${accent}`} />
          <h2 className="font-semibold text-text-two">{title}</h2>
        </div>
        <p className="text-sm font-bold tabular-nums text-text-two">{money(total)}</p>
      </header>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-[#FAFBFC] px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A94A3] print:bg-white print:px-0">
      {children}
    </p>
  );
}

function Ratio({ label, value, hint, good }: { label: string; value: string; hint: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-4 print:bg-white print:p-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[#646B72]">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          good === undefined ? "text-text-two" : good ? "text-emerald-600" : "text-amber-600"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[#8A94A3]">{hint}</p>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function BalanceSheetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOf = searchParams.get("asOf") || toDateInput(new Date());
  const isToday = asOf === toDateInput(new Date());

  const setAsOf = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("asOf", value);
    setSearchParams(next, { replace: true });
  };

  const { data, isFetching, isError, refetch } = useGetBalanceSheetQuery(
    { asOf },
    { refetchOnMountOrArgChange: true },
  );

  const loading = isFetching && !data;
  const activePreset = PRESETS.find((preset) => preset.date() === asOf)?.key;

  const assets = useMemo(() => (data ? buildAssets(data, asOf) : []), [data, asOf]);
  const liabilities = useMemo(() => (data ? buildLiabilities(data) : []), [data]);
  const equity = useMemo(() => (data ? buildEquity(data) : []), [data]);

  const totalAssets = data?.assets.total ?? 0;
  const totalLiabilities = data?.liabilities.total ?? 0;
  const totalEquity = data?.equity.total ?? 0;
  const liabilitiesAndEquity = data?.liabilitiesAndEquity ?? 0;

  // Simple health ratios (all liabilities here are short term)
  const moneyTotal = data
    ? data.assets.cash + data.assets.bankAccounts + data.assets.mobileWallets + (data.assets.merchantAccounts ?? 0)
    : 0;
  const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : null;
  const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : null;

  const handleDownloadCsv = () => {
    if (!data) return;

    const rows: (string | number)[][] = [
      ["Balance Sheet"],
      ["As of", asOf],
      [],
      ["ASSETS"],
      ...assets.flatMap((section) =>
        section.lines.map((line) => [line.label, line.amount.toFixed(2)]),
      ),
      ["Total Assets", totalAssets.toFixed(2)],
      [],
      ["LIABILITIES"],
      ...liabilities.map((line) => [line.label, line.amount.toFixed(2)]),
      ["Total Liabilities", totalLiabilities.toFixed(2)],
      [],
      ["EQUITY"],
      ...equity.map((line) => [line.label, line.amount.toFixed(2)]),
      ["Total Equity", totalEquity.toFixed(2)],
      [],
      ["Total Liabilities + Equity", liabilitiesAndEquity.toFixed(2)],
      ["Balanced", data.isBalanced ? "Yes" : `No (difference ${data.balanceDifference.toFixed(2)})`],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balance-sheet-${asOf}.csv`;
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
            <h1 className="text-2xl font-bold text-text-two">Balance Sheet</h1>
            <p className="text-sm text-[#646B72]">
              What the business owns and owes{isToday ? " today" : ""} · as of{" "}
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
            Failed to load the balance sheet.
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
              Assets {money(totalAssets)} = Liabilities {money(totalLiabilities)} + Equity {money(totalEquity)}
            </span>
          </div>
        )}

        {/* ---------------- KPIs ---------------- */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi
            label="Total Assets"
            value={data ? totalAssets : undefined}
            sub={data ? `${money(moneyTotal)} in cash & accounts` : undefined}
            icon={FiTrendingUp}
            tone="bg-[#E8F1FF] text-[#3675DF]"
            loading={loading}
          />
          <Kpi
            label="Total Liabilities"
            value={data ? totalLiabilities : undefined}
            sub={data ? `${percent(totalLiabilities, totalAssets)} of assets` : undefined}
            icon={FiTrendingDown}
            tone="bg-red-50 text-red-500"
            loading={loading}
          />
          <Kpi
            label="Owner's Equity"
            value={data ? totalEquity : undefined}
            sub={data ? `${percent(totalEquity, totalAssets)} of assets` : undefined}
            icon={FiShield}
            tone="bg-[#E5F8EE] text-[#15935A]"
            loading={loading}
          />
        </div>

        {/* ---------------- Composition ---------------- */}
        {data && totalAssets > 0 && (
          <div className="rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm print:hidden">
            <div className="mb-3 flex items-center gap-2">
              <FiPieChart className="text-[#8A94A3]" />
              <p className="text-sm font-semibold text-text-two">Who funds your assets</p>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-[#F1F3F5]">
              <div
                className="bg-[#E53E3E]"
                style={{ width: `${Math.max(0, (totalLiabilities / liabilitiesAndEquity) * 100)}%` }}
                title={`Liabilities: ${money(totalLiabilities)}`}
              />
              <div
                className="bg-[#15935A]"
                style={{ width: `${Math.max(0, (totalEquity / liabilitiesAndEquity) * 100)}%` }}
                title={`Equity: ${money(totalEquity)}`}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#646B72]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E53E3E]" />
                Creditors · {percent(totalLiabilities, liabilitiesAndEquity)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#15935A]" />
                Owners · {percent(totalEquity, liabilitiesAndEquity)}
              </span>
            </div>
          </div>
        )}

        {/* ---------------- Statement ---------------- */}
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-[#E6EAED] bg-white p-5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <span key={j} className="block h-9 animate-pulse rounded bg-[#F1F3F5]" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          data && (
            <div className={`grid gap-5 lg:grid-cols-2 print:grid-cols-2 ${isFetching ? "opacity-60" : ""}`}>
              {/* Assets */}
              <Card title="Assets" total={totalAssets} accent="bg-[#3675DF]">
                {assets.map((section) => (
                  <div key={section.title}>
                    <SubHeading>{section.title}</SubHeading>
                    <div className="divide-y divide-[#F3F4F6]">
                      {section.lines.map((line) => (
                        <LineRow key={line.key} line={line} total={totalAssets} bar="bg-[#3675DF]" />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t-2 border-text-two/80 px-5 py-3.5 print:px-0">
                  <span className="font-semibold text-text-two">Total Assets</span>
                  <span className="text-base font-bold tabular-nums text-text-two">{money(totalAssets)}</span>
                </div>
              </Card>

              <div className="space-y-5">
                {/* Liabilities */}
                <Card title="Liabilities" total={totalLiabilities} accent="bg-[#E53E3E]">
                  <div className="divide-y divide-[#F3F4F6]">
                    {liabilities.map((line) => (
                      <LineRow key={line.key} line={line} total={liabilitiesAndEquity} bar="bg-[#E53E3E]" />
                    ))}
                  </div>
                </Card>

                {/* Equity */}
                <Card title="Equity" total={totalEquity} accent="bg-[#15935A]">
                  <div className="divide-y divide-[#F3F4F6]">
                    {equity.map((line) => (
                      <LineRow key={line.key} line={line} total={liabilitiesAndEquity} bar="bg-[#15935A]" />
                    ))}
                  </div>
                </Card>

                {/* Total */}
                <div className="flex items-center justify-between rounded-2xl bg-text-two px-5 py-4 text-white shadow-sm print:rounded-none print:border-t-2 print:border-text-two print:bg-white print:px-0 print:text-text-two">
                  <span className="font-semibold">Total Liabilities + Equity</span>
                  <span className="text-lg font-bold tabular-nums">{money(liabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          )
        )}

        {/* ---------------- Ratios ---------------- */}
        {data && (
          <div className="rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm break-inside-avoid print:border-0 print:shadow-none">
            <p className="mb-3 text-sm font-semibold text-text-two">Financial health</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Ratio
                label="Current ratio"
                value={currentRatio === null ? "No debts" : `${currentRatio.toFixed(2)}×`}
                hint="Assets ÷ liabilities · above 1.5 is comfortable"
                good={currentRatio === null || currentRatio >= 1.5}
              />
              <Ratio
                label="Cash coverage"
                value={totalLiabilities > 0 ? `${(moneyTotal / totalLiabilities).toFixed(2)}×` : "No debts"}
                hint="Cash & accounts ÷ liabilities · 1× pays all debts now"
                good={totalLiabilities === 0 || moneyTotal >= totalLiabilities}
              />
              <Ratio
                label="Debt to equity"
                value={debtToEquity === null ? "—" : `${debtToEquity.toFixed(2)}`}
                hint="Liabilities ÷ equity · lower means less borrowed"
                good={debtToEquity === null ? undefined : debtToEquity <= 1}
              />
            </div>
          </div>
        )}

        <p className="hidden text-xs text-[#8A94A3] print:block">
          Generated {new Date().toLocaleString("en-GB")}
        </p>
      </div>
    </section>
  );
}
