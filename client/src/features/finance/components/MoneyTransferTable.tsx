import { useMemo, useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import type { MoneyTransfer } from "../../../api/api";

type MoneyTransferTableProps = {
  transfers: MoneyTransfer[];
  isLoading?: boolean;
  isError?: boolean;
};

export const MoneyTransferTable = ({
  transfers,
  isLoading = false,
  isError = false,
}: MoneyTransferTableProps) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] =
    useState<number>(1);

  const rowsPerPage = 10;

  const filteredTransfers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return transfers;
    }

    return transfers.filter((transfer) => {
      const transferDate = new Date(
        transfer.date
      ).toLocaleDateString("en-GB");

      return (
        transferDate
          .toLowerCase()
          .includes(searchTerm) ||
        transfer.reference
          .toLowerCase()
          .includes(searchTerm) ||
        transfer.number
          .toLowerCase()
          .includes(searchTerm) ||
        transfer.fromAccount.name
          .toLowerCase()
          .includes(searchTerm) ||
        transfer.toAccount.name
          .toLowerCase()
          .includes(searchTerm)
      );
    });
  }, [search, transfers]);

  const totalPages = Math.ceil(
    filteredTransfers.length / rowsPerPage
  );

  const safeCurrentPage =
    totalPages > 0
      ? Math.min(currentPage, totalPages)
      : 1;

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const currentTransfers = filteredTransfers.slice(
    startIndex,
    endIndex
  );

  if (isLoading) {
    return (
      <article
        id="money-transfer-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-[#646B72]">
          Loading money transfers...
        </div>
      </article>
    );
  }

  if (isError) {
    return (
      <article
        id="money-transfer-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-red-500">
          Failed to load money transfers.
        </div>
      </article>
    );
  }

  return (
    <article
      id="money-transfer-table"
      className="shadow bg-white rounded-lg border border-[#E6EAED]"
    >
      <div
        id="card-header"
        className="px-5 py-4 flex items-center justify-between"
      >
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
              id="transfer-search"
              name="transferSearch"
              placeholder="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Number</th>
              <th className="px-6 py-4">From Account</th>
              <th className="px-6 py-4">To Account</th>
              <th className="px-6 py-4">Amount</th>
            </tr>
          </thead>

          <tbody>
            {currentTransfers.length > 0 ? (
              currentTransfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="px-6 py-4">
                    {new Date(
                      transfer.date
                    ).toLocaleDateString("en-GB")}
                  </td>

                  <td className="px-6 py-4">
                    {transfer.reference}
                  </td>

                  <td className="px-6 py-4">
                    {transfer.number}
                  </td>

                  <td className="px-6 py-4">
                    {transfer.fromAccount.bankName}- 
                     {transfer.fromAccount.name}
                  </td>

                  <td className="px-6 py-4">
                    {transfer.toAccount.bankName}- 
                     {transfer.toAccount.name}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {Number(transfer.amount).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}{" "}
                    ETB
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No money transfers found.
                </td>
              </tr>
            )}
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
          </select>
          <span>Entries</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              safeCurrentPage === 1 || totalPages === 0
            }
            onClick={() =>
              setCurrentPage((page) => page - 1)
            }
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft size={18} />
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => {
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
            }
          )}

          <button
            type="button"
            disabled={
              safeCurrentPage === totalPages ||
              totalPages === 0
            }
            onClick={() =>
              setCurrentPage((page) => page + 1)
            }
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
};
