// client/src/features/finance/pages/ProfitLossPage.tsx
//
// POS-style profit dashboard: how much the store made, how it trends,
// which products earn it and where the money goes.

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { IconType } from "react-icons";
import {
  FiAlertCircle,
  FiArrowDownRight,
  FiArrowUpRight,
  FiBox,
  FiCalendar,
  FiDownload,
  FiPackage,
  FiPercent,
  FiShoppingBag,
  FiTag,
  FiZap,
} from "react-icons/fi";

import {
  useGetProfitInsightsQuery,
  type ProfitInsights,
} from "../../../api/api";

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

// 12.4K style for chart axes
function compact(value: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
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

const COLORS = {
  revenue: "#3B82F6",
  costs: "#F97316",
  profit: "#22C55E",
  loss: "#EF4444",
};

const DONUT_COLORS = ["#FE9F43", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#94A3B8"];

// ============================================================
// SMALL PIECES
// ============================================================

function ChangeChip({ change, inverse, dark }: { change: number | null; inverse?: boolean; dark?: boolean }) {
  if (change === null) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dark ? "bg-white/10 text-white/70" : "bg-[#F1F5F9] text-[#64748B]"}`}>
        no comparison
      </span>
    );
  }

  const up = change >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? FiArrowUpRight : FiArrowDownRight;

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
      <Icon size={13} />
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

function Metric({
  label,
  value,
  change,
  icon: Icon,
  tone,
  ring,
  loading,
}: {
  label: string;
  value: string;
  change: number | null;
  icon: IconType;
  tone: string;
  // 0..1 progress ring instead of an icon
  ring?: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {ring !== undefined ? (
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${ring >= 0 ? COLORS.profit : COLORS.loss} ${Math.min(Math.abs(ring), 1) * 360}deg, #EEF2F6 0deg)`,
          }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[10px] font-bold text-[#0F172A]">
            {Math.round(ring * 100)}%
          </span>
        </div>
      ) : (
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#64748B]">{label}</p>
        {loading ? (
          <span className="mt-1 block h-6 w-24 animate-pulse rounded bg-[#EEF2F6]" />
        ) : (
          <p className="truncate text-lg font-bold tabular-nums text-[#0F172A]">{value}</p>
        )}
        {!loading && <ChangeChip change={change} />}
      </div>
    </div>
  );
}

// ============================================================
// PROFIT FLOW (waterfall)
// ============================================================

function ProfitFlow({ totals }: { totals: ProfitInsights["totals"] }) {
  const max = Math.max(totals.revenue, totals.cogs + totals.expenses, 1);

  const steps = [
    { label: "Revenue", value: totals.revenue, start: 0, end: totals.revenue, color: COLORS.revenue, sign: "" },
    {
      label: "Cost of goods",
      value: -totals.cogs,
      start: totals.revenue - totals.cogs,
      end: totals.revenue,
      color: COLORS.costs,
      sign: "−",
    },
    { label: "Gross profit", value: totals.grossProfit, start: 0, end: totals.grossProfit, color: "#0EA5E9", sign: "" },
    {
      label: "Expenses",
      value: -totals.expenses,
      start: totals.grossProfit - totals.expenses,
      end: totals.grossProfit,
      color: "#F43F5E",
      sign: "−",
    },
    {
      label: "Net profit",
      value: totals.netProfit,
      start: Math.min(0, totals.netProfit),
      end: Math.max(0, totals.netProfit),
      color: totals.netProfit >= 0 ? COLORS.profit : COLORS.loss,
      sign: "",
    },
  ];

  // Leave room left of zero when values go negative
  const min = Math.min(0, ...steps.map((step) => step.start));
  const span = max - min || 1;
  const position = (value: number) => ((value - min) / span) * 100;

  return (
    <div className="space-y-3.5">
      {steps.map((step) => {
        const left = position(Math.min(step.start, step.end));
        const width = Math.max(position(Math.max(step.start, step.end)) - left, 0.8);

        return (
          <div key={step.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-[#475569]">{step.label}</span>
              <span className="font-semibold tabular-nums text-[#0F172A]">
                {step.sign && step.value !== 0 ? "− " : ""}
                {etb(Math.abs(step.value))}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-[#F1F5F9]">
              {min < 0 && (
                <span className="absolute inset-y-0 w-px bg-[#CBD5E1]" style={{ left: `${position(0)}%` }} />
              )}
              <span
                className="absolute inset-y-0 rounded-full"
                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: step.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

type ProductTab = "top" | "low" | "losing";

export default function ProfitLossPage() {
  const defaultRange = PRESETS.find((preset) => preset.key === "today")!.range();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || defaultRange.from;
  const to = searchParams.get("to") || defaultRange.to;
  const invalid = from > to;
  const isAllTime = from === ALL_TIME_FROM;

  const [showCustom, setShowCustom] = useState(false);
  const [productTab, setProductTab] = useState<ProductTab>("top");

  const setRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("from", nextFrom);
    next.set("to", nextTo);
    setSearchParams(next, { replace: true });
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

  const { data, isFetching, isError, refetch } = useGetProfitInsightsQuery(
    { from, to },
    { skip: invalid, refetchOnMountOrArgChange: true },
  );
  const { data: previousData } = useGetProfitInsightsQuery(previousRange, {
    skip: invalid || isAllTime,
  });

  const loading = isFetching && !data;
  const previous = isAllTime ? undefined : previousData;

  const totals = data?.totals;
  const orders = data?.orders;
  const net = totals?.netProfit ?? 0;
  const revenue = totals?.revenue ?? 0;
  const costs = (totals?.cogs ?? 0) + (totals?.expenses ?? 0);
  const isProfit = net >= 0;

  const rangeText = activePreset
    ? PRESET_NAMES[activePreset.key]
    : from === to
      ? `on ${formatDay(from)}`
      : `${formatDay(from)} – ${formatDay(to)}`;

  // ---------------- Products ----------------
  const products = useMemo(() => {
    const list = data?.products ?? [];
    if (productTab === "losing") return list.filter((p) => p.profit < 0).sort((a, b) => a.profit - b.profit);
    if (productTab === "low") return [...list].filter((p) => p.revenue > 0).sort((a, b) => a.margin - b.margin);
    return list.filter((p) => p.profit > 0);
  }, [data, productTab]);

  const topProfit = Math.max(...(data?.products ?? []).map((p) => Math.abs(p.profit)), 1);
  const losingCount = (data?.products ?? []).filter((p) => p.profit < 0).length;

  // ---------------- Insights ----------------
  const insights = useMemo(() => {
    if (!data) return [];
    const tips: { tone: "good" | "bad" | "info"; text: string }[] = [];
    const best = data.products[0];
    const itemsProfit = data.orders.profit;

    if (best && best.profit > 0 && itemsProfit > 0) {
      tips.push({
        tone: "good",
        text: `${best.name} is your top earner — ${etb(best.profit, 0)} profit (${pct(best.profit / itemsProfit)} of product profit).`,
      });
    }

    const losers = data.products.filter((p) => p.profit < 0);
    if (losers.length > 0) {
      const loss = losers.reduce((sum, p) => sum + p.profit, 0);
      tips.push({
        tone: "bad",
        text: `${losers.length} product${losers.length === 1 ? " sells" : "s sell"} below cost, losing ${etb(Math.abs(loss), 0)}. Check ${losers[0]!.name}'s price.`,
      });
    }

    const biggestExpense = data.expenses[0];
    if (biggestExpense && data.totals.expenses > 0) {
      tips.push({
        tone: "info",
        text: `${biggestExpense.name} is your biggest expense at ${pct(biggestExpense.amount / data.totals.expenses)} of all expenses.`,
      });
    }

    if (data.totals.revenue > 0 && data.totals.netProfit < 0) {
      tips.push({
        tone: "bad",
        text: `Costs are ${etb(Math.abs(data.totals.netProfit), 0)} higher than revenue ${rangeText}.`,
      });
    }

    return tips.slice(0, 3);
  }, [data, rangeText]);

  // ---------------- Charts ----------------
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const granularity = data?.granularity ?? "day";
  const labels = trend.map((row) => periodLabel(row.period, granularity));

  const heroChart: { options: ApexOptions; series: NonNullable<ApexOptions["series"]> } = {
    series: [{ name: "Profit", data: trend.map((row) => Math.round(row.profit * 100) / 100) }],
    options: {
      chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false }, fontFamily: "inherit" },
      stroke: { curve: "smooth", width: 2.5 },
      colors: [isProfit ? "#4ADE80" : "#F87171"],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0, stops: [0, 100] } },
      tooltip: {
        theme: "dark",
        x: { formatter: (_value, opts) => labels[opts?.dataPointIndex ?? 0] ?? "" },
        y: { formatter: (value) => etb(value) },
      },
    },
  };

  const comboChart: { options: ApexOptions; series: NonNullable<ApexOptions["series"]> } = {
    series: [
      { name: "Revenue", type: "column", data: trend.map((row) => Math.round(row.revenue)) },
      { name: "Costs", type: "column", data: trend.map((row) => Math.round(row.cogs + row.expenses)) },
      { name: "Profit", type: "line", data: trend.map((row) => Math.round(row.profit)) },
    ],
    options: {
      chart: { toolbar: { show: false }, fontFamily: "inherit", zoom: { enabled: false } },
      colors: [COLORS.revenue, COLORS.costs, COLORS.profit],
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
      yaxis: { labels: { formatter: (value) => compact(value), style: { colors: "#94A3B8", fontSize: "11px" } } },
      tooltip: { shared: true, intersect: false, y: { formatter: (value) => etb(value) } },
    },
  };

  const expenseRows = data?.expenses ?? [];
  const donutChart: { options: ApexOptions; series: number[] } = {
    series: expenseRows.map((row) => Math.round(Math.max(row.amount, 0) * 100) / 100),
    options: {
      chart: { type: "donut", fontFamily: "inherit" },
      labels: expenseRows.map((row) => row.name),
      colors: DONUT_COLORS,
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 3, colors: ["#fff"] },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { fontSize: "12px", color: "#64748B" },
              value: { fontSize: "18px", fontWeight: 700, color: "#0F172A", formatter: (value) => etb(Number(value), 0) },
              total: {
                show: true,
                label: "Expenses",
                color: "#64748B",
                formatter: () => etb(totals?.expenses ?? 0, 0),
              },
            },
          },
        },
      },
      tooltip: { y: { formatter: (value) => etb(value) } },
    },
  };

  const handleExport = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Profit report", rangeText],
      ["From", isAllTime ? "All time" : from, "To", to],
      [],
      ["Revenue", data.totals.revenue.toFixed(2)],
      ["Cost of goods", data.totals.cogs.toFixed(2)],
      ["Gross profit", data.totals.grossProfit.toFixed(2)],
      ["Expenses", data.totals.expenses.toFixed(2)],
      ["Net profit", data.totals.netProfit.toFixed(2)],
      [],
      ["Period", "Revenue", "Cost of goods", "Expenses", "Profit"],
      ...data.trend.map((row) => [row.period, row.revenue.toFixed(2), row.cogs.toFixed(2), row.expenses.toFixed(2), row.profit.toFixed(2)]),
      [],
      ["Product", "SKU", "Category", "Qty sold", "Revenue", "Cost", "Profit", "Margin"],
      ...data.products.map((p) => [p.name, p.sku, p.category, p.quantity, p.revenue.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2), pct(p.margin)]),
      [],
      ["Expense", "Amount"],
      ...data.expenses.map((e) => [e.name, e.amount.toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profit-${isAllTime ? "all-time" : from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-full bg-[#F6F7FB] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------- Top bar ---------------- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Profit</h1>
            <p className="text-sm text-[#64748B]">How much your store made {rangeText}</p>
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
            Couldn't load profit data.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------- Hero ---------------- */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-xl sm:p-7">
          <div
            className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl ${
              isProfit ? "bg-emerald-500/25" : "bg-red-500/25"
            }`}
          />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
            <div>
              <p className="text-sm font-medium text-white/60">{isProfit ? "Net profit" : "Net loss"}</p>
              {loading ? (
                <span className="mt-3 block h-12 w-64 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className={`mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${isProfit ? "" : "text-red-300"}`}>
                  {etb(net)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/60">
                {!loading && <ChangeChip change={changeOf(net, previous?.totals.netProfit)} dark />}
                <span>
                  {revenue > 0 ? `${pct(net / revenue)} of revenue` : "No revenue yet"}
                  {!isAllTime && " · vs previous period"}
                </span>
              </div>
            </div>

            <div className="h-28">
              {trend.length > 1 ? (
                <Chart options={heroChart.options} series={heroChart.series} type="area" height="100%" />
              ) : (
                <div className="flex h-full items-end text-xs text-white/40">
                  Pick a longer range to see the trend
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-4">
            {[
              { label: "Revenue", value: revenue, prev: previous?.totals.revenue, color: COLORS.revenue },
              { label: "Cost of goods", value: totals?.cogs ?? 0, prev: previous?.totals.cogs, color: COLORS.costs, inverse: true },
              { label: "Expenses", value: totals?.expenses ?? 0, prev: previous?.totals.expenses, color: "#F43F5E", inverse: true },
              { label: "Orders", value: orders?.count ?? 0, prev: previous?.orders.count, color: "#A78BFA", count: true },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stat.color }} />
                  {stat.label}
                </p>
                {loading ? (
                  <span className="mt-1.5 block h-6 w-24 animate-pulse rounded bg-white/10" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {stat.count ? stat.value.toLocaleString("en-US") : etb(stat.value, 0)}
                  </p>
                )}
                {!loading && !isAllTime && <ChangeChip change={changeOf(stat.value, stat.prev)} inverse={stat.inverse} dark />}
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Metrics ---------------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Gross margin"
            value={revenue > 0 ? pct((totals?.grossProfit ?? 0) / revenue) : "—"}
            change={changeOf(
              revenue > 0 ? (totals?.grossProfit ?? 0) / revenue : 0,
              previous && previous.totals.revenue > 0 ? previous.totals.grossProfit / previous.totals.revenue : undefined,
            )}
            icon={FiPercent}
            tone=""
            ring={revenue > 0 ? (totals?.grossProfit ?? 0) / revenue : 0}
            loading={loading}
          />
          <Metric
            label="Average order"
            value={etb(orders?.averageOrderValue ?? 0)}
            change={changeOf(orders?.averageOrderValue ?? 0, previous?.orders.averageOrderValue)}
            icon={FiShoppingBag}
            tone="bg-blue-50 text-blue-500"
            loading={loading}
          />
          <Metric
            label="Profit per order"
            value={etb(orders?.averageProfitPerOrder ?? 0)}
            change={changeOf(orders?.averageProfitPerOrder ?? 0, previous?.orders.averageProfitPerOrder)}
            icon={FiTag}
            tone="bg-emerald-50 text-emerald-500"
            loading={loading}
          />
          <Metric
            label="Items sold"
            value={(orders?.itemsSold ?? 0).toLocaleString("en-US")}
            change={changeOf(orders?.itemsSold ?? 0, previous?.orders.itemsSold)}
            icon={FiPackage}
            tone="bg-violet-50 text-violet-500"
            loading={loading}
          />
        </div>

        {/* ---------------- Insights ---------------- */}
        {insights.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {insights.map((tip) => (
              <div
                key={tip.text}
                className={`flex gap-3 rounded-2xl p-4 text-sm ${
                  tip.tone === "good"
                    ? "bg-emerald-50 text-emerald-800"
                    : tip.tone === "bad"
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-800"
                }`}
              >
                {tip.tone === "bad" ? (
                  <FiAlertCircle className="mt-0.5 shrink-0" />
                ) : (
                  <FiZap className="mt-0.5 shrink-0" />
                )}
                <p>{tip.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- Trend + flow ---------------- */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card
            title="Revenue vs costs"
            subtitle={granularity === "month" ? "By month" : "By day"}
          >
            {loading ? (
              <div className="h-72 animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ) : trend.length === 0 ? (
              <div className="grid h-72 place-items-center text-sm text-[#94A3B8]">No activity in this period</div>
            ) : (
              <Chart options={comboChart.options} series={comboChart.series} type="line" height={290} />
            )}
          </Card>

          <Card title="Profit flow" subtitle="From revenue to what you keep">
            {totals ? (
              <ProfitFlow totals={totals} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-[#F1F5F9]" />
            )}
          </Card>
        </div>

        {/* ---------------- Products + categories + expenses ---------------- */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card
            title="Products"
            subtitle="Profit after cost of goods, net of returns"
            action={
              <div className="flex rounded-xl bg-[#F1F5F9] p-0.5 text-xs font-medium">
                {(
                  [
                    ["top", "Top earners"],
                    ["low", "Lowest margin"],
                    ["losing", `Losing money${losingCount ? ` · ${losingCount}` : ""}`],
                  ] as [ProductTab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProductTab(key)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 transition ${
                      productTab === key ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="block h-12 animate-pulse rounded-xl bg-[#F1F5F9]" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-sm text-[#94A3B8]">
                <FiBox size={22} />
                {productTab === "losing" ? "No product is selling below cost 🎉" : "No product sales in this period"}
              </div>
            ) : (
              <ul className="space-y-1">
                {products.slice(0, 8).map((product, index) => {
                  const marginTone =
                    product.margin < 0
                      ? "bg-red-50 text-red-600"
                      : product.margin < 0.15
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700";

                  return (
                    <li
                      key={product.productId}
                      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-[#F8FAFC] sm:grid-cols-[28px_minmax(0,1fr)_90px_120px_70px]"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F5F9] text-xs font-bold text-[#64748B]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{product.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="truncate text-xs text-[#94A3B8]">{product.category}</span>
                          <div className="hidden h-1 flex-1 overflow-hidden rounded-full bg-[#F1F5F9] sm:block">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(Math.abs(product.profit) / topProfit) * 100}%`,
                                backgroundColor: product.profit >= 0 ? COLORS.profit : COLORS.loss,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="hidden text-right text-xs text-[#64748B] sm:block">
                        <span className="font-semibold text-[#0F172A]">{product.quantity.toLocaleString("en-US")}</span> sold
                      </p>
                      <p
                        className={`text-right text-sm font-bold tabular-nums ${
                          product.profit >= 0 ? "text-[#0F172A]" : "text-red-500"
                        }`}
                      >
                        {etb(product.profit, 0)}
                      </p>
                      <span className={`hidden justify-self-end rounded-full px-2 py-0.5 text-xs font-semibold sm:block ${marginTone}`}>
                        {pct(product.margin)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="space-y-5">
            <Card title="Profit by category">
              {loading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ) : (data?.categories.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-[#94A3B8]">No sales in this period</p>
              ) : (
                <ul className="space-y-3">
                  {data!.categories.map((category) => {
                    const max = Math.max(...data!.categories.map((c) => Math.abs(c.profit)), 1);
                    return (
                      <li key={category.name}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-[#475569]">{category.name}</span>
                          <span className={`font-semibold tabular-nums ${category.profit < 0 ? "text-red-500" : "text-[#0F172A]"}`}>
                            {etb(category.profit, 0)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(Math.abs(category.profit) / max) * 100}%`,
                              backgroundColor: category.profit >= 0 ? "#FE9F43" : COLORS.loss,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card
              title="Where expenses go"
              action={
                <Link to="/expenses" className="text-xs font-medium text-[#FE9F43] hover:underline">
                  Expenses →
                </Link>
              }
            >
              {loading ? (
                <div className="h-56 animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ) : expenseRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#94A3B8]">No expenses in this period</p>
              ) : (
                <>
                  <Chart options={donutChart.options} series={donutChart.series} type="donut" height={210} />
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {expenseRows.map((row, index) => (
                      <li key={row.name} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-[#475569]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                          />
                          <span className="truncate capitalize">{row.name.toLowerCase()}</span>
                        </span>
                        <span className="font-medium tabular-nums text-[#0F172A]">{etb(row.amount, 0)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>

        <p className="text-center text-xs text-[#94A3B8]">
          Revenue {etb(revenue, 0)} − costs {etb(costs, 0)} = {etb(net, 0)}. Figures come from posted journal entries.
        </p>
      </div>
    </section>
  );
}
