// client/src/features/reports/pages/CloseOutPage.tsx
//
// End-of-period close-out (EOD / EOW / EOM / EOY): sales, money
// received, profit, expenses, purchases, VAT and top products for
// one day, week, month or year, or any custom date range — in the
// system design.

import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiDollarSign,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";

import { useGetCloseOutQuery, type CloseOutPeriod } from "../../../api/api";
import { shopDetailsLine, useShop } from "../../shop/useShop";
import {
  AmountTable,
  ErrorBanner,
  KpiCard,
  ReportCard,
  ReportHeader,
} from "../components/ReportParts";
import {
  REPORT_CARD,
  downloadCsv,
  downloadPdf,
  etb,
  money,
  toDateInput,
  type PdfTable,
} from "../reportUtils";

// ============================================================
// HELPERS
// ============================================================

const PERIODS: { key: CloseOutPeriod; short: string; label: string }[] = [
  { key: "day", short: "EOD", label: "End of Day" },
  { key: "week", short: "EOW", label: "End of Week" },
  { key: "month", short: "EOM", label: "End of Month" },
  { key: "year", short: "EOY", label: "End of Year" },
  { key: "custom", short: "Custom", label: "Custom" },
];

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  BANK: "Bank",
  NONE: "No refund",
};


function periodTitle(period: CloseOutPeriod, fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

  if (period === "day") {
    return from.toLocaleDateString("en-GB", { weekday: "long", ...opts });
  }
  if (period === "custom" && from.toDateString() === to.toDateString()) {
    return from.toLocaleDateString("en-GB", { weekday: "long", ...opts });
  }
  if (period === "week" || period === "custom") {
    return `${from.toLocaleDateString("en-GB", opts)} – ${to.toLocaleDateString("en-GB", opts)}`;
  }
  if (period === "month") {
    return from.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  return String(from.getFullYear());
}

// Rows of label / amount for the summary cards and downloads
type Row = { key: string; label: string; value: number; tone?: string };

// ============================================================
// PAGE
// ============================================================

export default function CloseOutPage() {
  const { shop, name: shopName } = useShop();
  const pdfShop = { name: shopName, details: shopDetailsLine(shop) };
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDateInput(new Date());

  const periodParam = searchParams.get("period");
  const period: CloseOutPeriod = PERIODS.some((p) => p.key === periodParam)
    ? (periodParam as CloseOutPeriod)
    : "day";
  const appliedDate = searchParams.get("date") || today;

  // Custom range: defaults to the start of the month up to the date
  const appliedFrom = searchParams.get("from") || `${appliedDate.slice(0, 8)}01`;
  const appliedTo = searchParams.get("to") || appliedDate;

  const [fromDate, setFromDate] = useState(appliedFrom);
  const [toDate, setToDate] = useState(appliedTo);
  const [rangeError, setRangeError] = useState("");

  // Day / week / month / year show the period that contains today
  const apply = (nextPeriod: CloseOutPeriod, nextDate: string) => {
    setRangeError("");
    if (nextPeriod === "custom") {
      setFromDate(appliedFrom);
      setToDate(appliedTo);
      setSearchParams(
        { period: "custom", date: nextDate, from: appliedFrom, to: appliedTo },
        { replace: true },
      );
      return;
    }
    setSearchParams({ period: nextPeriod, date: nextDate }, { replace: true });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (period !== "custom") return;

    if (!fromDate || !toDate) {
      setRangeError("Choose both a start and an end date.");
      return;
    }
    if (fromDate > toDate) {
      setRangeError("The start date must be on or before the end date.");
      return;
    }
    setRangeError("");
    setSearchParams(
      { period: "custom", date: appliedDate, from: fromDate, to: toDate },
      { replace: true },
    );
  };

  const activePeriod = PERIODS.find((p) => p.key === period)!;
  const reportTitle =
    period === "custom" ? "Custom Range Report" : `${activePeriod.label} Report`;

  // --------------------------------------------------
  // Data
  // --------------------------------------------------

  const { data, isFetching, isError } = useGetCloseOutQuery(
    period === "custom"
      ? { period, from: appliedFrom, to: appliedTo }
      : { period, date: appliedDate },
    { refetchOnMountOrArgChange: true },
  );

  const title = data ? periodTitle(period, data.from, data.to) : "";
  const isOpen = data ? new Date(data.to) >= new Date() : false;

  const salesRows: Row[] = data
    ? [
        { key: "gross", label: "Gross sales", value: data.sales.gross },
        { key: "discounts", label: "Discounts", value: -data.sales.discounts },
        { key: "tax", label: "VAT", value: data.sales.tax },
        { key: "total", label: "Total sales", value: data.sales.total },
        { key: "returns", label: `Returns (${data.returns.count})`, value: -data.returns.total },
        { key: "due", label: "Still due (credit)", value: data.sales.due, tone: data.sales.due > 0 ? "text-red-500" : undefined },
        { key: "cancelled", label: `Cancelled (${data.sales.cancelledCount})`, value: data.sales.cancelledTotal },
      ]
    : [];

  const paymentRows: Row[] = (data?.payments ?? []).map((p) => ({
    key: p.method,
    label: `${METHOD_LABELS[p.method]} (${p.count})`,
    value: p.amount,
    tone: p.amount > 0 ? "text-green-600" : undefined,
  }));

  const profitRows: Row[] = data
    ? [
        { key: "revenue", label: "Revenue", value: data.profit.revenue },
        { key: "cogs", label: "Cost of goods sold", value: -data.profit.costOfSales },
        { key: "gross", label: "Gross profit", value: data.profit.grossProfit },
        { key: "opex", label: "Operating expenses", value: -data.profit.operatingExpenses },
      ]
    : [];

  const vatRows: Row[] = data
    ? [
        { key: "collected", label: "Collected", value: data.vat.collected },
        { key: "reversed", label: "Reversed (returns)", value: -data.vat.reversed },
        { key: "net", label: "Net VAT", value: data.vat.net },
      ]
    : [];

  const purchaseRows: Row[] = data
    ? [
        { key: "total", label: `Total purchases (${data.purchases.count})`, value: data.purchases.total },
        { key: "paid", label: "Paid", value: data.purchases.paid },
        { key: "due", label: "Owed to suppliers", value: data.purchases.due, tone: data.purchases.due > 0 ? "text-red-500" : undefined },
      ]
    : [];

  const toTableRows = (rows: Row[]) =>
    rows.map((row) => ({
      key: row.key,
      label: row.label,
      amount: money(row.value),
      tone: row.tone ?? (row.value < 0 ? "text-red-500" : undefined),
    }));

  // --------------------------------------------------
  // Downloads
  // --------------------------------------------------

  const fileBase =
    period === "custom"
      ? `close-out-${appliedFrom}-to-${appliedTo}`
      : `close-out-${activePeriod.short.toLowerCase()}-${appliedDate}`;

  const rowsFor = (rows: Row[]) => rows.map((row) => [row.label, money(row.value)]);

  const pdfTables = (): PdfTable[] => {
    if (!data) return [];
    return [
      {
        head: ["Summary", "Amount (ETB)"],
        body: [
          ["Net sales", money(data.netSales)],
          ["Sales", String(data.sales.count)],
          ["Money received", money(data.paymentsTotal)],
          [data.profit.netProfit >= 0 ? "Net profit" : "Net loss", money(data.profit.netProfit)],
        ],
        rightAlign: [1],
        boldRows: [3],
      },
      {
        title: "Sales Summary",
        head: ["Item", "Amount (ETB)"],
        body: [...rowsFor(salesRows), ["Net sales", money(data.netSales)]],
        rightAlign: [1],
        boldRows: [salesRows.length],
      },
      {
        title: "Money Received by Method",
        head: ["Method", "Amount (ETB)"],
        body: [...rowsFor(paymentRows), ["Total received", money(data.paymentsTotal)]],
        rightAlign: [1],
        boldRows: [paymentRows.length],
      },
      {
        title: "Profit",
        head: ["Item", "Amount (ETB)"],
        body: [...rowsFor(profitRows), ["Net profit", money(data.profit.netProfit)]],
        rightAlign: [1],
        boldRows: [profitRows.length],
      },
      {
        title: "Expenses",
        head: ["Category", "Amount (ETB)"],
        body: [
          ...data.expenses.byCategory.map((e) => [e.category, money(e.amount)]),
          ["Total expenses", money(data.expenses.total)],
        ],
        rightAlign: [1],
        boldRows: [data.expenses.byCategory.length],
      },
      { title: "Purchases", head: ["Item", "Amount (ETB)"], body: rowsFor(purchaseRows), rightAlign: [1] },
      { title: "VAT", head: ["Item", "Amount (ETB)"], body: rowsFor(vatRows), rightAlign: [1] },
      {
        title: "Top Products",
        head: ["Product", "Qty", "Revenue (ETB)"],
        body: data.topProducts.map((p) => [p.name, String(p.quantity), money(p.revenue)]),
        rightAlign: [1, 2],
      },
    ];
  };

  const handleExcel = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      [reportTitle],
      ["Period", title],
    ];
    for (const table of pdfTables()) {
      rows.push([], ...(table.title ? [[table.title]] : []), table.head, ...table.body);
    }
    downloadCsv(`${fileBase}.csv`, rows);
  };

  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdf = async () => {
    if (!data) return;
    setIsPdfLoading(true);
    try {
      await downloadPdf(`${fileBase}.pdf`, reportTitle, [`Period: ${title}`], pdfTables(), pdfShop);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  const netProfit = data?.profit.netProfit ?? 0;

  return (
    <section id="close-out-page" className="@container bg-[#F7F7F7] p-6">
      {/* @container: columns follow the page's own width, not the
          window's, so Edge and Chrome lay it out the same */}
      <ReportHeader
        title="Close-Out Report"
        subtitle="End of day, week, month and year totals, or any date range"
        onPdf={handlePdf}
        onExcel={handleExcel}
        disabled={!data}
        pdfLoading={isPdfLoading}
      />

      {/* ================= FILTER ================= */}

      <form onSubmit={handleSubmit} autoComplete="off" className={`${REPORT_CARD} mb-6`}>
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-text-two font-semibold text-[15px]">Choose Your Period</h5>
            {title && (
              <p className="text-[#646B72] text-14 mt-0.5">
                {activePeriod.label}: {title}
                {isOpen && <span className="ml-2 text-xs text-[#FE9F43]">· period still open</span>}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                title={p.label}
                onClick={() => apply(p.key, today)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  period === p.key
                    ? "bg-[#FE9F43] text-white"
                    : "border border-[#E6EAED] text-[#646B72] hover:border-[#FE9F43] hover:text-[#FE9F43]"
                }`}
              >
                {p.label}
              </button>
            ))}

            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="close-out-from" className="text-sm font-medium text-text-two">
                  From
                </label>
                <input
                  id="close-out-from"
                  type="date"
                  value={fromDate}
                  max={toDate || today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8.5 rounded-lg border border-[#E6EAED] bg-white px-2.5 text-sm text-text-two outline-0 focus:border-[#FE9F43]"
                />
                <label htmlFor="close-out-to" className="text-sm font-medium text-text-two">
                  To
                </label>
                <input
                  id="close-out-to"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  max={today}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8.5 rounded-lg border border-[#E6EAED] bg-white px-2.5 text-sm text-text-two outline-0 focus:border-[#FE9F43]"
                />
                <button
                  type="submit"
                  className="h-8.5 px-4 rounded-lg bg-[#FE9F43] text-white text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>

        {rangeError && (
          <p className="px-5 pb-3 text-right text-sm text-red-500">{rangeError}</p>
        )}

      </form>

      <ErrorBanner message={isError ? "Failed to load the close-out report." : ""} />

      {isFetching && !data && (
        <p className={`${REPORT_CARD} px-5 py-10 text-center text-[#646B72] mb-6`}>Loading report...</p>
      )}

      {data && (
        <>
          {/* ================= KPI CARDS ================= */}

          <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Net Sales"
              value={etb(data.netSales)}
              sub={`after ${etb(data.returns.total)} returns`}
              icon={FiShoppingBag}
              tone="bg-orange-50 text-[#FE9F43]"
            />
            <KpiCard
              label="Sales"
              value={data.sales.count.toLocaleString()}
              sub={`${data.sales.itemsSold.toLocaleString()} items · avg ${etb(data.sales.average)}`}
              icon={FiShoppingCart}
              tone="bg-blue-50 text-blue-500"
            />
            <KpiCard
              label="Money Received"
              value={etb(data.paymentsTotal)}
              sub="All payment methods"
              icon={FiDollarSign}
              tone="bg-green-50 text-green-600"
              valueTone="text-green-600"
            />
            <KpiCard
              label={netProfit >= 0 ? "Net Profit" : "Net Loss"}
              value={etb(netProfit)}
              sub="Revenue − costs − expenses"
              icon={netProfit >= 0 ? FiTrendingUp : FiTrendingDown}
              tone={netProfit >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}
              valueTone={netProfit >= 0 ? "text-green-600" : "text-red-500"}
            />
          </div>

          {/* ================= SALES / PAYMENTS / PROFIT ================= */}

          <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-6 mb-6 items-start">
            <ReportCard title="Sales Summary">
              <AmountTable
                head={["Item", "Amount (ETB)"]}
                rows={toTableRows(salesRows)}
                total={{ label: "Net sales", amount: money(data.netSales) }}
              />
            </ReportCard>

            <ReportCard title="Money Received by Method">
              <AmountTable
                head={["Method", "Amount (ETB)"]}
                rows={toTableRows(paymentRows)}
                total={{ label: "Total received", amount: money(data.paymentsTotal) }}
              />
              {data.returns.byMethod.length > 0 && (
                <AmountTable
                  head={["Refunds", "Amount (ETB)"]}
                  rows={data.returns.byMethod.map((r) => ({
                    key: r.method,
                    label: METHOD_LABELS[r.method] ?? r.method,
                    amount: money(r.amount),
                  }))}
                />
              )}
            </ReportCard>

            <ReportCard title="Profit" subtitle="Same numbers as Profit & Loss">
              <AmountTable
                head={["Item", "Amount (ETB)"]}
                rows={toTableRows(profitRows)}
                total={{ label: netProfit >= 0 ? "Net profit" : "Net loss", amount: money(netProfit) }}
              />
            </ReportCard>
          </div>

          {/* ================= EXPENSES / PURCHASES / VAT ================= */}

          <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-6 mb-6 items-start">
            <ReportCard title="Expenses" subtitle={`${data.expenses.count} recorded`}>
              <AmountTable
                head={["Category", "Amount (ETB)"]}
                rows={data.expenses.byCategory.map((e) => ({
                  key: e.category,
                  label: e.category,
                  amount: money(e.amount),
                }))}
                total={{ label: "Total expenses", amount: money(data.expenses.total) }}
                empty="No expenses."
              />
            </ReportCard>

            <ReportCard title="Purchases">
              <AmountTable head={["Item", "Amount (ETB)"]} rows={toTableRows(purchaseRows)} />
            </ReportCard>

            <ReportCard title="VAT">
              <AmountTable head={["Item", "Amount (ETB)"]} rows={toTableRows(vatRows)} />
            </ReportCard>
          </div>

          {/* ================= TOP PRODUCTS ================= */}

          <ReportCard title="Top Products">
            <AmountTable
              head={["Product", "Revenue (ETB)"]}
              rows={data.topProducts.map((p) => ({
                key: String(p.productId),
                label: `${p.name} × ${p.quantity.toLocaleString()}`,
                amount: money(p.revenue),
              }))}
              empty="No products sold."
            />
          </ReportCard>

          <p className="mt-4 text-right text-xs text-[#8A94A3]">
            Generated {new Date(data.generatedAt).toLocaleString("en-GB")}
          </p>
        </>
      )}
    </section>
  );
}
