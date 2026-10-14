// client/src/features/reports/pages/ProfitLossPage.tsx
//
// Profit & Loss for a date range, in the same style as the other
// system pages: header with PDF / Excel downloads, a date filter card,
// KPI cards, the P&L statement and product profit.

import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { IconType } from "react-icons";
import { FaRegFileExcel, FaRegFilePdf } from "react-icons/fa";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiTrendingDown,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";

import {
  useGetProfitInsightsQuery,
  useGetProfitLossQuery,
} from "../../../api/api";
import { shopDetailsLine, useShop } from "../../shop/useShop";
import { writePdfShopHeader, csvCell } from "../reportUtils";

// ============================================================
// HELPERS
// ============================================================

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number) {
  const formatted = Math.abs(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "−" : ""}${formatted}`;
}

function etb(value: number) {
  return `ETB ${money(value)}`;
}

function percent(part: number, whole: number) {
  return whole ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}


// Quick ranges for the date filter
function presetRange(key: string) {
  const now = new Date();
  const today = toDateInput(now);

  switch (key) {
    case "week": {
      // Monday to today
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: toDateInput(start), to: today };
    }
    case "month":
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "year":
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: today };
    default:
      return { from: today, to: today };
  }
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

const DATE_INPUT =
  "h-8.5 rounded-lg border border-[#E6EAED] bg-white px-2.5 text-sm text-text-two outline-0 focus:border-[#FE9F43]";

const CARD = "shadow bg-white rounded-lg border border-[#E6EAED]";

// ============================================================
// PIECES
// ============================================================

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  valueTone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconType;
  tone: string;
  valueTone?: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[#646B72]">{label}</p>
        <span className={`rounded-lg p-2 ${tone}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className={`mt-2 text-[20px] font-bold tabular-nums ${valueTone ?? "text-text-two"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#8A94A3]">{sub}</p>}
    </div>
  );
}

function StatementRow({
  label,
  amount,
  indent = false,
  bold = false,
  tone,
}: {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
  tone?: string;
}) {
  return (
    <tr className={`border-b border-gray-100 ${bold ? "bg-gray-50" : ""}`}>
      <td className={`py-3 ${indent ? "pl-10 pr-6" : "px-6"} ${bold ? "font-semibold text-text-two" : "text-[#475569]"}`}>
        {label}
      </td>
      <td className={`px-6 py-3 text-right tabular-nums ${bold ? "font-semibold" : ""} ${tone ?? "text-text-two"}`}>
        {money(amount)}
      </td>
    </tr>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={2} className="px-6 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-[#8A94A3]">
        {title}
      </td>
    </tr>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function ProfitLossPage() {
  const { shop, name: shopName } = useShop();
  const pdfShop = { name: shopName, details: shopDetailsLine(shop) };
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDateInput(new Date());
  const defaultRange = presetRange("today");

  const appliedFrom = searchParams.get("from") || defaultRange.from;
  const appliedTo = searchParams.get("to") || defaultRange.to;

  const [from, setFrom] = useState(appliedFrom);
  const [to, setTo] = useState(appliedTo);
  const [formError, setFormError] = useState("");

  const matchingPreset = PRESETS.find((preset) => {
    const range = presetRange(preset.key);
    return range.from === appliedFrom && range.to === appliedTo;
  });

  // Custom shows the From / To dates; it is also on for any range
  // that isn't one of the quick buttons
  const isCustom = searchParams.get("custom") === "1" || !matchingPreset;
  const activePreset = isCustom ? undefined : matchingPreset;

  const apply = (nextFrom: string, nextTo: string, custom = false) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setFormError("");
    setSearchParams(
      custom
        ? { from: nextFrom, to: nextTo, custom: "1" }
        : { from: nextFrom, to: nextTo },
      { replace: true },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!from || !to) {
      setFormError("Choose a start and end date.");
      return;
    }
    if (from > to) {
      setFormError("Start date must be before end date.");
      return;
    }
    apply(from, to, true);
  };

  // --------------------------------------------------
  // Data
  // --------------------------------------------------

  const range = { from: appliedFrom, to: appliedTo };

  const {
    data: pl,
    isFetching: isPlLoading,
    isError: isPlError,
  } = useGetProfitLossQuery(range, { refetchOnMountOrArgChange: true });

  const { data: insights } = useGetProfitInsightsQuery(range, {
    refetchOnMountOrArgChange: true,
  });

  const revenue = pl?.revenue.total ?? 0;
  const cogs = pl?.costOfSales.total ?? 0;
  const grossProfit = pl?.grossProfit ?? 0;
  const expenses = pl?.operatingExpenses.total ?? 0;
  const netProfit = pl?.netProfit ?? 0;
  const isProfit = netProfit >= 0;

  const periodText =
    appliedFrom === appliedTo
      ? formatDay(appliedFrom)
      : `${formatDay(appliedFrom)} – ${formatDay(appliedTo)}`;

  // --------------------------------------------------
  // Product profit table
  // --------------------------------------------------

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const products = (insights?.products ?? []).filter((product) => {
    const term = search.toLowerCase().trim();
    return (
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(products.length / rowsPerPage);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const pageProducts = products.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // --------------------------------------------------
  // Downloads
  // --------------------------------------------------

  const statementRows = (): [string, string][] => {
    if (!pl) return [];
    return [
      ["Revenue", ""],
      ...pl.revenue.accounts.map((a): [string, string] => [`   ${a.name}`, money(a.amount)]),
      ["Total Revenue", money(revenue)],
      ["Cost of Sales", ""],
      ...pl.costOfSales.accounts.map((a): [string, string] => [`   ${a.name}`, money(a.amount)]),
      ["Total Cost of Sales", money(cogs)],
      ["Gross Profit", money(grossProfit)],
      ["Operating Expenses", ""],
      ...pl.operatingExpenses.accounts.map((a): [string, string] => [`   ${a.name}`, money(a.amount)]),
      ["Total Operating Expenses", money(expenses)],
      [isProfit ? "Net Profit" : "Net Loss", money(netProfit)],
    ];
  };

  const handleExcel = () => {
    if (!pl) return;

    const rows: (string | number)[][] = [
      ["Profit & Loss Statement"],
      ["Period", periodText],
      [],
      ["Account", "Amount (ETB)"],
      ...statementRows(),
      [],
      ["Product", "SKU", "Category", "Qty Sold", "Revenue", "Cost", "Profit", "Margin"],
      ...(insights?.products ?? []).map((p) => [
        p.name,
        p.sku,
        p.category,
        p.quantity,
        p.revenue.toFixed(2),
        p.cost.toFixed(2),
        p.profit.toFixed(2),
        `${(p.margin * 100).toFixed(1)}%`,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profit-loss-${appliedFrom}_${appliedTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdf = async () => {
    if (!pl) return;

    setIsPdfLoading(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;

      const top = writePdfShopHeader(doc, pdfShop, marginX);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Profit & Loss Statement", marginX, top);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${periodText}`, marginX, top + 18);
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, marginX, top + 32);
      doc.setTextColor(0);

      const totals = new Set([
        "Total Revenue",
        "Total Cost of Sales",
        "Gross Profit",
        "Total Operating Expenses",
        "Net Profit",
        "Net Loss",
      ]);
      const headings = new Set(["Revenue", "Cost of Sales", "Operating Expenses"]);

      autoTable(doc, {
        startY: top + 50,
        margin: { left: marginX, right: marginX },
        head: [["Account", "Amount (ETB)"]],
        body: statementRows(),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [254, 159, 67], textColor: 255 },
        columnStyles: { 1: { halign: "right" } },
        didParseCell: (cell) => {
          if (cell.section !== "body") {
            if (cell.column.index === 1) cell.cell.styles.halign = "right";
            return;
          }
          const label = String((cell.row.raw as string[])[0]);
          if (totals.has(label)) {
            cell.cell.styles.fontStyle = "bold";
            cell.cell.styles.fillColor = [243, 244, 246];
          }
          if (headings.has(label)) {
            cell.cell.styles.fontStyle = "bold";
            cell.cell.styles.textColor = [100, 107, 114];
          }
        },
      });

      const productRows = insights?.products ?? [];
      if (productRows.length > 0) {
        autoTable(doc, {
          margin: { left: marginX, right: marginX },
          head: [["Product", "Qty", "Revenue", "Cost", "Profit", "Margin"]],
          body: productRows.map((p) => [
            p.name,
            String(p.quantity),
            money(p.revenue),
            money(p.cost),
            money(p.profit),
            `${(p.margin * 100).toFixed(1)}%`,
          ]),
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [254, 159, 67], textColor: 255 },
          columnStyles: {
            1: { halign: "center" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
          },
        });
      }

      doc.save(`profit-loss-${appliedFrom}_${appliedTo}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      setFormError("Couldn't create the PDF. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <section id="profit-loss-page" className="bg-[#F7F7F7] p-6">
      {/* ================= HEADER ================= */}

      <article id="prod-header" className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">Profit &amp; Loss</h4>
          <p className="text-[#646B72] text-14">View your profit and loss</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Download PDF"
            aria-label="Download PDF"
            onClick={handlePdf}
            disabled={!pl || isPdfLoading}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#E53E3E] transition-colors hover:border-[#E53E3E] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaRegFilePdf size={18} />
          </button>
          <button
            type="button"
            title="Download Excel"
            aria-label="Download Excel"
            onClick={handleExcel}
            disabled={!pl}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#1D7044] transition-colors hover:border-[#1D7044] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaRegFileExcel size={18} />
          </button>
        </div>
      </article>

      {/* ================= FILTERS ================= */}

      <form onSubmit={handleSubmit} autoComplete="off" className={`${CARD} mb-6`}>
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <h5 className="text-text-two font-semibold text-[15px]">Choose Your Date</h5>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  const next = presetRange(preset.key);
                  apply(next.from, next.to);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  activePreset?.key === preset.key
                    ? "bg-[#FE9F43] text-white"
                    : "border border-[#E6EAED] text-[#646B72] hover:border-[#FE9F43] hover:text-[#FE9F43]"
                }`}
              >
                {preset.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => apply(appliedFrom, appliedTo, true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                isCustom
                  ? "bg-[#FE9F43] text-white"
                  : "border border-[#E6EAED] text-[#646B72] hover:border-[#FE9F43] hover:text-[#FE9F43]"
              }`}
            >
              Custom
            </button>

            {isCustom && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="pl-from" className="text-sm font-medium text-text-two">
                  From
                </label>
                <input
                  id="pl-from"
                  type="date"
                  value={from}
                  max={to || today}
                  onChange={(e) => setFrom(e.target.value)}
                  className={DATE_INPUT}
                />
                <label htmlFor="pl-to" className="text-sm font-medium text-text-two">
                  To
                </label>
                <input
                  id="pl-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                  className={DATE_INPUT}
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

        {formError && (
          <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {formError}
          </p>
        )}
      </form>

      {isPlError && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Failed to load the profit and loss for this period.
        </p>
      )}

      {/* ================= KPI CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
        <KpiCard
          label="Revenue"
          value={etb(revenue)}
          sub={insights ? `${insights.orders.count} sales · ${insights.orders.itemsSold} items` : periodText}
          icon={FiShoppingBag}
          tone="bg-orange-50 text-[#FE9F43]"
        />
        <KpiCard
          label="Purchases"
          value={etb(insights?.purchases.total ?? 0)}
          sub={
            insights
              ? `${insights.purchases.count} purchase${insights.purchases.count === 1 ? "" : "s"} from suppliers`
              : periodText
          }
          icon={FiTruck}
          tone="bg-violet-50 text-violet-500"
        />
        <KpiCard
          label="Cost of Goods Sold"
          value={etb(cogs)}
          sub={`${percent(cogs, revenue)} of revenue`}
          icon={FiPackage}
          tone="bg-slate-100 text-slate-500"
        />
        <KpiCard
          label="Gross Profit"
          value={etb(grossProfit)}
          sub={`${percent(grossProfit, revenue)} margin`}
          icon={FiTrendingUp}
          tone="bg-blue-50 text-blue-500"
        />
        <KpiCard
          label="Expenses"
          value={etb(expenses)}
          sub={`${percent(expenses, revenue)} of revenue`}
          icon={FiDollarSign}
          tone="bg-rose-50 text-rose-500"
        />
        <KpiCard
          label={isProfit ? "Net Profit" : "Net Loss"}
          value={etb(netProfit)}
          sub={`${percent(netProfit, revenue)} net margin`}
          icon={isProfit ? FiTrendingUp : FiTrendingDown}
          tone={isProfit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}
          valueTone={isProfit ? "text-green-600" : "text-red-500"}
        />
      </div>

      {/* ================= STATEMENT ================= */}

      <article className={`${CARD} mb-6`}>
          <div className="px-5 py-4">
            <h5 className="text-text-two font-bold text-[16px]">Profit &amp; Loss Statement</h5>
            <p className="text-[#646B72] text-14 mt-0.5">{periodText}</p>
          </div>

          <div className="overflow-x-auto border-t border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {isPlLoading && !pl ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-[#646B72]">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  pl && (
                    <>
                      <SectionTitle title="Revenue" />
                      {pl.revenue.accounts.map((a) => (
                        <StatementRow key={a.id} label={a.name} amount={a.amount} indent />
                      ))}
                      <StatementRow label="Total Revenue" amount={revenue} bold />

                      <SectionTitle title="Cost of Sales" />
                      {pl.costOfSales.accounts.map((a) => (
                        <StatementRow key={a.id} label={a.name} amount={a.amount} indent />
                      ))}
                      <StatementRow label="Total Cost of Sales" amount={cogs} bold />

                      <StatementRow
                        label="Gross Profit"
                        amount={grossProfit}
                        bold
                        tone={grossProfit < 0 ? "text-red-500" : "text-blue-600"}
                      />

                      <SectionTitle title="Operating Expenses" />
                      {pl.operatingExpenses.accounts.map((a) => (
                        <StatementRow key={a.id} label={a.name} amount={a.amount} indent />
                      ))}
                      <StatementRow label="Total Operating Expenses" amount={expenses} bold />

                      <tr className={isProfit ? "bg-green-50" : "bg-red-50"}>
                        <td className="px-6 py-4 font-bold text-text-two">
                          {isProfit ? "Net Profit" : "Net Loss"}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-bold tabular-nums ${
                            isProfit ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {money(netProfit)}
                        </td>
                      </tr>
                    </>
                  )
                )}
              </tbody>
            </table>
          </div>
        </article>

      {/* ================= PRODUCT PROFIT ================= */}

      <article className={CARD}>
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-text-two font-bold text-[16px]">Product Profit</h5>
            <p className="text-[#646B72] text-14 mt-0.5">What each product earned in this period</p>
          </div>

          <div className="search-input relative">
            <FiSearch size={14} color="#A6AAAF" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-text-two text-14 outline-none focus:border-[#FE9F43]"
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Qty Sold</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Profit</th>
                <th className="px-6 py-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#646B72]">
                    No products sold in this period.
                  </td>
                </tr>
              ) : (
                pageProducts.map((product) => (
                  <tr key={product.productId} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-two">{product.name}</p>
                      <p className="text-xs text-[#8A94A3]">{product.sku}</p>
                    </td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4 text-center">{product.quantity}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{money(product.revenue)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{money(product.cost)}</td>
                    <td
                      className={`px-6 py-4 text-right font-medium tabular-nums ${
                        product.profit < 0 ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {money(product.profit)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.margin < 0
                            ? "bg-red-50 text-red-500"
                            : product.margin < 0.15
                              ? "bg-amber-50 text-amber-600"
                              : "bg-green-50 text-green-600"
                        }`}
                      >
                        {(product.margin * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]">
          <span className="text-sm text-[#646B72]">
            {products.length} product{products.length === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1 || totalPages === 0}
              onClick={() => setCurrentPage(safePage - 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                    safePage === page
                      ? "bg-[#FE9F43] border border-[#FE9F43] text-white"
                      : "bg-[rgba(145,158,171,0.3)] text-[#5B6670] hover:bg-[#FE9F43] hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safePage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(safePage + 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
