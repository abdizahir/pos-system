import { useState } from "react";
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";

import { useGetAccountsQuery } from "../../../api/api";

export const BankAccountsTable = () => {
  const { data: accounts = [], isLoading, isError } = useGetAccountsQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rowsPerPage = 10;

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredAccounts = accounts.filter((account) => {
    const searchTerm = search.toLowerCase();

    return (
      account.bankName?.toLowerCase().includes(searchTerm) ||
      account.name.toLowerCase().includes(searchTerm) ||
      account.number.toLowerCase().includes(searchTerm) ||
      account.type.toLowerCase().includes(searchTerm) ||
      account.status.toLowerCase().includes(searchTerm)
    );
  });

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredAccounts.length / rowsPerPage);

  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentAccounts = filteredAccounts.slice(startIndex, endIndex);

  // --------------------------------------------------
  // ACCOUNT TYPE
  // --------------------------------------------------

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "SAVING":
        return "Saving Account";

      case "CURRENT":
        return "Current Account";

      case "JOINT":
        return "Joint Account";

      case "BANK":
        return "Bank";

      case "WALLET":
        return "Wallet";

      case "MERCHANT":
        return "Merchant";

      default:
        return type;
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (isLoading) {
    return (
      <article
        id="account-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-[#646B72]">
          Loading accounts...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (isError) {
    return (
      <article
        id="account-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-red-500">
          Failed to load accounts.
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <article
      id="account-table"
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
              id="account-search"
              name="accountSearch"
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
              <th className="px-6 py-4">Account #</th>

              <th className="px-6 py-4">Bank Name</th>

              <th className="px-6 py-4">Account Name</th>

              <th className="px-6 py-4">Account Number</th>

              <th className="px-6 py-4">Type</th>

              <th className="px-6 py-4">Balance</th>

              <th className="px-6 py-4">Status</th>

              <th className="px-6 py-4">View</th>
            </tr>
          </thead>

          <tbody>
            {currentAccounts.length > 0 ? (
              currentAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  {/* ================= ACCOUNT NUMBER ================= */}

                  <td className="px-6 py-4 font-medium text-text-two">
                    ACC-{account.id}
                  </td>

                  {/* ================= BANK NAME ================= */}

                  <td className="px-6 py-4">{account.bankName || "—"}</td>

                  {/* ================= ACCOUNT NAME ================= */}

                  <td className="px-6 py-4">{account.name}</td>

                  {/* ================= ACCOUNT NUMBER ================= */}

                  <td className="px-6 py-4">{account.number}</td>

                  {/* ================= TYPE ================= */}

                  <td className="px-6 py-4">
                    {getAccountTypeLabel(account.type)}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {Number(account.currentBalance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ETB
                  </td>

                  {/* ================= STATUS ================= */}

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        account.status === "ACTIVE"
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {account.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* ================= VIEW ================= */}

                  <td className="px-6 py-4">
                    <a
                      href={`/money-overview/${account.type.toLowerCase()}/statement?account=${account.id}`}
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-[#E6EAED] px-3 py-1.5 text-sm font-medium text-[#1B2850] transition-colors hover:border-[#FE9F43] hover:text-[#FE9F43]"
                    >
                      <FiEye  size={17} />
                    </a>
                    {/* <button
                      type="button"
                      title="View Invoice"
                      onClick={() => handleView(sale.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                    >
                      
                    </button> */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No accounts found.
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
};
