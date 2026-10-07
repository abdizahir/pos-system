import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useGetExpensesQuery } from "../../../api/api";

export default function ExpensesTable() {
  const { data: expenses = [], isLoading } = useGetExpensesQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rowsPerPage = 10;

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredExpenses = expenses.filter((expense) => {
    const searchTerm = search.toLowerCase();

    return (
      expense.reference
        ?.toLowerCase()
        .includes(searchTerm) ||
      expense.title
        ?.toLowerCase()
        .includes(searchTerm) ||
      expense.category
        ?.toLowerCase()
        .includes(searchTerm) ||
      expense.notes
        ?.toLowerCase()
        .includes(searchTerm) ||
      expense.paymentMethod
        ?.toLowerCase()
        .includes(searchTerm) ||
      expense.user?.email
        ?.toLowerCase()
        .includes(searchTerm)
    );
  });

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.ceil(
    filteredExpenses.length / rowsPerPage,
  );

  const safeCurrentPage =
    totalPages > 0
      ? Math.min(currentPage, totalPages)
      : 1;

  const startIndex =
    (safeCurrentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentExpenses = filteredExpenses.slice(
    startIndex,
    endIndex,
  );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (isLoading) {
    return (
      <article
        id="expense-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-[#646B72]">
          Loading expenses...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <article
      id="expense-table"
      className="shadow bg-white rounded-lg border border-[#E6EAED]"
    >
      {/* ================= HEADER ================= */}

      <div
        id="card-header"
        className="px-5 py-4 flex items-center justify-between"
      >
        {/* Search */}

        <div
          id="search-input"
          className="flex items-center gap-2"
        >
          <div className="search-input relative">
            <FiSearch
              size={14}
              color="#A6AAAF"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />

            <input
              className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#A6AAAF] text-14 outline-none focus:border-[#FE9F43]"
              type="search"
              id="expense-search"
              name="expenseSearch"
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
              <th className="px-6 py-4">
                Expense #
              </th>

              <th className="px-6 py-4">
                Date
              </th>

              <th className="px-6 py-4">
                Title
              </th>

              <th className="px-6 py-4">
                Category
              </th>

              <th className="px-6 py-4">
                Reference
              </th>

              <th className="px-6 py-4">
                Payment Method
              </th>

              <th className="px-6 py-4">
                Amount
              </th>       
            </tr>
          </thead>

          <tbody>
            {currentExpenses.length > 0 ? (
              currentExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  {/* ================= EXPENSE NUMBER ================= */}

                  <td className="px-6 py-4 font-medium text-text-two">
                    {expense.notes || `EXP-${expense.id}`}
                  </td>

                  {/* ================= DATE ================= */}

                  <td className="px-6 py-4">
                    {new Date(
                      expense.date,
                    ).toLocaleDateString()}
                  </td>

                  {/* ================= TITLE ================= */}

                  <td className="px-6 py-4">
                    {expense.title}
                  </td>

                  {/* ================= CATEGORY ================= */}

                  <td className="px-6 py-4">
                    {expense.category}
                  </td>

                  {/* ================= NOTES ================= */}

                  <td className="px-6 py-4">
                    {expense.reference}
                  </td>

                  {/* ================= PAYMENT METHOD ================= */}

                  <td className="px-6 py-4">
                    {expense.paymentMethod}
                  </td>

                  {/* ================= AMOUNT ================= */}

                  <td className="px-6 py-4 font-medium">
                    ETB{" "}
                    {Number(
                      expense.amount,
                    ).toLocaleString()}
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No expenses found.
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
          <span>
            Rows Per Page:
          </span>

          <select
            disabled
            className="border border-[#E6EAED] rounded-lg pt-1 pb-1 text-12 outline-none cursor-pointer focus:border-[#FE9F43]"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>

          <span>
            Entries
          </span>
        </div>

        {/* Pagination */}

        <div className="flex items-center gap-2">
          {/* Previous */}

          <button
            type="button"
            disabled={
              safeCurrentPage === 1 ||
              totalPages === 0
            }
            onClick={() =>
              setCurrentPage(
                (page) => page - 1,
              )
            }
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft size={18} />
          </button>

          {/* Page Numbers */}

          {Array.from(
            { length: totalPages },
            (_, index) => {
              const page = index + 1;

              return (
                <button
                  key={page}
                  type="button"
                  onClick={() =>
                    setCurrentPage(page)
                  }
                  className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                    safeCurrentPage === page
                      ? "bg-[#FE9F43] border border-[#FE9F43] text-white"
                      : "bg-[rgba(145,158,171,0.3)] text-[#5B6670] hover:bg-[#FE9F43] hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            },
          )}

          {/* Next */}

          <button
            type="button"
            disabled={
              safeCurrentPage === totalPages ||
              totalPages === 0
            }
            onClick={() =>
              setCurrentPage(
                (page) => page + 1,
              )
            }
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
