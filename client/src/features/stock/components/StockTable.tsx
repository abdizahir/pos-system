// Manage Stock: KPI cards and the Product Inventory table, with
// stock-level bars, status tabs, search, category filter, export and
// an actions menu per product.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiDownload,
  FiLayers,
  FiMoreHorizontal,
  FiSearch,
  FiShoppingBag,
  FiSliders,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import { useGetProductsQuery } from "../../../api/api";
import DialogModal from "../../../components/DialogModal";
import AdjustStockModal, { type AdjustTarget } from "./AdjustStockModal";
import { csvCell } from "../../reports/reportUtils";

// ============================================================
// TYPES + HELPERS
// ============================================================

type StockBatch = {
  id: number;
  quantity: number;
  purchasePrice: number | string;
  expiryDate: string | null;
  createdAt: string;
};

type Status = "IN" | "LOW" | "OUT";
type Tab = "ALL" | Status;

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All Products" },
  { key: "IN", label: "In Stock" },
  { key: "LOW", label: "Low Stock" },
  { key: "OUT", label: "Out of Stock" },
];

const STATUS: Record<Status, { label: string; pill: string; bar: string }> = {
  IN: { label: "In Stock", pill: "bg-green-50 text-green-600 border-green-200", bar: "bg-green-500" },
  LOW: { label: "Low Stock", pill: "bg-amber-50 text-amber-600 border-amber-200", bar: "bg-amber-400" },
  OUT: { label: "Out of Stock", pill: "bg-red-50 text-red-500 border-red-200", bar: "bg-red-400" },
};

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function isExpired(batch: StockBatch, today: number) {
  if (!batch.expiryDate) return false;
  const expiry = new Date(batch.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return expiry.getTime() < today;
}


// ============================================================
// PIECES
// ============================================================

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: IconType;
  tone: string;
}) {
  return (
    <div className="shadow bg-white rounded-lg border border-[#E6EAED] p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-[#646B72]">{label}</p>
        <p className="mt-1.5 text-[22px] font-bold tabular-nums text-text-two truncate">{value}</p>
        <p className="mt-0.5 text-xs text-[#8A94A3]">{sub}</p>
      </div>
      <span className={`shrink-0 grid h-11 w-11 place-items-center rounded-full ${tone}`}>
        <Icon size={19} />
      </span>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function StockTable() {
  const navigate = useNavigate();
  const { data: products = [], isLoading, isError } = useGetProductsQuery();

  const [tab, setTab] = useState<Tab>("ALL");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Actions menu (drawn on top of the page) and batches modal
  const [menu, setMenu] = useState<{ productId: number; top: number; right: number } | null>(null);
  const [batchesFor, setBatchesFor] = useState<number | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [notice, setNotice] = useState("");

  // Taken once so the render stays pure
  const [today] = useState(startOfToday);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  // --------------------------------------------------
  // Per-product stock figures
  // --------------------------------------------------

  const rows = products.map((product) => {
    const batches: StockBatch[] = product.stockBatches ?? [];
    const live = batches.filter((batch) => batch.quantity > 0 && !isExpired(batch, today));

    const quantity = live.reduce((sum, batch) => sum + batch.quantity, 0);
    const expiredUnits = batches
      .filter((batch) => batch.quantity > 0 && isExpired(batch, today))
      .reduce((sum, batch) => sum + batch.quantity, 0);
    const value = live.reduce((sum, batch) => sum + batch.quantity * Number(batch.purchasePrice), 0);

    const latest = [...batches].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    const nextExpiry = live
      .filter((batch) => batch.expiryDate)
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0];

    const min = product.lowStockLimit ?? 0;
    const status: Status = quantity <= 0 ? "OUT" : quantity <= min ? "LOW" : "IN";

    // Bar is full at twice the minimum (or when there is no minimum)
    const fill = quantity <= 0 ? 0 : min > 0 ? Math.min(quantity / (min * 2), 1) : 1;

    return {
      product,
      batches,
      quantity,
      expiredUnits,
      value,
      min,
      status,
      fill,
      purchasePrice: latest ? Number(latest.purchasePrice) : null,
      nextExpiry: nextExpiry?.expiryDate ?? null,
    };
  });

  const counts = {
    ALL: rows.length,
    IN: rows.filter((row) => row.status === "IN").length,
    LOW: rows.filter((row) => row.status === "LOW").length,
    OUT: rows.filter((row) => row.status === "OUT").length,
  };
  const totalUnits = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);

  const categories = [...new Set(products.map((product) => product.category?.name).filter(Boolean))].sort();

  // --------------------------------------------------
  // Filters + pagination
  // --------------------------------------------------

  const term = search.toLowerCase().trim();

  const filtered = rows.filter(({ product, status }) => {
    if (tab !== "ALL" && status !== tab) return false;
    if (category !== "ALL" && product.category?.name !== category) return false;
    if (!term) return true;
    return (
      product.productName.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      (product.barcode ?? "").toLowerCase().includes(term)
    );
  });

  const rowsPerPage = 10;
  const totalPages = Math.max(Math.ceil(filtered.length / rowsPerPage), 1);
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // --------------------------------------------------
  // Export (CSV that opens in Excel)
  // --------------------------------------------------

  const handleExport = () => {
    const lines = [
      ["Product", "SKU", "Category", "Unit", "In Stock", "Min. Stock", "Expired Units", "Purchase Price", "Selling Price", "Stock Value", "Next Expiry", "Status"],
      ...filtered.map((row) => [
        row.product.productName,
        row.product.sku,
        row.product.category?.name ?? "",
        row.product.unit?.name ?? "",
        row.quantity,
        row.min,
        row.expiredUnits,
        row.purchasePrice !== null ? row.purchasePrice.toFixed(2) : "",
        Number(row.product.sellingPrice).toFixed(2),
        row.value.toFixed(2),
        row.nextExpiry ? row.nextExpiry.slice(0, 10) : "",
        STATUS[row.status].label,
      ]),
    ];
    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // Loading / error
  // --------------------------------------------------

  if (isLoading || isError) {
    return (
      <article className="shadow bg-white rounded-lg border border-[#E6EAED] p-6">
        <p className={`text-center ${isError ? "text-red-500" : "text-[#646B72]"}`}>
          {isError ? "Failed to load stock." : "Loading stock..."}
        </p>
      </article>
    );
  }

  const menuRow = menu ? rows.find((row) => row.product.id === menu.productId) : undefined;
  const batchesRow = batchesFor !== null ? rows.find((row) => row.product.id === batchesFor) : undefined;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      {/* ================= KPI CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Products"
          value={counts.ALL.toLocaleString()}
          sub={`${totalUnits.toLocaleString()} units in stock`}
          icon={FiBox}
          tone="bg-blue-50 text-blue-500"
        />
        <KpiCard
          label="Low Stock"
          value={counts.LOW.toLocaleString()}
          sub="At or below the minimum"
          icon={FiAlertTriangle}
          tone="bg-amber-50 text-amber-500"
        />
        <KpiCard
          label="Out of Stock"
          value={counts.OUT.toLocaleString()}
          sub="Nothing left to sell"
          icon={FiXCircle}
          tone="bg-red-50 text-red-500"
        />
        <KpiCard
          label="Stock Value"
          value={`ETB ${money(totalValue)}`}
          sub="At purchase cost"
          icon={FiDollarSign}
          tone="bg-orange-50 text-[#FE9F43]"
        />
      </div>

      {/* ================= PRODUCT INVENTORY ================= */}

      <article className="shadow bg-white rounded-lg border border-[#E6EAED]">
        <div className="px-5 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
          <h5 className="text-text-two font-bold text-[16px]">Product Inventory</h5>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-1.75 rounded-md bg-[#FE9F43] text-white text-sm cursor-pointer hover:bg-[#e88d2f] transition-colors"
          >
            <FiDownload size={15} />
            Export
          </button>
        </div>

        {notice && (
          <p className="mx-5 mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
            {notice}
          </p>
        )}

        {/* Tabs + search + category */}
        <div className="px-5 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setTab(option.key);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                  tab === option.key
                    ? "bg-[#FFF4EA] text-[#E07A12] font-semibold"
                    : "text-[#646B72] hover:text-[#FE9F43]"
                }`}
              >
                {option.label}
                <span className="ml-1.5 text-xs opacity-70">{counts[option.key]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch size={14} color="#A6AAAF" className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-56 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] bg-[#F9FAFB] text-text-two text-sm outline-none focus:border-[#FE9F43] focus:bg-white"
                type="search"
                placeholder="Search name, SKU, barcode"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 rounded-lg border border-[#E6EAED] bg-white text-sm text-text-two outline-none focus:border-[#FE9F43] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 min-w-52">Stock Level</th>
                <th className="px-6 py-4 text-right">Purchase Price</th>
                <th className="px-6 py-4 text-right">Selling Price</th>
                <th className="px-6 py-4">Next Expiry</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-[#646B72]">
                    No products found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const style = STATUS[row.status];
                  return (
                    <tr key={row.product.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[#FCFCFD]">
                      {/* Product */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF4EA] text-sm font-bold text-[#E07A12]">
                            {row.product.productName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-text-two truncate">{row.product.productName}</p>
                            <p className="text-xs text-[#8A94A3]">{row.product.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-3.5 text-[#475569]">{row.product.category?.name ?? "—"}</td>

                      {/* Stock level */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-text-two text-sm">
                            {row.quantity} {row.product.unit?.name ?? "units"}
                          </span>
                          <span className="text-[#8A94A3]">Min: {row.min}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EEF1F4] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${Math.round(row.fill * 100)}%` }}
                          />
                        </div>
                        {row.expiredUnits > 0 && (
                          <p className="mt-1 text-xs text-red-500">+{row.expiredUnits} expired</p>
                        )}
                      </td>

                      {/* Prices */}
                      <td className="px-6 py-3.5 text-right tabular-nums">
                        {row.purchasePrice !== null ? `ETB ${money(row.purchasePrice)}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums font-medium text-text-two">
                        ETB {money(Number(row.product.sellingPrice))}
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-[#475569]">{formatDate(row.nextExpiry)}</td>

                      {/* Status */}
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${style.pill}`}>
                          {style.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-center">
                        <button
                          type="button"
                          aria-label="Actions"
                          aria-haspopup="menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menu?.productId === row.product.id) {
                              setMenu(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 3 * 36 + 8;
                            const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight;
                            setMenu({
                              productId: row.product.id,
                              top: fitsBelow ? rect.bottom + 6 : rect.top - 6 - menuHeight,
                              right: window.innerWidth - rect.right,
                            });
                          }}
                          className={`inline-flex p-1.5 rounded-md cursor-pointer transition-colors ${
                            menu?.productId === row.product.id
                              ? "bg-[#FFF4EA] text-[#FE9F43]"
                              : "text-[#646B72] hover:bg-gray-100 hover:text-[#FE9F43]"
                          }`}
                        >
                          <FiMoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          id="pagination"
          className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]"
        >
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-sm text-[#646B72]">
            <span>Rows Per Page:</span>
            <select
              disabled
              className="border border-[#E6EAED] rounded-lg pt-1 pb-1 text-12 outline-none cursor-pointer focus:border-[#FE9F43]"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span>Entries</span>
          </div>

          {/* Pages */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
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
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>

      {/* ================= ACTIONS MENU ================= */}

      {menu &&
        menuRow &&
        createPortal(
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: menu.top, right: menu.right }}
            className="fixed z-50 w-48 overflow-hidden rounded-lg border border-[#E6EAED] bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setBatchesFor(menuRow.product.id);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-two cursor-pointer hover:bg-[#FFF4EA] hover:text-[#FE9F43]"
            >
              <FiLayers size={15} />
              View Batches
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setNotice("");
                setAdjustTarget({
                  productId: menuRow.product.id,
                  productName: menuRow.product.productName,
                  unitName: menuRow.product.unit?.name ?? "units",
                  systemQuantity: menuRow.quantity,
                  unitCost: menuRow.purchasePrice,
                });
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-two cursor-pointer hover:bg-[#FFF4EA] hover:text-[#FE9F43]"
            >
              <FiSliders size={15} />
              Adjust Stock
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                navigate("/purchase");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-text-two cursor-pointer hover:bg-[#FFF4EA] hover:text-[#FE9F43]"
            >
              <FiShoppingBag size={15} />
              Restock (Purchase)
            </button>
          </div>,
          document.body,
        )}

      {/* ================= ADJUST STOCK MODAL ================= */}

      <DialogModal open={adjustTarget !== null} onClick={() => setAdjustTarget(null)}>
        {adjustTarget && (
          <AdjustStockModal
            target={adjustTarget}
            onClose={() => setAdjustTarget(null)}
            onDone={(message) => {
              setAdjustTarget(null);
              setNotice(message);
            }}
          />
        )}
      </DialogModal>

      {/* ================= BATCHES MODAL ================= */}

      <DialogModal open={batchesRow !== undefined} onClick={() => setBatchesFor(null)}>
        {batchesRow && (
          <div className="bg-[#F7F7F7] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.75">
              <div>
                <h4 className="text-lg text-text-two font-semibold">Stock Batches</h4>
                <p className="text-sm text-[#646B72]">
                  {batchesRow.product.productName} · {batchesRow.quantity} in stock
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setBatchesFor(null)}
                className="p-0.5 bg-red-500 rounded-full cursor-pointer"
              >
                <FiX size={20} color="white" />
              </button>
            </div>
            <hr className="border-t border-[#D1D5DB]" />

            <div className="p-5">
              <div className="rounded-lg border border-[#E6EAED] bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left font-semibold text-gray-700">
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchesRow.batches.filter((batch) => batch.quantity > 0).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-[#646B72]">
                          No stock left in any batch.
                        </td>
                      </tr>
                    ) : (
                      [...batchesRow.batches]
                        .filter((batch) => batch.quantity > 0)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((batch) => {
                          const expired = isExpired(batch, today);
                          return (
                            <tr key={batch.id} className="border-b border-gray-100 last:border-0">
                              <td className="px-4 py-3">{formatDate(batch.createdAt)}</td>
                              <td className="px-4 py-3 text-center font-medium">{batch.quantity}</td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                ETB {money(Number(batch.purchasePrice))}
                              </td>
                              <td className={`px-4 py-3 ${expired ? "text-red-500 font-medium" : ""}`}>
                                {formatDate(batch.expiryDate)}
                                {expired && " · expired"}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogModal>
    </>
  );
}
