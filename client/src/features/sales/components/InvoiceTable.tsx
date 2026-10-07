import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
} from "react-icons/fi";
import { useGetSalesQuery } from "../../../api/api";
import type { RootState } from "../../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { closeInvoiceDetails, openInvoiceDetails } from "../../../store/posSlice";
import InvoiceDetails from "./InvoiceDetails";
import ViewModal from "../../../components/ViewModal";

export default function InvoiceTable() {
  const dispatch = useDispatch();
  const { data: sales = [], isLoading } = useGetSalesQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rowsPerPage = 10;

    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const isInvoiceDetailsModalOpen = useSelector(
      (state: RootState) => state.pos.isInvoiceDetailsModalOpen,
    );

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredSales = sales.filter((sale) => {
    const searchTerm = search.toLowerCase();

    return (
      sale.invoiceNumber?.toLowerCase().includes(searchTerm) ||
      sale.user?.email?.toLowerCase().includes(searchTerm) ||
      sale.status?.toLowerCase().includes(searchTerm)
    );
  });

    const handleView = (invoiceId: number | null) => {
      if (invoiceId === null) return;
      setSelectedInvoiceId(invoiceId);
      dispatch(openInvoiceDetails());
    };

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredSales.length / rowsPerPage);

  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentSales = filteredSales.slice(startIndex, endIndex);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (isLoading) {
    return (
      <article
        id="invoice-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-[#646B72]">
          Loading invoices...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
        {/* EDIT STOCK MODAL */}
          <ViewModal
            open={isInvoiceDetailsModalOpen}
            onClick={() => {
              dispatch(closeInvoiceDetails());
              setSelectedInvoiceId(null);
            }}
          >
            {selectedInvoiceId !== null && <InvoiceDetails invoiceId={selectedInvoiceId} />}
          </ViewModal>
    <article
      id="invoice-table"
      className="shadow bg-white rounded-lg border border-[#E6EAED]"
    >
      {/* ================= HEADER ================= */}

      <div
        id="card-header"
        className="px-5 py-4 flex items-center justify-between"
      >
        {/* Search */}

        <div id="search-input" className="flex items-center gap-2">
          <div className="search-input relative">
            <FiSearch
              size={14}
              color="#A6AAAF"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />

            <input
              className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#A6AAAF] text-14 outline-none focus:border-[#FE9F43]"
              type="search"
              id="invoice-search"
              name="invoiceSearch"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}

      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
              <th className="px-6 py-4">Invoice #</th>

              <th className="px-6 py-4">Date</th>

              <th className="px-6 py-4">Subtotal</th>

              <th className="px-6 py-4">Discount</th>

              <th className="px-6 py-4">Tax</th>

              <th className="px-6 py-4">Total</th>

              <th className="px-6 py-4">Status</th>

              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentSales.length > 0 ? (
              currentSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  {/* ================= INVOICE NUMBER ================= */}

                  <td className="px-6 py-4 font-medium text-text-two">
                    {sale.invoiceNumber}
                  </td>

                  {/* ================= DATE ================= */}

                  <td className="px-6 py-4">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>

                  {/* ================= SUBTOTAL ================= */}

                  <td className="px-6 py-4">
                    ETB {Number(sale.subtotal).toLocaleString()}
                  </td>

                  {/* ================= DISCOUNT ================= */}

                  <td className="px-6 py-4">
                    ETB {Number(sale.discount || 0).toLocaleString()}
                  </td>

                  {/* ================= TAX ================= */}

                  <td className="px-6 py-4">
                    ETB {Number(sale.tax || 0).toLocaleString()}
                  </td>

                  {/* ================= TOTAL ================= */}

                  <td className="px-6 py-4 font-medium">
                    ETB {Number(sale.total).toLocaleString()}
                  </td>

                  {/* ================= STATUS ================= */}

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                        sale.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : sale.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : sale.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : sale.status === "RETURNED"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>

                  {/* ================= ACTION ================= */}

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        title="View Invoice"
                       onClick={() => handleView(sale.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                      >
                        <FiEye size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= PAGINATION ================= */}

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

        {/* Pagination */}

        <div className="flex items-center gap-2">
          {/* Previous */}

          <button
            type="button"
            disabled={safeCurrentPage === 1 || totalPages === 0}
            onClick={() => setCurrentPage((page) => page - 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft size={18} />
          </button>

          {/* Page Numbers */}

          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <button
                key={page}
                type="button"
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

          {/* Next */}

          <button
            type="button"
            disabled={
              safeCurrentPage === totalPages || totalPages === 0
            }
            onClick={() => setCurrentPage((page) => page + 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
    </>
  );
}