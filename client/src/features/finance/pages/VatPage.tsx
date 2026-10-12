// client/src/features/finance/pages/VatPage.tsx
//
// Record of the VAT on your sales for a date range: VAT collected on
// sales and reversed on returns / cancellations, by month and line by
// line. Record-only: VAT is not paid from the app.

import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiPercent,
  FiRotateCcw,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";

import { useGetVatReportQuery } from "../../../api/api";
import {
  ErrorBanner,
  KpiCard,
  ReportCard,
  ReportHeader,
} from "../../reports/components/ReportParts";
import {
  REPORT_CARD,
  REPORT_INPUT,
  downloadCsv,
  downloadPdf,
  etb,
  formatDateTime,
  formatDay,
  money,
  toDateInput,
} from "../../reports/reportUtils";

// ============================================================
// DATE PRESETS (VAT is filed monthly, so months come first)
// ============================================================

function presetRange(key: string) {
  const now = new Date();
  const today = toDateInput(now);

  switch (key) {
    case "lastMonth":
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "quarter": {
      const start = Math.floor(now.getMonth() / 3) * 3;
      return { from: toDateInput(new Date(now.getFullYear(), start, 1)), to: today };
    }
    case "year":
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: today };
    default:
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
}

const PRESETS = [
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
];

// Line types shown on the page (VAT payments are not part of the record)
const TYPE_STYLE: Record<string, { label: string; tone: string }> = {
  Sale: { label: "Sale", tone: "bg-green-50 text-green-600" },
  "Sale Return": { label: "Return", tone: "bg-amber-50 text-amber-600" },
  "Sale Cancelled": { label: "Cancelled", tone: "bg-red-50 text-red-500" },
  Journal: { label: "Adjustment", tone: "bg-gray-100 text-gray-500" },
};

type Tab = "ALL" | "SALES" | "REVERSALS";

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SALES", label: "Sales" },
  { key: "REVERSALS", label: "Returns & Cancellations" },
];

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ============================================================
// PAGE
// ============================================================

export default function VatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDateInput(new Date());
  const defaultRange = presetRange("month");

  const appliedFrom = searchParams.get("from") || defaultRange.from;
  const appliedTo = searchParams.get("to") || defaultRange.to;

  const [from, setFrom] = useState(appliedFrom);
  const [to, setTo] = useState(appliedTo);
  const [formError, setFormError] = useState("");

  const activePreset = PRESETS.find((preset) => {
    const range = presetRange(preset.key);
    return range.from === appliedFrom && range.to === appliedTo;
  });

  const apply = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setFormError("");
    setCurrentPage(1);
    setSearchParams({ from: nextFrom, to: nextTo }, { replace: true });
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
    apply(from, to);
  };

  // --------------------------------------------------
  // Data
  // --------------------------------------------------

  const { data, isFetching, isError } = useGetVatReportQuery(
    { from: appliedFrom, to: appliedTo },
    { refetchOnMountOrArgChange: true },
  );

  const periodText =
    appliedFrom === appliedTo
      ? formatDay(appliedFrom)
      : `${formatDay(appliedFrom)} – ${formatDay(appliedTo)}`;

  const ratePct = data ? `${Math.round(data.rate * 100)}%` : "";

  // VAT on sales, returns and cancellations (payments left out)
  const lines = (data?.transactions ?? []).filter((t) => !t.vatPaymentId);

  const collected = data?.summary.outputVat ?? 0;
  const reversed = lines.filter((t) => t.vat < 0).reduce((sum, t) => sum - t.vat, 0);
  const netVat = collected - reversed;
  const taxableSales = data?.summary.taxableSales ?? 0;

  // Net VAT per month, newest first
  const byMonth = Object.entries(
    lines.reduce<Record<string, { taxable: number; vat: number }>>((acc, t) => {
      const key = toDateInput(new Date(t.date)).slice(0, 7);
      acc[key] ??= { taxable: 0, vat: 0 };
      acc[key].taxable += t.taxableAmount ?? 0;
      acc[key].vat += t.vat;
      return acc;
    }, {}),
  ).sort(([a], [b]) => b.localeCompare(a));

  // --------------------------------------------------
  // Lines table
  // --------------------------------------------------

  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const filtered = lines.filter((t) => {
    if (tab === "SALES" && t.source !== "Sale") return false;
    if (tab === "REVERSALS" && t.source !== "Sale Return" && t.source !== "Sale Cancelled") return false;

    const term = search.toLowerCase().trim();
    return (
      !term ||
      (t.reference ?? "").toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const pageRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // --------------------------------------------------
  // Downloads
  // --------------------------------------------------

  const fileBase = `vat-${appliedFrom}_${appliedTo}`;

  const summaryRows = [
    ["Taxable sales", money(taxableSales)],
    [`VAT collected (${ratePct})`, money(collected)],
    ["VAT reversed (returns & cancellations)", money(-reversed)],
    ["Net VAT", money(netVat)],
  ];

  const handleExcel = () => {
    if (!data) return;
    downloadCsv(`${fileBase}.csv`, [
      ["VAT Record"],
      ["Period", periodText],
      [],
      ...summaryRows,
      [],
      ["Month", "Taxable Amount", "Net VAT"],
      ...byMonth.map(([key, value]) => [monthLabel(key), value.taxable.toFixed(2), value.vat.toFixed(2)]),
      [],
      ["Date", "Reference", "Type", "Description", "Taxable Amount", "VAT"],
      ...lines.map((t) => [
        toDateInput(new Date(t.date)),
        t.reference ?? "",
        TYPE_STYLE[t.source]?.label ?? t.source,
        t.description,
        t.taxableAmount?.toFixed(2) ?? "",
        t.vat.toFixed(2),
      ]),
    ]);
  };

  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdf = async () => {
    if (!data) return;
    setIsPdfLoading(true);
    try {
      await downloadPdf(`${fileBase}.pdf`, "VAT Record", [`Period: ${periodText}`], [
        {
          head: ["Summary", "Amount (ETB)"],
          body: summaryRows,
          rightAlign: [1],
          boldRows: [summaryRows.length - 1],
        },
        {
          title: "VAT by Month",
          head: ["Month", "Taxable Amount", "Net VAT"],
          body: byMonth.map(([key, value]) => [monthLabel(key), money(value.taxable), money(value.vat)]),
          rightAlign: [1, 2],
        },
        {
          title: "VAT Lines",
          head: ["Date", "Reference", "Type", "Description", "Taxable", "VAT"],
          body: lines.map((t) => [
            formatDateTime(t.date),
            t.reference ?? "—",
            TYPE_STYLE[t.source]?.label ?? t.source,
            t.description,
            t.taxableAmount !== null ? money(t.taxableAmount) : "—",
            money(t.vat),
          ]),
          rightAlign: [4, 5],
        },
      ]);
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
    <section id="vat-page" className="bg-[#F7F7F7] p-6">
      <ReportHeader
        title="VAT"
        subtitle="Record of the VAT on your sales"
        onPdf={handlePdf}
        onExcel={handleExcel}
        disabled={!data}
        pdfLoading={isPdfLoading}
      />

      {/* ================= FILTERS ================= */}

      <form onSubmit={handleSubmit} autoComplete="off" className={`${REPORT_CARD} mb-6`}>
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
          </div>
        </div>
        <hr className="border-t border-[#E6EAED]" />

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vat-from" className="text-sm font-medium text-text-two">
              Start Date
            </label>
            <input
              id="vat-from"
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => setFrom(e.target.value)}
              className={REPORT_INPUT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vat-to" className="text-sm font-medium text-text-two">
              End Date
            </label>
            <input
              id="vat-to"
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className={REPORT_INPUT}
            />
          </div>
          <button
            type="submit"
            className="h-9.5 px-5 rounded-lg bg-[#FE9F43] text-white text-14 font-medium cursor-pointer transition-opacity hover:opacity-90"
          >
            Submit
          </button>
        </div>

        {formError && (
          <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {formError}
          </p>
        )}
      </form>

      <ErrorBanner message={isError ? "Failed to load VAT for this period." : ""} />

      {/* ================= KPI CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Taxable Sales"
          value={etb(taxableSales)}
          sub="Sales before VAT"
          icon={FiShoppingBag}
          tone="bg-orange-50 text-[#FE9F43]"
        />
        <KpiCard
          label="VAT Collected"
          value={etb(collected)}
          sub={ratePct ? `${ratePct} on sales` : periodText}
          icon={FiPercent}
          tone="bg-green-50 text-green-600"
          valueTone="text-green-600"
        />
        <KpiCard
          label="VAT Reversed"
          value={etb(reversed)}
          sub="Returns & cancellations"
          icon={FiRotateCcw}
          tone="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Net VAT"
          value={etb(netVat)}
          sub={periodText}
          icon={FiFileText}
          tone="bg-blue-50 text-blue-500"
        />
      </div>

      {/* ================= BY MONTH ================= */}

      <ReportCard title="VAT by Month" subtitle="Net VAT to declare for each month" className="mb-6">
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3 text-right">Taxable Amount (ETB)</th>
                <th className="px-6 py-3 text-right">Net VAT (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-[#646B72]">
                    {isFetching ? "Loading..." : "No VAT in this period."}
                  </td>
                </tr>
              ) : (
                byMonth.map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="px-6 py-3 text-text-two">{monthLabel(key)}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{money(value.taxable)}</td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums">{money(value.vat)}</td>
                  </tr>
                ))
              )}
              {byMonth.length > 1 && (
                <tr className="bg-gray-50 font-semibold text-text-two">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3 text-right tabular-nums">{money(taxableSales)}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{money(netVat)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ReportCard>

      {/* ================= LINES ================= */}

      <ReportCard
        title="VAT Lines"
        subtitle="Every sale, return and cancellation with VAT"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setTab(option.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  tab === option.key
                    ? "bg-[#FE9F43] text-white"
                    : "border border-[#E6EAED] text-[#646B72] hover:border-[#FE9F43] hover:text-[#FE9F43]"
                }`}
              >
                {option.label}
              </button>
            ))}
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
        }
      >
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Taxable Amount</th>
                <th className="px-6 py-4 text-right">VAT</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#646B72]">
                    {isFetching ? "Loading..." : "No VAT lines in this period."}
                  </td>
                </tr>
              ) : (
                pageRows.map((t) => {
                  const style = TYPE_STYLE[t.source] ?? { label: t.source, tone: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={t.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(t.date)}</td>
                      <td className="px-6 py-4 font-medium text-text-two">{t.reference ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style.tone}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">{t.description}</td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {t.taxableAmount !== null ? money(t.taxableAmount) : "—"}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-medium tabular-nums ${
                          t.vat < 0 ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        {money(t.vat)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]">
          <span className="text-sm text-[#646B72]">
            {filtered.length} line{filtered.length === 1 ? "" : "s"}
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
      </ReportCard>
    </section>
  );
}
