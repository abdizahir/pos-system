// client/src/features/reports/pages/VatPage.tsx
//
// VAT you collect on sales, what you owe the tax authority, and paying it.

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiPercent,
  FiRotateCcw,
  FiSearch,
  FiSend,
  FiX,
} from "react-icons/fi";

import {
  useGetVatPayableQuery,
  useGetVatPaymentsQuery,
  useGetVatReportQuery,
  useUndoVatPaymentMutation,
  type VatPayment,
} from "../../../api/api";
import PayVatModal from "../components/PayVatModal";
import { AUTHORITIES } from "../vat";

// ============================================================
// HELPERS
// ============================================================

const ALL_TIME_FROM = "2000-01-01";

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function etb(value: number, decimals = 2) {
  const formatted = Math.abs(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${value < 0 ? "−" : ""}ETB ${formatted}`;
}

function compact(value: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDay(value: string) {
  return parseDay(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

// VAT is filed monthly, so months come first
const PRESETS = [
  {
    key: "month",
    label: "This month",
    range: () => {
      const now = new Date();
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
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
    key: "quarter",
    label: "Quarter",
    range: () => {
      const now = new Date();
      const start = Math.floor(now.getMonth() / 3) * 3;
      return { from: toDateInput(new Date(now.getFullYear(), start, 1)), to: toDateInput(now) };
    },
  },
  {
    key: "year",
    label: "Year",
    range: () => {
      const now = new Date();
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: toDateInput(now) };
    },
  },
  { key: "all", label: "All", range: () => ({ from: ALL_TIME_FROM, to: toDateInput(new Date()) }) },
];

const SOURCE_STYLE: Record<string, { label: string; tone: string; icon: typeof FiArrowUpRight }> = {
  Sale: { label: "Sale", tone: "bg-emerald-50 text-emerald-600", icon: FiArrowDownLeft },
  "Sale Return": { label: "Return", tone: "bg-amber-50 text-amber-600", icon: FiRotateCcw },
  "Sale Cancelled": { label: "Cancelled sale", tone: "bg-rose-50 text-rose-500", icon: FiRotateCcw },
  "VAT Payment": { label: "Paid to authority", tone: "bg-blue-50 text-blue-600", icon: FiSend },
  Journal: { label: "Adjustment", tone: "bg-slate-100 text-slate-500", icon: FiFileText },
};

type Tab = "ALL" | "SALES" | "REVERSALS" | "PAYMENTS";
const ROWS_PER_PAGE = 12;

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-[#EEF0F3] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-xs text-[#94A3B8]">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function VatPage() {
  const defaultRange = PRESETS[0]!.range();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || defaultRange.from;
  const to = searchParams.get("to") || defaultRange.to;
  const invalid = from > to;
  const isAllTime = from === ALL_TIME_FROM;

  const [showCustom, setShowCustom] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const setRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("from", nextFrom);
    next.set("to", nextTo);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.from === from && range.to === to;
  });

  const { data, isFetching, isError, refetch } = useGetVatReportQuery(
    { from, to },
    { skip: invalid, refetchOnMountOrArgChange: true },
  );
  const { data: payableData, isFetching: payableLoading } = useGetVatPayableQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: payments = [] } = useGetVatPaymentsQuery(
    isAllTime ? undefined : { from, to },
    { skip: invalid },
  );
  const [undoVatPayment, { isLoading: undoing }] = useUndoVatPaymentMutation();

  const loading = isFetching && !data;
  const summary = data?.summary;
  const owed = payableData?.payable ?? 0;
  const ratePercent = data ? `${(data.rate * 100).toFixed(0)}%` : "15%";

  const periodText = activePreset
    ? activePreset.key === "all"
      ? "All time"
      : activePreset.label
    : from === to
      ? formatDay(from)
      : `${formatDay(from)} – ${formatDay(to)}`;

  // ---------------- Trend (collected vs paid per day) ----------------
  const trend = useMemo(() => {
    const map = new Map<string, { collected: number; paid: number }>();
    for (const t of data?.transactions ?? []) {
      const key = toDateInput(new Date(t.date));
      const bucket = map.get(key) ?? { collected: 0, paid: 0 };
      if (t.source === "VAT Payment") bucket.paid += Math.abs(t.vat);
      else bucket.collected += t.vat;
      map.set(key, bucket);
    }
    return Array.from(map, ([day, value]) => ({ day, ...value })).sort((a, b) => a.day.localeCompare(b.day));
  }, [data]);

  const chart: { options: ApexOptions; series: NonNullable<ApexOptions["series"]> } = {
    series: [
      { name: "VAT collected", data: trend.map((row) => Math.round(row.collected * 100) / 100) },
      { name: "VAT paid", data: trend.map((row) => Math.round(row.paid * 100) / 100) },
    ],
    options: {
      chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
      colors: ["#FE9F43", "#3B82F6"],
      plotOptions: { bar: { borderRadius: 4, columnWidth: trend.length > 15 ? "70%" : "40%" } },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "right", fontSize: "12px", markers: { size: 6 } },
      grid: { borderColor: "#EEF2F6", strokeDashArray: 4 },
      xaxis: {
        categories: trend.map((row) =>
          parseDay(row.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ),
        labels: { style: { colors: "#94A3B8", fontSize: "11px" }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { formatter: (value) => compact(value), style: { colors: "#94A3B8", fontSize: "11px" } } },
      tooltip: { shared: true, intersect: false, y: { formatter: (value) => etb(value) } },
    },
  };

  // ---------------- Transactions ----------------
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.transactions ?? []).filter((t) => {
      if (tab === "SALES" && t.source !== "Sale") return false;
      if (tab === "REVERSALS" && !["Sale Return", "Sale Cancelled"].includes(t.source)) return false;
      if (tab === "PAYMENTS" && t.source !== "VAT Payment") return false;
      if (!query) return true;
      return [t.reference ?? "", t.description, t.authority ?? "", t.source].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [data, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const paidByAuthority = AUTHORITIES.map((authority) => ({
    ...authority,
    amount: payments
      .filter((p) => p.authority === authority.value)
      .reduce((sum, p) => sum + Number(p.amount), 0),
  }));

  const handleUndo = async (payment: VatPayment) => {
    if (
      !window.confirm(
        `Undo the ${etb(Number(payment.amount))} VAT payment to ${payment.authorityName}? It will be owed again and the money goes back to its account.`,
      )
    ) {
      return;
    }
    try {
      await undoVatPayment(payment.id).unwrap();
    } catch {
      window.alert("Unable to undo this payment.");
    }
  };

  const handleExport = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["VAT report", periodText],
      ["Rate", ratePercent],
      [],
      ["VAT owed at start", data.summary.openingBalance.toFixed(2)],
      ["Taxable sales", data.summary.taxableSales.toFixed(2)],
      ["VAT collected", data.summary.outputVat.toFixed(2)],
      ["VAT reversed", data.summary.reversedVat.toFixed(2)],
      ["VAT paid", data.summary.paidVat.toFixed(2)],
      ["VAT owed at end", data.summary.closingBalance.toFixed(2)],
      [],
      ["Date", "Type", "Reference", "Authority", "Taxable amount", "VAT", "VAT owed"],
      ...filtered.map((t) => [
        toDateInput(new Date(t.date)),
        SOURCE_STYLE[t.source]?.label ?? t.source,
        t.reference ?? "",
        t.authority ?? "",
        t.taxableAmount === null ? "" : t.taxableAmount.toFixed(2),
        t.vat.toFixed(2),
        t.balance.toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vat-${isAllTime ? "all-time" : from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-full bg-[#F6F7FB] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------- Top bar ---------------- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">VAT</h1>
            <p className="text-sm text-[#64748B]">
              {ratePercent} VAT you collect on sales and pay to the revenue bureau
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    const range = preset.range();
                    setRange(range.from, range.to);
                    setShowCustom(false);
                  }}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                    activePreset?.key === preset.key
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom((open) => !open)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 transition ${
                  !activePreset || showCustom ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
                aria-label="Custom range"
              >
                <FiCalendar size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-2xl bg-white text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:text-[#0F172A] disabled:opacity-50"
              title="Export CSV"
            >
              <FiDownload size={16} />
            </button>
          </div>
        </header>

        {(showCustom || !activePreset) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              type="date"
              value={isAllTime ? "" : from}
              max={to}
              onChange={(e) => e.target.value && setRange(e.target.value, to)}
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.08)] outline-none focus:ring-2 focus:ring-[#FE9F43]/40"
            />
            <span className="text-[#94A3B8]">→</span>
            <input
              type="date"
              value={to}
              min={isAllTime ? undefined : from}
              max={toDateInput(new Date())}
              onChange={(e) => e.target.value && setRange(from, e.target.value)}
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.08)] outline-none focus:ring-2 focus:ring-[#FE9F43]/40"
            />
          </div>
        )}

        {invalid && <p className="text-right text-sm text-red-500">Start date must be before end date.</p>}

        {isError && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Couldn't load VAT data.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------- Hero: what you owe ---------------- */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#FE9F43]/25 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-white/60">
                <FiPercent size={14} /> VAT you owe now
              </p>
              {payableLoading && !payableData ? (
                <span className="mt-3 block h-12 w-56 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{etb(owed)}</p>
              )}
              <p className="mt-2 text-sm text-white/60">
                {owed > 0.005 ? (
                  "Collected from customers and not yet paid to the revenue bureau"
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <FiCheckCircle /> You're all paid up
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPay(true)}
              disabled={owed <= 0.005}
              className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#FE9F43] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#FE9F43]/30 transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              <FiSend size={17} />
              Pay VAT
            </button>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 lg:grid-cols-4">
            {[
              { label: "Collected", value: summary?.outputVat, color: "#FE9F43" },
              { label: "Reversed (returns)", value: summary?.reversedVat, color: "#F43F5E" },
              { label: "Paid", value: summary?.paidVat, color: "#3B82F6" },
              { label: "Owed at end of period", value: summary?.closingBalance, color: "#A78BFA" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stat.color }} />
                  {stat.label}
                </p>
                {loading || stat.value === undefined ? (
                  <span className="mt-1.5 block h-6 w-24 animate-pulse rounded bg-white/10" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{etb(stat.value)}</p>
                )}
              </div>
            ))}
          </div>
          <p className="relative mt-3 text-xs text-white/40">{periodText}</p>
        </div>

        {/* ---------------- Small stats ---------------- */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Taxable sales", value: etb(summary?.taxableSales ?? 0), hint: "Sales before VAT" },
            { label: "Net VAT for period", value: etb(summary?.netVat ?? 0), hint: "Collected minus reversed" },
            { label: "Owed at start", value: etb(summary?.openingBalance ?? 0), hint: "Carried in from before" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-medium text-[#64748B]">{stat.label}</p>
              {loading ? (
                <span className="mt-1.5 block h-6 w-28 animate-pulse rounded bg-[#EEF2F6]" />
              ) : (
                <p className="mt-1 text-lg font-bold tabular-nums text-[#0F172A]">{stat.value}</p>
              )}
              <p className="text-xs text-[#94A3B8]">{stat.hint}</p>
            </div>
          ))}
        </div>

        {/* ---------------- Chart + payments ---------------- */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card title="Collected vs paid" subtitle="By day">
            {loading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ) : trend.length === 0 ? (
              <div className="grid h-64 place-items-center text-sm text-[#94A3B8]">
                No VAT in this period — choose “VAT 15%” on the POS to charge it.
              </div>
            ) : (
              <Chart options={chart.options} series={chart.series} type="bar" height={270} />
            )}
          </Card>

          <Card
            title="Payments to the bureau"
            subtitle={periodText}
            action={
              <button
                type="button"
                onClick={() => setShowPay(true)}
                disabled={owed <= 0.005}
                className="cursor-pointer text-xs font-semibold text-[#E8862A] hover:underline disabled:cursor-not-allowed disabled:text-[#CBD5E1] disabled:no-underline"
              >
                + Pay
              </button>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-2">
              {paidByAuthority.map((authority) => (
                <div key={authority.value} className="rounded-2xl bg-[#F8FAFC] p-3">
                  <p className="truncate text-xs text-[#64748B]" title={authority.name}>
                    {authority.name.replace(" Revenue Bureau", "")}
                  </p>
                  <p className="text-base font-bold tabular-nums text-[#0F172A]">{etb(authority.amount, 0)}</p>
                </div>
              ))}
            </div>

            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#94A3B8]">No VAT paid in this period.</p>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
                      {AUTHORITIES.find((a) => a.value === payment.authority)?.initials ?? "VT"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{payment.authorityName}</p>
                      <p className="truncate text-xs text-[#94A3B8]">
                        {new Date(payment.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {" · "}
                        {payment.account ? payment.account.name : payment.paymentMethod.toLowerCase()}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-[#0F172A]">{etb(Number(payment.amount), 0)}</p>
                    <button
                      type="button"
                      onClick={() => handleUndo(payment)}
                      disabled={undoing}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Undo payment"
                    >
                      <FiRotateCcw size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---------------- Activity ---------------- */}
        <Card
          title="VAT activity"
          subtitle={`${filtered.length} entr${filtered.length === 1 ? "y" : "ies"}`}
          action={
            <div className="flex flex-wrap rounded-xl bg-[#F1F5F9] p-0.5 text-xs font-medium">
              {(
                [
                  ["ALL", "All"],
                  ["SALES", "Sales"],
                  ["REVERSALS", "Returns"],
                  ["PAYMENTS", "Payments"],
                ] as [Tab, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTab(value);
                    setPage(1);
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                    tab === value ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <div className="relative mb-3">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={15} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice, receipt or authority..."
              className="w-full rounded-xl border-0 bg-[#F8FAFC] py-2.5 pl-9 pr-8 text-sm text-[#0F172A] outline-none ring-1 ring-[#EEF0F3] focus:ring-2 focus:ring-[#FE9F43]/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-[#94A3B8] hover:text-[#0F172A]"
                aria-label="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="block h-14 animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#94A3B8]">No VAT activity matches.</p>
          ) : (
            <>
              <ul className="divide-y divide-[#F1F5F9]">
                {pageRows.map((t) => {
                  const style = SOURCE_STYLE[t.source] ?? SOURCE_STYLE.Journal!;
                  const Icon = style.icon;
                  const title = t.authority ?? (t.reference ? `Invoice ${t.reference}` : style.label);

                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${style.tone}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        {t.saleId ? (
                          <Link to={`/sales/${t.saleId}`} className="block truncate text-sm font-semibold text-[#0F172A] hover:text-[#E8862A]">
                            {title}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-[#0F172A]">{title}</p>
                        )}
                        <p className="truncate text-xs text-[#94A3B8]">
                          {style.label}
                          {t.taxableAmount !== null && ` · taxable ${etb(t.taxableAmount, 0)}`}
                          {t.authority && t.reference ? ` · ${t.reference}` : ""}
                        </p>
                      </div>
                      <div className="hidden text-right text-xs text-[#94A3B8] sm:block">
                        <p>{new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        <p>owed {etb(t.balance, 0)}</p>
                      </div>
                      <p
                        className={`w-28 shrink-0 text-right text-sm font-bold tabular-nums ${
                          t.vat >= 0 ? "text-[#E8862A]" : t.source === "VAT Payment" ? "text-blue-600" : "text-rose-500"
                        }`}
                      >
                        {t.vat >= 0 ? "+" : "−"}
                        {etb(t.vat).replace("−", "").replace("ETB ", "")}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-sm text-[#64748B]">
                  <span>
                    Page {safePage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setPage(safePage - 1)}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-[#F1F5F9] transition hover:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      <FiChevronLeft />
                    </button>
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setPage(safePage + 1)}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-[#F1F5F9] transition hover:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <p className="text-center text-xs text-[#94A3B8]">
          Ledger 2100 · VAT Payable. Owed at start + collected − reversed − paid = owed at end.
        </p>
      </div>

      {showPay && <PayVatModal owed={owed} onClose={() => setShowPay(false)} />}
    </section>
  );
}
