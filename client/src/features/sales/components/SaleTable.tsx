import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiEye,
  FiPlayCircle,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { useGetSalesQuery } from "../../../api/api";
import { StatusBadge } from "./SaleModalParts";
import { customerName, etb } from "./saleHelpers";

type MenuAction = {
  label: string;
  icon: IconType;
  to: string;
  danger?: boolean;
};

// What can be done with a sale in each status
function actionsFor(sale: { id: number; status: string }): MenuAction[] {
  const view = { label: "View Sale", icon: FiEye, to: `/sales/${sale.id}` };

  switch (sale.status) {
    case "PENDING":
      return [
        view,
        { label: "Resume Sale", icon: FiPlayCircle, to: `/sales/${sale.id}/resume` },
        { label: "Cancel Sale", icon: FiTrash2, to: `/sales/${sale.id}/cancel`, danger: true },
      ];
    case "COMPLETED":
      return [
        view,
        { label: "Return Sale", icon: FiRotateCcw, to: `/sales/${sale.id}/return` },
      ];
    default:
      return [view];
  }
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  BANK: "Bank",
};

export default function SaleTable() {
  const { data: sales = [], isLoading, isError } = useGetSalesQuery();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Open actions menu: which sale, and where to draw it on screen
  const [menu, setMenu] = useState<{ saleId: number; top: number; right: number } | null>(null);

  // Close the menu on any outside click, scroll or resize
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

  const filteredSales = sales.filter((sale) => {
    const searchTerm = search.toLowerCase().trim();
    if (!searchTerm) return true;

    return (
      sale.invoiceNumber.toLowerCase().includes(searchTerm) ||
      sale.status.toLowerCase().includes(searchTerm) ||
      customerName(sale.customer).toLowerCase().includes(searchTerm) ||
      (sale.customer?.phone ?? "").includes(searchTerm)
    );
  });

  const rowsPerPage = 10;
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const currentSales = filteredSales.slice(startIndex, startIndex + rowsPerPage);

  const openSale = menu ? sales.find((sale) => sale.id === menu.saleId) : undefined;

  return (
    <article
      id="recent-transactions"
      className="shadow bg-white rounded-lg border border-[#E6EAED]"
    >
      <div id="card-header" className="px-5 py-4 flex items-center justify-between">
        <div className="search-input relative">
          <FiSearch
            size={14}
            color="#A6AAAF"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            className="w-60 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-text-two text-14 outline-none focus:border-[#FE9F43]"
            type="search"
            id="sale-search"
            name="saleSearch"
            placeholder="Search invoice, customer, status"
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
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Grand Total</th>
              <th className="px-6 py-4 text-right">Paid</th>
              <th className="px-6 py-4 text-right">Due</th>
              <th className="px-6 py-4">Payment Method</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-[#646B72]">
                  Loading sales...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-red-500">
                  Failed to load sales.
                </td>
              </tr>
            ) : currentSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-[#646B72]">
                  No sales found.
                </td>
              </tr>
            ) : (
              currentSales.map((sale) => {
                const methods = [
                  ...new Set((sale.payments ?? []).map((p) => METHOD_LABELS[p.method] ?? p.method)),
                ];
                const due = Number(sale.dueAmount) || 0;

                return (
                  <tr key={sale.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4 font-medium text-text-two">{sale.invoiceNumber}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-text-two">{customerName(sale.customer)}</p>
                      {sale.customer?.phone && (
                        <p className="text-xs text-[#646B72]">{sale.customer.phone}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={sale.status} />
                    </td>

                    <td className="px-6 py-4 text-right font-medium tabular-nums">{etb(sale.total)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{etb(sale.paidAmount)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums ${due > 0 ? "text-red-500 font-medium" : ""}`}>
                      {etb(due)}
                    </td>

                    <td className="px-6 py-4">{methods.length > 0 ? methods.join(", ") : "—"}</td>

                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        aria-label="Actions"
                        aria-haspopup="menu"
                        aria-expanded={menu?.saleId === sale.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menu?.saleId === sale.id) {
                            setMenu(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          // ~36px per item; open upward when it won't fit below
                          const menuHeight = actionsFor(sale).length * 36 + 8;
                          const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight;
                          setMenu({
                            saleId: sale.id,
                            top: fitsBelow ? rect.bottom + 6 : rect.top - 6 - menuHeight,
                            right: window.innerWidth - rect.right,
                          });
                        }}
                        className={`inline-flex border p-2 rounded-md cursor-pointer transition-colors duration-200 ${
                          menu?.saleId === sale.id
                            ? "border-[#FE9F43] text-[#FE9F43]"
                            : "border-[#E6EAED] text-[#646B72] hover:border-[#FE9F43] hover:text-[#FE9F43]"
                        }`}
                      >
                        <FiMoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Actions menu: drawn on top of the page so the table can't cut it off */}
      {menu &&
        openSale &&
        createPortal(
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: menu.top, right: menu.right }}
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-[#E6EAED] bg-white py-1 shadow-lg"
          >
            {actionsFor(openSale).map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    navigate(action.to);
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm cursor-pointer transition-colors ${
                    action.danger
                      ? "text-red-500 hover:bg-red-50"
                      : "text-text-two hover:bg-[#FFF4EA] hover:text-[#FE9F43]"
                  }`}
                >
                  <Icon size={15} />
                  {action.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      <div
        id="pagination"
        className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]"
      >
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safeCurrentPage === 1 || totalPages === 0}
            onClick={() => setCurrentPage((page) => page - 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            return (
              <button
                type="button"
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                  safeCurrentPage === page
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
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((page) => page + 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
