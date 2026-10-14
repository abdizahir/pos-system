import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiPackage,
  FiPercent,
  FiPlus,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTrendingDown,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import {
  useGetDashboardQuery,
  useGetSalesSummaryQuery,
  type Dashboard as DashboardData,
  type DashboardChannel,
} from "../api/api";
import DatePicker from "../ui/DatePicker";
import SalesChart from "../components/charts/SalesChart";

// ============================================================
// HELPERS
// ============================================================

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Font size that fits the whole text on one line in its card: about
// 0.6em per character, never above 26px or below 15px
function fitFontSize(text: string) {
  return `clamp(15px, ${(150 / Math.max(text.length, 1)).toFixed(2)}cqi, 26px)`;
}

function percent(part: number, whole: number) {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CHANNEL_STYLE: Record<
  DashboardChannel["key"],
  { icon: IconType; tone: string }
> = {
  CASH: {
    icon: FiDollarSign,
    tone: "bg-[#FFF0E1] text-[#F27D16]",
  },
  BANK: {
    icon: FiHome,
    tone: "bg-[#E8F1FF] text-[#3675DF]",
  },
  WALLET: {
    icon: FiSmartphone,
    tone: "bg-[#F1EBFF] text-[#805AD5]",
  },
  MERCHANT: {
    icon: FiCreditCard,
    tone: "bg-[#FDECF3] text-[#D53F8C]",
  },
};

const SALE_STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
  RETURNED: "bg-gray-100 text-gray-600",
};

const QUICK_ACTIONS = [
  { label: "New Sale", to: "/pos", icon: FiShoppingCart, primary: true },
  { label: "Add Product", to: "/products?add=1", icon: FiPackage },
  { label: "Add Purchase", to: "/purchase?add=1", icon: FiShoppingBag },
  { label: "Add Expense", to: "/expenses?add=1", icon: FiFileText },
];

const EMPTY_CHANNELS: DashboardChannel[] = (
  [
    ["CASH", "Cash Register"],
    ["BANK", "Bank"],
    ["WALLET", "Wallet"],
    ["MERCHANT", "Merchant"],
  ] as const
).map(([key, label]) => ({
  key,
  label,
  moneyIn: 0,
  moneyOut: 0,
  net: 0,
  balance: 0,
}));

// ============================================================
// SMALL PIECES
// ============================================================

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span className={`block animate-pulse rounded bg-[#EEF1F4] ${className}`} />
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#E6EAED] bg-white shadow-sm ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#E6EAED] px-5 py-4">
        <h2 className="font-semibold text-text-two">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1 text-xs font-medium text-[#FE9F43] hover:underline"
    >
      {label} <FiArrowRight size={13} />
    </Link>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  tone,
  to,
  loading,
  highlight,
  negative,
}: {
  title: string;
  value: number | undefined;
  sub?: string;
  icon: IconType;
  tone: string;
  to: string;
  loading: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`@container group relative block overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? negative
            ? "border-transparent bg-linear-to-br from-[#E53E3E] to-[#C53030] text-white"
            : "border-transparent bg-linear-to-br from-[#1B2850] to-[#2C3E73] text-white"
          : "border-[#E6EAED] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-sm font-medium ${highlight ? "text-white/80" : "text-[#646B72]"}`}
        >
          {title}
        </p>
        <span
          className={`rounded-xl p-2.5 ${highlight ? "bg-white/15 text-white" : tone}`}
        >
          <Icon size={18} />
        </span>
      </div>

      {loading || value === undefined ? (
        <Skeleton className="mt-3 h-8 w-36" />
      ) : (
        <p
          // Shrinks long amounts to fit the card instead of cutting
          // them off with "..."
          style={{ fontSize: fitFontSize(money(value)) }}
          className={`mt-2 whitespace-nowrap font-bold leading-tight tabular-nums ${
            highlight
              ? "text-white"
              : negative
                ? "text-[#E53E3E]"
                : "text-text-two"
          }`}
        >
          {money(value)}
        </p>
      )}

      <p
        className={`mt-2 flex items-center gap-1 text-xs ${highlight ? "text-white/75" : "text-[#8A94A3]"}`}
      >
        {loading ? <Skeleton className="h-3 w-24" /> : sub}
      </p>
    </Link>
  );
}

function ChannelCard({
  channel,
  loading,
  date,
  dayLabel,
}: {
  channel: DashboardChannel;
  loading: boolean;
  date: string;
  dayLabel: string;
}) {
  const style = CHANNEL_STYLE[channel.key];
  const Icon = style.icon;

  return (
    <Link
      to={`/account-statement?type=${channel.key.toLowerCase()}&from=${date}&to=${date}`}
      className="group block rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FE9F43]/60 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-xl p-2 ${style.tone}`}>
            <Icon size={17} />
          </span>
          <p className="text-sm font-semibold text-text-two">{channel.label}</p>
        </div>
        <FiArrowRight
          size={15}
          className="text-[#C2C8CF] transition group-hover:translate-x-0.5 group-hover:text-[#FE9F43]"
        />
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-7 w-32" />
      ) : (
        <p
          className={`mt-4 text-xl font-bold tabular-nums ${
            channel.net < 0 ? "text-[#E53E3E]" : "text-text-two"
          }`}
        >
          {money(channel.net)}
        </p>
      )}
      <p className="text-xs text-[#8A94A3]">Net · {dayLabel}</p>
    </Link>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  to,
  loading,
  alert,
}: {
  label: string;
  value: number | undefined;
  icon: IconType;
  tone: string;
  to: string;
  loading: boolean;
  alert?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F9FAFB]"
    >
      <span className={`rounded-xl p-2.5 ${tone}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#646B72]">{label}</p>
        {loading || value === undefined ? (
          <Skeleton className="mt-1 h-5 w-10" />
        ) : (
          <p
            className={`text-lg font-bold tabular-nums ${
              alert && value > 0 ? "text-[#E53E3E]" : "text-text-two"
            }`}
          >
            {value.toLocaleString("en-US")}
          </p>
        )}
      </div>
      <FiChevronRight size={15} className="text-[#C2C8CF]" />
    </Link>
  );
}

// ============================================================
// SHORT P&L
// ============================================================

function PlRow({
  label,
  value,
  sign,
  muted,
}: {
  label: string;
  value: number;
  sign?: "-";
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={muted ? "pl-4 text-[#8A94A3]" : "text-[#646B72]"}>
        {label}
      </span>
      <span
        className={`tabular-nums ${muted ? "text-[#8A94A3]" : "font-medium text-text-two"}`}
      >
        {sign === "-" && value > 0 ? "− " : ""}
        {money(value)}
      </span>
    </div>
  );
}

function PlTotal({
  label,
  value,
  margin,
  strong,
}: {
  label: string;
  value: number;
  margin: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-t py-2.5 ${
        strong ? "border-text-two/80" : "border-dashed border-[#D5DADF]"
      }`}
    >
      <span
        className={`font-semibold text-text-two ${strong ? "text-base" : "text-sm"}`}
      >
        {label}
        <span className="ml-2 rounded-full bg-[#F4F6F8] px-2 py-0.5 text-[11px] font-medium text-[#646B72]">
          {margin} margin
        </span>
      </span>
      <span
        className={`font-bold tabular-nums ${strong ? "text-lg" : "text-sm"} ${
          value < 0
            ? "text-[#E53E3E]"
            : strong
              ? "text-emerald-600"
              : "text-text-two"
        }`}
      >
        {money(value)}
      </span>
    </div>
  );
}

function ShortProfitLoss({
  pl,
  loading,
  dayLabel,
}: {
  pl: DashboardData["profitLoss"] | undefined;
  loading: boolean;
  dayLabel: string;
}) {
  const revenue = pl?.revenue.total ?? 0;
  const cogs = pl?.costOfSales.total ?? 0;
  const opex = pl?.operatingExpenses.total ?? 0;
  const gross = pl?.grossProfit ?? 0;
  const net = pl?.netProfit ?? 0;

  // Revenue split bar: COGS / OpEx / Profit
  const base = Math.max(revenue, cogs + opex, 1);
  const segments = [
    { label: "Cost of goods", value: cogs, color: "bg-[#F6AD55]" },
    { label: "Expenses", value: opex, color: "bg-[#FC8181]" },
    { label: "Net profit", value: Math.max(net, 0), color: "bg-[#48BB78]" },
  ];

  return (
    <Panel
      title={`Profit & Loss · ${dayLabel}`}
      action={<PanelLink to="/profit-loss" label="Full report" />}
    >
      {loading || !pl ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 p-5 @2xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <PlRow label="Revenue" value={revenue} />
            <PlRow label="Cost of goods sold" value={cogs} sign="-" />
            <PlTotal
              label="Gross profit"
              value={gross}
              margin={percent(gross, revenue)}
            />

            <PlRow label="Operating expenses" value={opex} sign="-" />
            {pl.operatingExpenses.accounts
              .filter((account) => account.amount !== 0)
              .slice(0, 4)
              .map((account) => (
                <PlRow
                  key={account.id}
                  label={account.name}
                  value={account.amount}
                  muted
                />
              ))}

            <PlTotal
              label="Net profit"
              value={net}
              margin={percent(net, revenue)}
              strong
            />
          </div>

          <div className="flex flex-col justify-center rounded-xl bg-[#F9FAFB] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#646B72]">
              Where revenue went
            </p>

            {revenue === 0 && cogs === 0 && opex === 0 ? (
              <p className="mt-3 text-sm text-[#8A94A3]">
                No activity on this day.
              </p>
            ) : (
              <>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#E9ECEF]">
                  {segments.map((segment) =>
                    segment.value > 0 ? (
                      <div
                        key={segment.label}
                        className={segment.color}
                        style={{ width: `${(segment.value / base) * 100}%` }}
                        title={`${segment.label}: ${money(segment.value)}`}
                      />
                    ) : null,
                  )}
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  {segments.map((segment) => (
                    <li
                      key={segment.label}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-[#646B72]">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${segment.color}`}
                        />
                        {segment.label}
                      </span>
                      <span className="font-medium tabular-nums text-text-two">
                        {percent(segment.value, revenue)}
                      </span>
                    </li>
                  ))}
                </ul>

                {net < 0 && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    Loss of {money(Math.abs(net))} — costs exceeded revenue.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const date = toISODate(selectedDate);
  const isToday = date === toISODate(new Date());

  const { data, isFetching, isError, refetch } = useGetDashboardQuery(
    { date },
    { refetchOnMountOrArgChange: true },
  );
  // Only what the chart and recent list need: one year up to the selected day
  const yearBefore = new Date(selectedDate);
  yearBefore.setFullYear(yearBefore.getFullYear() - 1);
  const { data: sales = [], isLoading: salesLoading } = useGetSalesSummaryQuery(
    { from: toISODate(yearBefore), to: date },
    { refetchOnMountOrArgChange: true },
  );

  const loading = isFetching && !data;
  const day = data?.day;
  const overall = data?.overall;
  const channels = data?.channels ?? EMPTY_CHANNELS;
  const totalNet = channels.reduce((sum, channel) => sum + channel.net, 0);

  const recentSales = useMemo(
    () =>
      [...sales]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [sales],
  );

  const dayLabel = isToday
    ? "Today"
    : selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const netNegative = !!day && day.netProfit < 0;

  return (
    <section className="min-h-full bg-[#F4F6F8] p-4 sm:p-6">
      {/* Columns follow the dashboard's own width, not the window's, so
          Edge and Chrome lay it out the same at any zoom or sidebar */}
      <div className="@container mx-auto max-w-375 space-y-6">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#646B72]">
              {greeting()} 👋
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-text-two">
              {isToday ? "Here's your store today" : `Store on ${dayLabel}`}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DatePicker value={selectedDate} onChange={setSelectedDate} />
            {!isToday && (
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setSelectedDate(d);
                }}
                className="cursor-pointer rounded-xl border border-[#E6EAED] bg-white px-3 py-2 text-sm font-medium text-text-two shadow-sm hover:bg-gray-50"
              >
                Today
              </button>
            )}
          </div>
        </header>

        {/* ---------------- Quick actions ---------------- */}
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ label, to, icon: Icon, primary }) => (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition ${
                primary
                  ? "bg-[#FE9F43] text-white shadow-[#FE9F43]/30 hover:bg-[#F28F2F]"
                  : "border border-[#E6EAED] bg-white text-text-two hover:border-[#FE9F43]/60"
              }`}
            >
              {primary ? <Icon size={16} /> : <FiPlus size={15} />}
              {label}
            </Link>
          ))}
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load dashboard data for this day.
            <button
              type="button"
              onClick={() => refetch()}
              className="cursor-pointer font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ---------------- KPIs ---------------- */}
        <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
          <KpiCard
            title="Revenue"
            value={day?.revenue}
            sub={
              day
                ? `${day.salesCount} sales · avg ${money(
                    day.salesCount ? day.salesTotal / day.salesCount : 0,
                  )}`
                : undefined
            }
            icon={FiTrendingUp}
            tone="bg-[#E5F8EE] text-[#15935A]"
            to="/sales"
            loading={loading}
          />
          <KpiCard
            title="Purchases"
            value={day?.purchases}
            sub={
              day
                ? `${day.purchasesCount} purchase${day.purchasesCount === 1 ? "" : "s"} from suppliers`
                : undefined
            }
            icon={FiShoppingBag}
            tone="bg-[#E8F1FF] text-[#3675DF]"
            to="/purchase"
            loading={loading}
          />
          <KpiCard
            title="Expenses"
            value={day?.expenses}
            sub={
              day
                ? `${day.expensesCount} expense${day.expensesCount === 1 ? "" : "s"}`
                : undefined
            }
            icon={FiFileText}
            tone="bg-[#FFF0E1] text-[#F27D16]"
            to="/expenses"
            loading={loading}
          />
          <KpiCard
            title="Net Profit"
            value={day?.netProfit}
            sub={
              day
                ? `${percent(day.netProfit, day.revenue)} net margin`
                : undefined
            }
            icon={netNegative ? FiTrendingDown : FiTrendingUp}
            tone=""
            to="/profit-loss"
            loading={loading}
            highlight
            negative={netNegative}
          />
        </div>

        {/* ---------------- Money ---------------- */}
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-text-two">Money</h2>
            <p className="text-xs text-[#8A94A3]">
              {loading ? "…" : `Net for ${isToday ? "today" : dayLabel}: ${money(totalNet)}`} · click a card
              for its statement
            </p>
          </div>
          <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.key}
                channel={channel}
                loading={loading}
                date={date}
                dayLabel={dayLabel}
              />
            ))}
          </div>
        </div>

        {/* ---------------- VAT ---------------- */}
        <Link
          to={`/vat?from=${date}&to=${date}`}
          className="group flex flex-col gap-4 rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-sm transition hover:border-[#FE9F43]/60 hover:shadow-md @2xl:flex-row @2xl:items-center"
        >
          <div className="flex items-center gap-3 @2xl:w-56">
            <span className="rounded-xl bg-[#FFF0E1] p-2.5 text-[#F27D16]">
              <FiPercent size={18} />
            </span>
            <div>
              <p className="font-semibold text-text-two">VAT 15%</p>
              <p className="text-xs text-[#8A94A3]">
                VAT on this day's sales
              </p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-4">
            {[
              {
                label: "Collected",
                value: data?.vat?.collected,
                tone: "text-emerald-600",
              },
              {
                label: "Reversed",
                value: data?.vat?.reversed,
                tone: "text-red-500",
              },
              {
                label: "Net VAT",
                value: data?.vat?.net,
                tone: "text-[#F27D16]",
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-[#646B72]">{item.label}</p>
                {loading || item.value === undefined ? (
                  <Skeleton className="mt-1 h-5 w-24" />
                ) : (
                  <p
                    className={`text-base font-bold tabular-nums ${item.tone}`}
                  >
                    {money(item.value)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <FiArrowRight
            size={16}
            className="hidden text-[#C2C8CF] transition group-hover:translate-x-0.5 group-hover:text-[#FE9F43] @2xl:block"
          />
        </Link>

        {/* ---------------- Chart + recent sales ---------------- */}
        <div className="grid gap-4 @4xl:grid-cols-3">
          <div className="min-w-0 @4xl:col-span-2">
            <SalesChart
              sales={sales}
              selectedDate={selectedDate}
              isLoading={salesLoading}
            />
          </div>

          <Panel
            title="Recent Sales"
            action={<PanelLink to="/sales" label="View all" />}
          >
            {salesLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <FiShoppingCart size={24} className="text-[#C2C8CF]" />
                <p className="text-sm text-[#646B72]">No sales yet.</p>
                <Link
                  to="/pos"
                  className="text-sm font-medium text-[#FE9F43] hover:underline"
                >
                  Make the first sale
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F3F5]">
                {recentSales.map((sale) => (
                  <li key={sale.id}>
                    <Link
                      to={`/sales/${sale.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-[#F9FAFB]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-medium text-text-two">
                          {sale.invoiceNumber}
                        </p>
                        <p className="text-xs text-[#8A94A3]">
                          {new Date(sale.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-text-two">
                          {money(Number(sale.total))}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            SALE_STATUS_STYLE[sale.status] ??
                            SALE_STATUS_STYLE.RETURNED
                          }`}
                        >
                          {sale.status.toLowerCase()}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------------- Inventory & contacts ---------------- */}
        <Panel title="Inventory & Contacts">
          <div className="grid gap-1 p-2 @lg:grid-cols-2 @2xl:grid-cols-5">
            <StatTile
              label="Products"
              value={overall?.products}
              icon={FiBox}
              tone="bg-[#E8F1FF] text-[#3675DF]"
              to="/products"
              loading={loading}
            />
            <StatTile
              label="Low stock"
              value={overall?.lowStock}
              icon={FiAlertTriangle}
              tone="bg-amber-50 text-amber-600"
              to="/low-stocks"
              loading={loading}
              alert
            />
            <StatTile
              label="Out of stock"
              value={overall?.outOfStock}
              icon={FiPackage}
              tone="bg-red-50 text-red-500"
              to="/low-stocks"
              loading={loading}
              alert
            />
            <StatTile
              label="Customers"
              value={overall?.customers}
              icon={FiUsers}
              tone="bg-[#F1EBFF] text-[#805AD5]"
              to="/customers"
              loading={loading}
            />
            <StatTile
              label="Suppliers"
              value={overall?.suppliers}
              icon={FiTruck}
              tone="bg-[#FFF0E1] text-[#F27D16]"
              to="/suppliers"
              loading={loading}
            />
          </div>
        </Panel>

        {/* ---------------- Short P&L (last) ---------------- */}
        <ShortProfitLoss
          pl={data?.profitLoss}
          loading={loading}
          dayLabel={dayLabel}
        />
      </div>
    </section>
  );
}
