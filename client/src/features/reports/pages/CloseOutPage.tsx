// client/src/features/reports/pages/CloseOutPage.tsx
//
// End-of-period close-out (EOD / EOW / EOM / EOY): sales, money
// received, returns, profit, expenses, purchases, VAT and money
// channel balances for one day, week, month or year.

import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import {
  useGetCloseOutQuery,
  type CloseOutPeriod,
} from "../../../api/api";

// ============================================================
// HELPERS
// ============================================================

const PERIODS: { key: CloseOutPeriod; short: string; label: string }[] = [
  { key: "day", short: "EOD", label: "End of Day" },
  { key: "week", short: "EOW", label: "End of Week" },
  { key: "month", short: "EOM", label: "End of Month" },
  { key: "year", short: "EOY", label: "End of Year" },
];

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  BANK: "Bank",
  NONE: "No refund",
};

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function shiftDate(value: string, period: CloseOutPeriod, step: number) {
  const date = parseDay(value);
  if (period === "day") date.setDate(date.getDate() + step);
  if (period === "week") date.setDate(date.getDate() + step * 7);
  if (period === "month") date.setMonth(date.getMonth() + step, 1);
  if (period === "year") date.setFullYear(date.getFullYear() + step, 0, 1);
  return toDateInput(date);
}

function etb(value: number) {
  const formatted = Math.abs(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "−" : ""}ETB ${formatted}`;
}

function compact(value: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function periodTitle(period: CloseOutPeriod, fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);

  if (period === "day") {
    return from.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  if (period === "week") {
    const start = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const end = to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${start} – ${end}`;
  }
  if (period === "month") {
    return from.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return String(from.getFullYear());
}

function bucketLabel(period: CloseOutPeriod, key: string) {
  if (period === "day") {
    const hour = Number(key);
    return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
  }
  if (period === "year") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y!, m! - 1, 1).toLocaleDateString("en-US", { month: "short" });
  }
  if (period === "week") {
    return parseDay(key).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  }
  return String(parseDay(key).getDate());
}

// ============================================================
// UI PIECES
// ============================================================

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 text-sm ${
        strong ? "border-t border-[#EEF2F6] pt-2.5 font-semibold text-[#0F172A]" : ""
      } ${muted ? "text-[#94A3B8]" : "text-[#475569]"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : "text-[#0F172A]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#94A3B8]">{sub}</p>}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function CloseOutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDateInput(new Date());

  const periodParam = searchParams.get("period");
  const period: CloseOutPeriod = PERIODS.some((p) => p.key === periodParam)
    ? (periodParam as CloseOutPeriod)
    : "day";
  const date = searchParams.get("date") || today;

  const setParams = (nextPeriod: CloseOutPeriod, nextDate: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("period", nextPeriod);
    next.set("date", nextDate);
    setSearchParams(next, { replace: true });
  };

  const { data, isFetching, isError, refetch } = useGetCloseOutQuery(
    { period, date },
    { refetchOnMountOrArgChange: true },
  );

  const loading = isFetching && !data;
  const activePeriod = PERIODS.find((p) => p.key === period)!;
  const nextDate = shiftDate(date, period, 1);
  const isCurrent = data ? new Date(data.to) >= new Date() : false;

  const breakdown = data?.breakdown ?? [];
  const chart: { options: ApexOptions; series: NonNullable<ApexOptions["series"]> } = {
    series: [{ name: "Sales", data: breakdown.map((row) => Math.round(row.total * 100) / 100) }],
    options: {
      chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
      colors: ["#FE9F43"],
      plotOptions: { bar: { borderRadius: 4, columnWidth: breakdown.length > 20 ? "70%" : "50%" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#EEF2F6", strokeDashArray: 4 },
      xaxis: {
        categories: breakdown.map((row) => bucketLabel(period, row.key)),
        labels: { style: { colors: "#94A3B8", fontSize: "11px" }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { formatter: (value) => compact(value), style: { colors: "#94A3B8", fontSize: "11px" } } },
      tooltip: {
        y: {
          formatter: (value, opts) =>
            `${etb(value)} · ${breakdown[opts?.dataPointIndex ?? 0]?.count ?? 0} sales`,
        },
      },
    },
  };

  return (
    <section className="min-h-full bg-[#F6F7FB] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------- Top bar ---------------- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {activePeriod.label} Report
            </h1>
            <p className="text-sm text-[#64748B]">
              {data ? periodTitle(period, data.from, data.to) : "Loading…"}
              {isCurrent && " · period still open"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.label}
                  onClick={() => setParams(p.key, date)}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                    period === p.key ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {p.short}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={() => setParams(period, shiftDate(date, period, -1))}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl text-[#64748B] hover:text-[#0F172A]"
                aria-label="Previous period"
              >
                <FiChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setParams(period, e.target.value)}
                className="rounded-xl border-0 bg-transparent px-2 py-1 text-sm text-[#0F172A] outline-none"
              />
              <button
                type="button"
                onClick={() => setParams(period, nextDate)}
                disabled={nextDate > today}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl text-[#64748B] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next period"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </header>

        {isError && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Couldn't load the close-out report.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* ---------------- KPIs ---------------- */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Net sales" value={etb(data.netSales)} sub={`after ${etb(data.returns.total)} returns`} />
              <Kpi
                label="Transactions"
                value={data.sales.count.toLocaleString()}
                sub={`${data.sales.itemsSold.toLocaleString()} items · avg ${etb(data.sales.average)}`}
              />
              <Kpi label="Money received" value={etb(data.paymentsTotal)} sub="all payment methods" />
              <Kpi
                label={data.profit.netProfit >= 0 ? "Net profit" : "Net loss"}
                value={etb(data.profit.netProfit)}
                tone={data.profit.netProfit >= 0 ? "good" : "bad"}
              />
            </div>

            {/* ---------------- Breakdown ---------------- */}
            <Card title={period === "day" ? "Sales by hour" : period === "year" ? "Sales by month" : "Sales by day"}>
              <Chart type="bar" height={240} options={chart.options} series={chart.series} />
            </Card>

            <div className="grid gap-5 lg:grid-cols-3">
              {/* ---------------- Sales ---------------- */}
              <Card title="Sales summary">
                <Row label="Gross sales" value={etb(data.sales.gross)} />
                <Row label="Discounts" value={etb(-data.sales.discounts)} />
                <Row label="VAT" value={etb(data.sales.tax)} />
                <Row label="Total sales" value={etb(data.sales.total)} strong />
                <Row label={`Returns (${data.returns.count})`} value={etb(-data.returns.total)} />
                <Row label="Net sales" value={etb(data.netSales)} strong />
                <Row label="Paid on these sales" value={etb(data.sales.paid)} muted />
                <Row label="Still due (credit)" value={etb(data.sales.due)} muted />
                <Row
                  label={`Cancelled (${data.sales.cancelledCount})`}
                  value={etb(data.sales.cancelledTotal)}
                  muted
                />
              </Card>

              {/* ---------------- Payments ---------------- */}
              <Card title="Money received by method">
                {data.payments.map((row) => (
                  <Row
                    key={row.method}
                    label={`${METHOD_LABELS[row.method]} (${row.count})`}
                    value={etb(row.amount)}
                  />
                ))}
                <Row label="Total received" value={etb(data.paymentsTotal)} strong />

                {data.returns.byMethod.length > 0 && (
                  <>
                    <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                      Refunds
                    </p>
                    {data.returns.byMethod.map((row) => (
                      <Row key={row.method} label={METHOD_LABELS[row.method]} value={etb(-row.amount)} />
                    ))}
                  </>
                )}
              </Card>

              {/* ---------------- Profit ---------------- */}
              <Card title="Profit">
                <Row label="Revenue" value={etb(data.profit.revenue)} />
                <Row label="Cost of goods sold" value={etb(-data.profit.costOfSales)} />
                <Row label="Gross profit" value={etb(data.profit.grossProfit)} strong />
                <Row label="Operating expenses" value={etb(-data.profit.operatingExpenses)} />
                <Row
                  label={data.profit.netProfit >= 0 ? "Net profit" : "Net loss"}
                  value={etb(data.profit.netProfit)}
                  strong
                />
                <p className="mt-2 text-xs text-[#94A3B8]">From posted journal entries, same as Profit / Loss.</p>
              </Card>
            </div>

            {/* ---------------- Money channels ---------------- */}
            <Card title="Money channels">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#94A3B8]">
                      <th className="py-2 font-medium">Channel</th>
                      <th className="py-2 text-right font-medium">Opening</th>
                      <th className="py-2 text-right font-medium">In</th>
                      <th className="py-2 text-right font-medium">Out</th>
                      <th className="py-2 text-right font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#475569]">
                    {data.channels.map((row) => (
                      <tr key={row.key} className="border-t border-[#EEF2F6]">
                        <td className="py-2 font-medium text-[#0F172A]">{row.label}</td>
                        <td className="py-2 text-right tabular-nums">{etb(row.opening)}</td>
                        <td className="py-2 text-right tabular-nums text-emerald-600">{etb(row.moneyIn)}</td>
                        <td className="py-2 text-right tabular-nums text-red-500">{etb(-row.moneyOut)}</td>
                        <td className="py-2 text-right font-semibold tabular-nums text-[#0F172A]">
                          {etb(row.closing)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#EEF2F6] font-semibold text-[#0F172A]">
                      <td className="py-2">Total</td>
                      {(["opening", "moneyIn", "moneyOut", "closing"] as const).map((field) => {
                        const sum = data.channels.reduce((acc, row) => acc + row[field], 0);
                        return (
                          <td key={field} className="py-2 text-right tabular-nums">
                            {etb(field === "moneyOut" ? -sum : sum)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[#94A3B8]">
                Count the cash drawer and compare it with the Cash Register closing balance.
              </p>
            </Card>

            <div className="grid gap-5 lg:grid-cols-3">
              {/* ---------------- Expenses ---------------- */}
              <Card title={`Expenses (${data.expenses.count})`}>
                {data.expenses.byCategory.length === 0 && <p className="text-sm text-[#94A3B8]">No expenses.</p>}
                {data.expenses.byCategory.map((row) => (
                  <Row key={row.category} label={row.category} value={etb(row.amount)} />
                ))}
                <Row label="Total expenses" value={etb(data.expenses.total)} strong />
              </Card>

              {/* ---------------- Purchases ---------------- */}
              <Card title={`Purchases (${data.purchases.count})`}>
                <Row label="Total purchases" value={etb(data.purchases.total)} />
                <Row label="Paid" value={etb(data.purchases.paid)} />
                <Row label="Owed to suppliers" value={etb(data.purchases.due)} strong />
              </Card>

              {/* ---------------- VAT ---------------- */}
              <Card title="VAT">
                <Row label="Collected" value={etb(data.vat.collected)} />
                <Row label="Reversed (returns)" value={etb(-data.vat.reversed)} />
                <Row label="Net VAT" value={etb(data.vat.net)} strong />
                <Row label="Paid to authority" value={etb(data.vat.paid)} muted />
                <Row label="Payable at period end" value={etb(data.vat.payable)} muted />
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* ---------------- Cashiers ---------------- */}
              <Card title="Sales by cashier">
                {data.cashiers.length === 0 && <p className="text-sm text-[#94A3B8]">No sales.</p>}
                {data.cashiers.map((row) => (
                  <Row key={row.userId} label={`${row.email} (${row.count})`} value={etb(row.total)} />
                ))}
              </Card>

              {/* ---------------- Top products ---------------- */}
              <Card title="Top products">
                {data.topProducts.length === 0 && <p className="text-sm text-[#94A3B8]">No products sold.</p>}
                {data.topProducts.map((row) => (
                  <Row
                    key={row.productId}
                    label={`${row.name} × ${row.quantity.toLocaleString()}`}
                    value={etb(row.revenue)}
                  />
                ))}
              </Card>
            </div>

            <p className="text-right text-xs text-[#94A3B8]">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
