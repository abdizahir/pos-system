// client/src/features/manager/pages/StaffPage.tsx
//
// Manager: how each staff member is selling.

import { useMemo, useState } from "react";
import {
  FiAward,
  FiPackage,
  FiRotateCcw,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";

import { useGetStaffPerformanceQuery } from "../../../api/api";
import { ROLE_LABELS } from "../../auth/roles";

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function etb(value: number, decimals = 0) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

const PRESETS = [
  { key: "today", label: "Today", from: () => new Date() },
  {
    key: "7d",
    label: "7D",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d;
    },
  },
  { key: "month", label: "Month", from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  { key: "year", label: "Year", from: () => new Date(new Date().getFullYear(), 0, 1) },
];

const MEDALS = ["bg-amber-400", "bg-slate-400", "bg-orange-700"];

export default function StaffPage() {
  const [presetKey, setPresetKey] = useState("month");
  const preset = PRESETS.find((p) => p.key === presetKey)!;
  const range = useMemo(
    () => ({ from: toDateInput(preset.from()), to: toDateInput(new Date()) }),
    [preset],
  );

  const { data, isFetching, isError, refetch } = useGetStaffPerformanceQuery(range, {
    refetchOnMountOrArgChange: true,
  });

  const loading = isFetching && !data;
  const totals = data?.totals;
  const staff = data?.staff ?? [];
  const topNet = Math.max(...staff.map((s) => s.netSales), 1);

  return (
    <section className="min-h-full bg-[#F6F7FB] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#FE9F43]">Manager</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Staff</h1>
            <p className="text-sm text-[#64748B]">How each person is selling</p>
          </div>

          <div className="flex rounded-2xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPresetKey(p.key)}
                className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                  presetKey === p.key ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {isError && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Couldn't load staff performance.
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">Retry</button>
          </div>
        )}

        {/* Totals */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Net sales", value: etb(totals?.netSales ?? 0), icon: FiTrendingUp, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Transactions", value: (totals?.salesCount ?? 0).toLocaleString("en-US"), icon: FiShoppingBag, tone: "bg-blue-50 text-blue-600" },
            { label: "Items sold", value: (totals?.itemsSold ?? 0).toLocaleString("en-US"), icon: FiPackage, tone: "bg-violet-50 text-violet-600" },
            { label: "Refunded", value: etb(totals?.refunded ?? 0), icon: FiRotateCcw, tone: "bg-rose-50 text-rose-500" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-4 rounded-3xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${card.tone}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
                  {loading ? (
                    <span className="mt-1 block h-6 w-24 animate-pulse rounded bg-[#EEF2F6]" />
                  ) : (
                    <p className="text-lg font-bold tabular-nums text-[#0F172A]">{card.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <section className="rounded-3xl border border-[#EEF0F3] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <header className="mb-4 flex items-center gap-2">
            <FiAward className="text-[#FE9F43]" />
            <h2 className="font-semibold text-[#0F172A]">Leaderboard</h2>
            <span className="text-xs text-[#94A3B8]">by net sales (after refunds)</span>
          </header>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="block h-20 animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#94A3B8]">No staff yet.</p>
          ) : (
            <ul className="space-y-2">
              {staff.map((person, index) => (
                <li
                  key={person.userId}
                  className={`rounded-2xl p-4 ring-1 ring-[#F1F5F9] transition hover:bg-[#FAFBFC] ${person.isActive ? "" : "opacity-60"}`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                        person.salesCount > 0 && index < 3 ? `${MEDALS[index]} text-white` : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-semibold text-[#0F172A]">
                        {person.email}
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                          {ROLE_LABELS[person.role]}
                        </span>
                        {!person.isActive && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Inactive</span>
                        )}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {person.lastSaleAt
                          ? `Last sale ${new Date(person.lastSaleAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                          : "No sales in this period"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-[#0F172A]">{etb(person.netSales)}</p>
                      <p className="text-xs text-[#94A3B8]">{(person.share * 100).toFixed(0)}% of sales</p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full rounded-full bg-[#FE9F43]" style={{ width: `${(Math.max(person.netSales, 0) / topNet) * 100}%` }} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
                    {[
                      ["Transactions", person.salesCount.toLocaleString("en-US")],
                      ["Average sale", etb(person.averageSale)],
                      ["Items sold", person.itemsSold.toLocaleString("en-US")],
                      ["Refunded", `${etb(person.refunded)} · ${person.returnsCount}`],
                      ["Credit given", etb(person.creditGiven)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[#94A3B8]">{label}</p>
                        <p className="font-semibold tabular-nums text-[#0F172A]">{value}</p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
