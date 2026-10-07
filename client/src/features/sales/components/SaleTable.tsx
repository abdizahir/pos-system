import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
} from "react-icons/fi";
import { useGetSalesQuery } from "../../../api/api";
import { useNavigate } from "react-router-dom";

export default function SaleTable() {
  const { data: sales = [] } = useGetSalesQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const navigate = useNavigate();

  const filteredSales = sales.filter((sale) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      sale.invoiceNumber.toLowerCase().startsWith(searchTerm) ||
      sale.status.toLowerCase().startsWith(searchTerm);

    return matchesSearch;
  });

  const rowsPerPage = 10;

  const totalPages = Math.ceil(filteredSales.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const currentSales = filteredSales.slice(startIndex, endIndex);

  return (
    <>
      <article
        id="recent-transactions"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div
          id="card-header"
          className="px-5 py-4 flex items-center justify-between"
        >
          <div id="serach-input" className="flex items-center gap-2">
            <div className="search-input relative">
              <FiSearch
                size={14}
                color="#A6AAAF"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />

              <input
                className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#A6AAAF] text-14"
                type="search"
                id="product-search"
                name="productSearch"
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

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-4 text-left">Reference</th>
                <th className="px-4 py-4 text-left">Date</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-center">Grand Total</th>
                <th className="px-4 py-4 text-center">Paid</th>
                <th className="px-4 py-4 text-center">Due</th>
                <th className="px-4 py-4 text-center">Payment Method</th>
                <th className="px-4 py-4 text-center">Biller</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-[#E6EAED]">
                  <td className="px-4 py-4">{sale.invoiceNumber}</td>

                  <td className="px-4 py-4 text-center">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-md text-white text-sm ${
                        sale.status === "PENDING"
                          ? "bg-yellow-500"
                          : sale.status === "COMPLETED"
                            ? "bg-green-500"
                            : sale.status === "CANCELLED"
                              ? "bg-red-500"
                              : "bg-blue-500"
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">{sale.total}</td>

                  <td className="px-4 py-4 text-center">{sale.paidAmount}</td>

                  <td className="px-4 py-4 text-center">{sale.dueAmount}</td>

                  <td className="px-4 py-4 text-center">
                    {sale.payments && sale.payments.length > 0
                      ? sale.payments
                          .map((payment) => payment.method)
                          .join(", ")
                      : "-"}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {sale.user?.role ?? "-"}
                  </td>

                  <td className="px-4 py-4">
                    <div className="relative flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(openMenuId === sale.id ? null : sale.id)
                        }
                        className="cursor-pointer transition-colors duration-200 hover:text-[#FE9F43]"
                      >
                        <FiMoreVertical size={21} />
                      </button>

                      {openMenuId === sale.id && (
                        <div className="absolute right-0 bottom-8 z-20 w-40 rounded-lg border border-[#E6EAED] bg-white shadow-lg">
                          {/* PENDING */}
                          {sale.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/sales/${sale.id}/resume`)
                                }
                                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                              >
                                Resume Sale
                              </button>

                            

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/sales/${sale.id}/cancel`)
                                }
                                className="block w-full px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                              >
                                Cancel Sale
                              </button>
                            </>
                          )}

                          {/* COMPLETED */}
                          {sale.status === "COMPLETED" && (
                            <>
                              <button
                                type="button"
                                onClick={() => navigate(`/sales/${sale.id}`)}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                              >
                                View Sale
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/sales/${sale.id}/return`)
                                }
                                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                              >
                                Return Sale
                              </button>
                            </>
                          )}

                          {/* CANCELLED */}
                          {sale.status === "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => navigate(`/sales/${sale.id}`)}
                              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              View Sale
                            </button>
                          )}

                          {/* RETURNED */}
                          {sale.status === "RETURNED" && (
                            <button
                              type="button"
                              onClick={() => navigate(`/sales/${sale.id}`)}
                              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              View Sale
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              disabled={currentPage === 1}
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
                    currentPage === page
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
              disabled={currentPage === totalPages}
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
