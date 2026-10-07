import { useState } from "react";
import { useGetSalesReturnsQuery } from "../../../api/api";
import { useNavigate } from "react-router-dom";

export default function SaleReturnsPage() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const navigate = useNavigate();

  const {
    data: returns = [],
    isLoading,
    isError,
  } = useGetSalesReturnsQuery();
  
  // ============================================================
  // FILTER RETURNS
  // ============================================================

  const filteredReturns = returns.filter((item) => {
    const invoiceNumber = item.sale?.invoiceNumber?.toLowerCase() ?? "";

    const returnNumber =
      `RET-${String(item.id).padStart(4, "0")}`.toLowerCase();

    const searchValue = search.toLowerCase();

    const matchesSearch =
      returnNumber.includes(searchValue) || invoiceNumber.includes(searchValue);

    const matchesDate = !date || item.createdAt.startsWith(date);

    return matchesSearch && matchesDate;
  });

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sale Returns</h1>

          <p className="mt-1 text-sm text-gray-500">
            View and manage returned sales.
          </p>
        </div>

        <div className="rounded-lg border bg-white px-6 py-12 text-center text-gray-500">
          Loading sale returns...
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sale Returns</h1>

          <p className="mt-1 text-sm text-gray-500">
            View and manage returned sales.
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center text-red-600">
          Failed to load sale returns.
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="space-y-6 p-6">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sale Returns</h1>

        <p className="mt-1 text-sm text-gray-500">
          View and manage returned sales.
        </p>
      </div>

      {/* ========================================================
          FILTERS
      ======================================================== */}

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center">
        {/* Search */}

        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice / return number"
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {/* Date */}

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      </div>

      {/* ========================================================
          TABLE
      ======================================================== */}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 text-left text-sm">
            {/* ==================================================
                TABLE HEADER
            ================================================== */}

            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-600">
                  Return #
                </th>

                <th className="px-6 py-4 font-medium text-gray-600">Invoice</th>

                <th className="px-6 py-4 font-medium text-gray-600">Date</th>

                <th className="px-6 py-4 text-center font-medium text-gray-600">
                  Items
                </th>

                <th className="px-6 py-4 text-right font-medium text-gray-600">
                  Refund
                </th>

                <th className="px-6 py-4 font-medium text-gray-600 text-center">
                  Reason
                </th>

                <th className="px-6 py-4 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            {/* ==================================================
                TABLE BODY
            ================================================== */}

            <tbody className="divide-y">
              {filteredReturns.length > 0 ? (
                filteredReturns.map((item) => {
                  const returnNumber = `RET-${String(item.id).padStart(4, "0")}`;

                  return (
                    <tr key={item.id} className="transition hover:bg-gray-50">
                      {/* Return Number */}

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {returnNumber}
                      </td>

                      {/* Invoice */}

                      <td className="px-6 py-4 text-gray-600">
                        {item.sale?.invoiceNumber ?? "-"}
                      </td>

                      {/* Date */}

                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Items */}

                      <td className="px-6 py-4 text-center text-gray-600">
                        {item.items.length}
                      </td>

                      {/* Refund */}

                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {Number(item.total).toFixed(2)}
                      </td>

                      {/* Reason */}

                      <td className="px-6 py-4 text-gray-600">{item.reason}</td>

                      {/* Actions */}

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="text-sm font-medium text-gray-700 hover:text-black cursor-pointer"
                          onClick={() => navigate(`/sale-returns/${item.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No sale returns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
