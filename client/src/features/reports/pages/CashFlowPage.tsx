// client/src/features/finance/pages/CashFlowPage.tsx
//
// Where the store's money came from and where it went, built from the
// ledger's cash, bank, wallet and merchant accounts.

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { IconType } from "react-icons";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiHome,
  FiRepeat,
  FiSearch,
  FiSmartphone,
  FiX,
} from "react-icons/fi";

import { useGetCashFlowQuery, type CashFlow } from "../../../api/api";

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

function addDays(value: string, days: number) {
  const date = parseDay(value);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000) + 1;
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

function changeOf(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function periodLabel(period: string, granularity: "day" | "month") {
  if (granularity === "month") {
    const [y, m] = period.split("-").map(Number);
    return new Date(y!, m! - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return parseDay(period).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDay(value: string) {
  return parseDay(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const PRESETS = [
  { key: "today", label: "Today", range: () => ({ from: toDateInput(new Date()), to: toDateInput(new Date()) }) },
  { key: "7d", label: "7D", range: () => ({ from: addDays(toDateInput(new Date()), -6), to: toDateInput(new Date()) }) },
  { key: "30d", label: "30D", range: () => ({ from: addDays(toDateInput(new Date()), -29), to: toDateInput(new Date()) }) },
  {
    key: "month",
    label: "Month",
    range: () => {
      const now = new Date();
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
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

const PRESET_NAMES: Record<string, string> = {
  today: "today",
  "7d": "in the last 7 days",
  "30d": "in the last 30 days",
  month: "this month",
  year: "this year",
  all: "all time",
};

const COLORS = { in: "#22C55E", out: "#F43F5E", balance: "#3B82F6" };

const CHANNEL_STYLE: Record<string, { icon: IconType; tone: string; statement: string }> = {
  Cash: { icon: FiDollarSign, tone: "bg-orange-50 text-orange-500", statement: "cash" },
  Bank: { icon: FiHome, tone: "bg-blue-50 text-blue-500", statement: "bank" },
  Wallet: { icon: FiSmartphone, tone: "bg-violet-50 text-violet-500", statement: "wallet" },
  Merchant: { icon: FiCreditCard, tone: "bg-pink-50 text-pink-500", statement: "merchant" },
};

const ROWS_PER_PAGE = 12;

// ============================================================
// SMALL PIECES
// ============================================================

function ChangeChip({ change, inverse, dark }: { change: number | null; inverse?: boolean; dark?: boolean }) {
  if (change === null) return null;

  const up = change >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? FiArrowUpRight : FiArrowDownLeft;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        dark
          ? good
            ? "bg-emerald-400/20 text-emerald-300"
            : "bg-red-400/20 text-red-300"
          : good
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-red-500"
      }`}
    >
      <Icon size={12} />
      {Math.abs(change * 100).toFixed(1)}%
    </span>
  );
}

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

function CategoryBars({
  rows,
  total,
  color,
  empty,
}: {
  rows: CashFlow["inflowsByCategory"];
  total: number;
  color: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-[#94A3B8]">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate text-[#475569]">{row.category}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#0F172A]">
              {etb(row.amount, 0)}
              <span className="ml-1.5 text-xs font-normal text-[#94A3B8]">
                {total > 0 ? `${((row.amount / total) * 100).toFixed(0)}%` : ""}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="h-full rounded-full"
              style={{ width: `${total > 0 ? (row.amount / total) * 100 : 0}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function CashFlowPage() {
  const defaultRange = PRESETS.find((preset) => preset.key === "today")!.range();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || defaultRange.from;
  const to = searchParams.get("to") || defaultRange.to;
  const invalid = from > to;
  const isAllTime = from === ALL_TIME_FROM;

  const [showCustom, setShowCustom] = useState(false);
  const [direction, setDirection] = useState<"ALL" | "IN" | "OUT">("ALL");
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

  const previousRange = useMemo(() => {
    const length = daysBetween(from, to);
    const previousTo = addDays(from, -1);
    return { from: addDays(previousTo, -(length - 1)), to: previousTo };
  }, [from, to]);

  const { data, isFetching, isError, refetch } = useGetCashFlowQuery(
    { from, to },
    { skip: invalid, refetchOnMountOrArgChange: true },
  );
  const { data: previousData } = useGetCashFlowQuery(previousRange, {
    skip: invalid || isAllTime,
  });

  const loading = isFetching && !data;
  const previous = isAllTime ? undefined : previousData;
  const summary = data?.summary;
  const net = summary?.netChange ?? 0;
  const positive = net >= 0;

  const rangeText = activePreset
    ? PRESET_NAMES[activePreset.key]
    : from === to
      ? `on ${formatDay(from)}`
      : `${formatDay(from)} – ${formatDay(to)}`;

  // ---------------- Transactions ----------------
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.transactions ?? []).filter((t) => {
      if (direction !== "ALL" && t.type !== direction) return false;
      if (!query) return true;
      return [t.category, t.reference, t.description, t.method ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [data, direction, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // ---------------- Charts ----------------
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const granularity = data?.granularity ?? "day";
  const labels = trend.map((row) => periodLabel(row.period, granularity));

  const flowChart: { options: ApexOptions; series: NonNullable<ApexOptions["series"]> } = {
    series: [
      { name: "Money in", type: "column", data: trend.map((row) => Math.round(row.in)) },
      { name: "Money out", type: "column", data: trend.map((row) => -Math.round(row.out)) },
      { name: "Balance", type: "line", data: trend.map((row) => Math.round(row.balance)) },
    ],
    options: {
      chart: { stacked: true, toolbar: { show: false }, fontFamily: "inherit", zoom: { enabled: false } },
      colors: [COLORS.in, COLORS.out, COLORS.balance],
      plotOptions: { bar: { borderRadius: 4, columnWidth: trend.length > 20 ? "70%" : "45%" } },
      stroke: { width: [0, 0, 3], curve: "smooth" },
      markers: { size: trend.length > 20 ? 0 : 4, strokeWidth: 0 },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "right", fontSize: "12px", markers: { size: 6 } },
      grid: { borderColor: "#EEF2F6", strokeDashArray: 4 },
      xaxis: {
        categories: labels,
        labels: { style: { colors: "#94A3B8", fontSize: "11px" }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: Math.min(labels.length, 10),
      },
      yaxis: [
        {
          seriesName: "Money in",
          labels: { formatter: (value) => compact(value), style: { colors: "#94A3B8", fontSize: "11px" } },
        },
        { seriesName: "Money in", show: false },
        {
          seriesName: "Balance",
          opposite: true,
          labels: { formatter: (value) => compact(value), style: { colors: "#94A3B8", fontSize: "11px" } },
        },
      ],
      tooltip: { shared: true, intersect: false, y: { formatter: (value) => etb(Math.abs(value)) } },
    },
  };

  const handleExport = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Cash flow", rangeText],
      ["From", isAllTime ? "All time" : from, "To", to],
      [],
      ["Opening balance", data.summary.openingBalance.toFixed(2)],
      ["Money in", data.summary.totalIn.toFixed(2)],
      ["Money out", data.summary.totalOut.toFixed(2)],
      ["Net change", data.summary.netChange.toFixed(2)],
      ["Closing balance", data.summary.closingBalance.toFixed(2)],
      [],
      ["Date", "Direction", "Category", "Reference", "Description", "Account", "Amount"],
      ...filtered.map((t) => [
        toDateInput(new Date(t.date)),
        t.type === "IN" ? "In" : "Out",
        t.category,
        t.reference,
        t.description,
        t.method ?? "",
        (t.type === "IN" ? t.amount : -t.amount).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cash-flow-${isAllTime ? "all-time" : from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-full bg-[#F6F7FB] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------- Top bar ---------------- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Cash Flow</h1>
            <p className="text-sm text-[#64748B]">Money in and out of your store {rangeText}</p>
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
            Couldn't load cash flow.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------- Hero ---------------- */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-xl sm:p-7">
          <div
            className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl ${
              positive ? "bg-emerald-500/25" : "bg-red-500/25"
            }`}
          />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-white/60">Net cash flow</p>
              {loading ? (
                <span className="mt-3 block h-12 w-64 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className={`mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${positive ? "" : "text-red-300"}`}>
                  {net > 0 ? "+" : ""}
                  {etb(net)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/60">
                {!loading && <ChangeChip change={changeOf(net, previous?.summary.netChange)} dark />}
                <span>{positive ? "More came in than went out" : "More went out than came in"}</span>
              </div>
            </div>

            {/* Opening → closing */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div>
                <p className="text-xs text-white/50">Opening balance</p>
                {loading ? (
                  <span className="mt-1 block h-6 w-24 animate-pulse rounded bg-white/10" />
                ) : (
                  <p className="text-lg font-semibold tabular-nums">{etb(summary?.openingBalance ?? 0, 0)}</p>
                )}
              </div>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full ${
                  positive ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"
                }`}
              >
                {positive ? <FiArrowUpRight /> : <FiArrowDownLeft />}
              </span>
              <div className="text-right">
                <p className="text-xs text-white/50">Closing balance</p>
                {loading ? (
                  <span className="ml-auto mt-1 block h-6 w-24 animate-pulse rounded bg-white/10" />
                ) : (
                  <p className="text-lg font-semibold tabular-nums">{etb(summary?.closingBalance ?? 0, 0)}</p>
                )}
              </div>
              <p className="col-span-3 text-xs text-white/40">Cash, bank, wallet and merchant accounts combined</p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.in }} />
                Money in
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{etb(summary?.totalIn ?? 0, 0)}</p>
              {!loading && <ChangeChip change={changeOf(summary?.totalIn ?? 0, previous?.summary.totalIn)} dark />}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.out }} />
                Money out
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{etb(summary?.totalOut ?? 0, 0)}</p>
              {!loading && (
                <ChangeChip change={changeOf(summary?.totalOut ?? 0, previous?.summary.totalOut)} inverse dark />
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <FiRepeat size={11} /> Between your accounts
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{etb(summary?.transfers ?? 0, 0)}</p>
              <p className="text-xs text-white/40">Transfers, not counted above</p>
            </div>
          </div>
        </div>

        {/* ---------------- Channels ---------------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.channels ?? Object.keys(CHANNEL_STYLE).map((name) => ({ name, in: 0, out: 0, net: 0 }))).map(
            (channel) => {
              const style = CHANNEL_STYLE[channel.name] ?? CHANNEL_STYLE.Cash!;
              const Icon = style.icon;
              const total = channel.in + channel.out;

              return (
                <Link
                  key={channel.name}
                  to={`/money-overview/${style.statement}/statement?from=${isAllTime ? "" : from}&to=${to}`}
                  className="group rounded-3xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl ${style.tone}`}>
                        <Icon size={16} />
                      </span>
                      <p className="font-semibold text-[#0F172A]">{channel.name}</p>
                    </div>
                    <FiArrowUpRight className="text-[#CBD5E1] transition group-hover:text-[#FE9F43]" />
                  </div>
                  {loading ? (
                    <span className="mt-3 block h-6 w-28 animate-pulse rounded bg-[#EEF2F6]" />
                  ) : (
                    <p className={`mt-3 text-lg font-bold tabular-nums ${channel.net < 0 ? "text-red-500" : "text-[#0F172A]"}`}>
                      {channel.net > 0 ? "+" : ""}
                      {etb(channel.net, 0)}
                    </p>
                  )}
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div style={{ width: `${total ? (channel.in / total) * 100 : 0}%`, backgroundColor: COLORS.in }} />
                    <div style={{ width: `${total ? (channel.out / total) * 100 : 0}%`, backgroundColor: COLORS.out }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-[#64748B]">
                    <span>In {etb(channel.in, 0)}</span>
                    <span>Out {etb(channel.out, 0)}</span>
                  </div>
                </Link>
              );
            },
          )}
        </div>

        {/* ---------------- Chart ---------------- */}
        <Card
          title="Money in vs money out"
          subtitle={`${granularity === "month" ? "By month" : "By day"} · line shows your total balance`}
        >
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-[#F1F5F9]" />
          ) : trend.length === 0 ? (
            <div className="grid h-72 place-items-center text-sm text-[#94A3B8]">No money moved in this period</div>
          ) : (
            <Chart options={flowChart.options} series={flowChart.series} type="line" height={300} />
          )}
        </Card>

        {/* ---------------- Categories ---------------- */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Where money came from" subtitle={`${etb(summary?.totalIn ?? 0, 0)} in`}>
            {loading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ) : (
              <CategoryBars
                rows={data?.inflowsByCategory ?? []}
                total={summary?.totalIn ?? 0}
                color={COLORS.in}
                empty="No money came in"
              />
            )}
          </Card>
          <Card title="Where money went" subtitle={`${etb(summary?.totalOut ?? 0, 0)} out`}>
            {loading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ) : (
              <CategoryBars
                rows={data?.outflowsByCategory ?? []}
                total={summary?.totalOut ?? 0}
                color={COLORS.out}
                empty="No money went out"
              />
            )}
          </Card>
        </div>

        {/* ---------------- Transactions ---------------- */}
        <Card
          title="Transactions"
          subtitle={`${filtered.length} movement${filtered.length === 1 ? "" : "s"}`}
          action={
            <div className="flex rounded-xl bg-[#F1F5F9] p-0.5 text-xs font-medium">
              {(["ALL", "IN", "OUT"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setDirection(value);
                    setPage(1);
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                    direction === value ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {value === "ALL" ? "All" : value === "IN" ? "Money in" : "Money out"}
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
              placeholder="Search category, reference, account..."
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
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="block h-14 animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#94A3B8]">No movements match.</p>
          ) : (
            <>
              <ul className="divide-y divide-[#F1F5F9]">
                {pageRows.map((t) => {
                  const isIn = t.type === "IN";
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                          isIn ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                        }`}
                      >
                        {isIn ? <FiArrowDownLeft size={17} /> : <FiArrowUpRight size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{t.category}</p>
                        <p className="truncate text-xs text-[#94A3B8]">
                          {[t.description, t.reference].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="hidden min-w-0 text-right text-xs text-[#64748B] sm:block">
                        <p className="truncate">{t.method ?? "—"}</p>
                        <p className="text-[#94A3B8]">
                          {new Date(t.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <p
                        className={`w-32 shrink-0 text-right text-sm font-bold tabular-nums ${
                          isIn ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {isIn ? "+" : "−"}
                        {etb(t.amount).replace("ETB ", "")}
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
          Opening {etb(summary?.openingBalance ?? 0, 0)} + in {etb(summary?.totalIn ?? 0, 0)} − out{" "}
          {etb(summary?.totalOut ?? 0, 0)} = closing {etb(summary?.closingBalance ?? 0, 0)}. From posted journal entries.
        </p>
      </div>
    </section>
  );
}
