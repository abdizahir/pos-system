// Building blocks shared by the report pages, in the system design:
// page header with PDF / Excel buttons, KPI cards and titled cards.

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaRegFileExcel, FaRegFilePdf } from "react-icons/fa";

import { REPORT_CARD } from "../reportUtils";

export function ReportHeader({
  title,
  subtitle,
  onPdf,
  onExcel,
  disabled,
  pdfLoading,
}: {
  title: string;
  subtitle: string;
  onPdf: () => void;
  onExcel: () => void;
  disabled?: boolean;
  pdfLoading?: boolean;
}) {
  return (
    <article id="prod-header" className="flex items-center justify-between mb-6">
      <div>
        <h4 className="text-text-two font-bold text-[18px] mb-0.5">{title}</h4>
        <p className="text-[#646B72] text-14">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Download PDF"
          aria-label="Download PDF"
          onClick={onPdf}
          disabled={disabled || pdfLoading}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#E53E3E] transition-colors hover:border-[#E53E3E] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FaRegFilePdf size={18} />
        </button>
        <button
          type="button"
          title="Download Excel"
          aria-label="Download Excel"
          onClick={onExcel}
          disabled={disabled}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#1D7044] transition-colors hover:border-[#1D7044] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FaRegFileExcel size={18} />
        </button>
      </div>
    </article>
  );
}

export function KpiCard({
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
    <div className={`${REPORT_CARD} p-5`}>
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

// White card with a title row, a divider and its content
export function ReportCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`${REPORT_CARD} ${className}`}>
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="text-text-two font-bold text-[16px]">{title}</h5>
          {subtitle && <p className="text-[#646B72] text-14 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </article>
  );
}

// Simple label / amount table used inside report cards
export function AmountTable({
  head,
  rows,
  total,
  empty = "Nothing in this period.",
}: {
  head: [string, string];
  rows: { key: string; label: ReactNode; amount: string; tone?: string }[];
  total?: { label: string; amount: string };
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto border-t border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
            <th className="px-6 py-3">{head[0]}</th>
            <th className="px-6 py-3 text-right">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-6 py-6 text-center text-[#646B72]">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="px-6 py-3 text-[#475569]">{row.label}</td>
                <td className={`px-6 py-3 text-right tabular-nums ${row.tone ?? "text-text-two"}`}>
                  {row.amount}
                </td>
              </tr>
            ))
          )}
          {total && (
            <tr className="bg-gray-50 font-semibold text-text-two">
              <td className="px-6 py-3">{total.label}</td>
              <td className="px-6 py-3 text-right tabular-nums">{total.amount}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
