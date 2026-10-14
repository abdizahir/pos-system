import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { useGetCustomersQuery } from "../../../../api/api";
import type { RootState } from "../../../../store/store";

import {
  openEditCustomer,
  closeEditCustomer,
  openDeleteCustomer,
  closeDeleteCustomer,
  setCustomerId,
} from "../../../../store/posSlice";

import DialogModal from "../../../../components/DialogModal";
import EditCustomer from "./EditCustomer";
import DeleteCustomer from "./DeleteCustomer";
import { useCurrentUser } from "../../../auth/useCurrentUser";

export default function CustomerTable() {
  const dispatch = useDispatch();
  // Cashiers add customers; changing or removing them is the manager's
  const { isManager } = useCurrentUser();

  // ==================================================
  // SEARCH
  // ==================================================

  const [search, setSearch] = useState("");

  // ==================================================
  // PAGINATION
  // ==================================================

  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  // ==================================================
  // CUSTOMER STATE
  // ==================================================

  const isEditCustomerModalOpen = useSelector(
    (state: RootState) => state.pos.isEditCustomerModalOpen,
  );

  const isDeleteCustomerModalOpen = useSelector(
    (state: RootState) => state.pos.isDeleteCustomerModalOpen,
  );

  // One customer ID is shared by Edit and Delete
  const customerId = useSelector((state: RootState) => state.pos.CustomerId);

  // ==================================================
  // GET CUSTOMERS
  // ==================================================

  const { data: customers = [], isLoading, isError } = useGetCustomersQuery();

  // ==================================================
  // SEARCH / FILTER
  // ==================================================

  const filteredCustomers = customers.filter((customer) => {
    const searchValue = search.toLowerCase();

    const fullName =
      `${customer.fname ?? ""} ${customer.lname ?? ""}`.toLowerCase();

    return (
      fullName.includes(searchValue) ||
      customer.fname?.toLowerCase().includes(searchValue) ||
      customer.lname?.toLowerCase().includes(searchValue) ||
      customer.phone?.toLowerCase().includes(searchValue) ||
      customer.address?.toLowerCase().includes(searchValue)
    );
  });

  // ==================================================
  // PAGINATION CALCULATIONS
  // ==================================================

  const totalCustomers = filteredCustomers.length;

  const totalPages = Math.max(1, Math.ceil(totalCustomers / rowsPerPage));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const currentCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  // ==================================================
  // EDIT CUSTOMER
  // ==================================================

  const handleEditCustomer = (customerId: number) => {
    dispatch(setCustomerId(customerId));
    dispatch(openEditCustomer());
  };

  // ==================================================
  // CLOSE EDIT MODAL
  // ==================================================

  const handleCloseEditCustomer = () => {
    dispatch(closeEditCustomer());
  };

  // ==================================================
  // DELETE CUSTOMER
  // ==================================================

  const handleDeleteCustomer = (customerId: number) => {
    dispatch(setCustomerId(customerId));
    dispatch(openDeleteCustomer());
  };

  // ==================================================
  // CLOSE DELETE MODAL
  // ==================================================

  const handleCloseDeleteCustomer = () => {
    dispatch(closeDeleteCustomer());
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <>
      {/* ==================================================
          EDIT CUSTOMER MODAL
      ================================================== */}

      <DialogModal
        open={isEditCustomerModalOpen}
        onClick={handleCloseEditCustomer}
      >
        {customerId !== null && <EditCustomer customerId={customerId} />}
      </DialogModal>

      {/* ==================================================
          DELETE CUSTOMER MODAL
      ================================================== */}

      <DialogModal
        open={isDeleteCustomerModalOpen}
        onClick={handleCloseDeleteCustomer}
      >
        {customerId !== null && (
          <DeleteCustomer
            customerId={customerId}
            onClose={handleCloseDeleteCustomer}
          />
        )}
      </DialogModal>

      {/* ==================================================
          CUSTOMER TABLE
      ================================================== */}

      <article
        id="customer-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        {/* ==================================================
            HEADER
        ================================================== */}

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
                id="customer-search"
                name="customerSearch"
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

        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            {/* ==================================================
                TABLE HEADER
            ================================================== */}

            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Code</th>

                <th className="px-6 py-4">First Name</th>

                <th className="px-6 py-4">Last Name</th>

                <th className="px-6 py-4">Phone</th>

                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Due Amount</th>

                {isManager && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>

            {/* ==================================================
                TABLE BODY
            ================================================== */}

            <tbody>
              {/* LOADING */}

              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    Loading customers...
                  </td>
                </tr>
              )}

              {/* ERROR */}

              {isError && !isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-red-500"
                  >
                    Failed to load customers.
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!isLoading && !isError && currentCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[#646B72]"
                  >
                    {search ? "No customers found." : "No customers available."}
                  </td>
                </tr>
              )}

              {/* CUSTOMERS */}

              {!isLoading &&
                !isError &&
                currentCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* CODE */}

                    <td className="px-6 py-4 font-medium text-[#646B72]">
                      CUS-
                      {String(customer.id).padStart(4, "0")}
                    </td>

                    {/* FIRST NAME */}

                    <td className="px-6 py-4 font-medium text-[#212529]">
                      {customer.fname}
                    </td>

                    {/* LAST NAME */}

                    <td className="px-6 py-4 font-medium text-[#212529]">
                      {customer.lname}
                    </td>

                    {/* PHONE */}

                    <td className="px-6 py-4 text-[#646B72]">
                      {customer.phone || "-"}
                    </td>

                    {/* ADDRESS */}

                    <td className="px-6 py-4 text-[#646B72]">
                      {customer.address || "-"}
                    </td>

                    <td className="px-6 py-4 text-[#646B72]">
                      ETB {(customer.dueAmount ?? 0).toFixed(2)}
                    </td>

                    {/* QACTIONS */}

                    {isManager && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* EDIT */}

                        <button
                          type="button"
                          title="Edit customer"
                          onClick={() => handleEditCustomer(customer.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          title="Delete customer"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ==================================================
            PAGINATION
        ================================================== */}

        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]">
          {/* ROWS PER PAGE */}

          <div className="flex items-center gap-2 text-sm text-[#646B72]">
            <span>Rows Per Page:</span>

            <select
              disabled
              className="border border-[#E6EAED] rounded-lg pt-1 pb-1 text-12"
            >
              <option>10</option>
            </select>

            <span>Entries</span>
          </div>

          {/* PAGINATION */}

          <div className="flex items-center gap-2">
            {/* PREVIOUS */}

            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft size={18} />
            </button>

            {/* PAGE NUMBERS */}

            {Array.from(
              {
                length: totalPages,
              },
              (_, index) => {
                const page = index + 1;

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center ${
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

            {/* NEXT */}

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
