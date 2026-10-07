import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";

import { useGetSuppliersQuery } from "../../../../api/api";
import type { RootState } from "../../../../store/store";

import {
  openEditSupplier,
  closeEditSupplier,
  openDeleteSupplier,
  closeDeleteSupplier,
  setSupplierId,
} from "../../../../store/posSlice";

import DialogModal from "../../../../components/DialogModal";
import EditSupplier from "./EditSupplier";
import DeleteSupplier from "./DeleteSupplier";

export default function SupplierTable() {
  const dispatch = useDispatch();

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
  // SUPPLIER STATE
  // ==================================================

  const isEditSupplierModalOpen = useSelector(
    (state: RootState) => state.pos.isEditSupplierModalOpen,
  );

  const isDeleteSupplierModalOpen = useSelector(
    (state: RootState) => state.pos.isDeleteSupplierModalOpen,
  );

  // One supplier ID is shared by Edit and Delete
  const supplierId = useSelector((state: RootState) => state.pos.SupplierId);

  // ==================================================
  // GET SUPPLIERS
  // ==================================================

  const { data: suppliers = [], isLoading, isError } = useGetSuppliersQuery();

  // ==================================================
  // SEARCH / FILTER
  // ==================================================

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchValue = search.toLowerCase();

    return (
      supplier.name?.toLowerCase().includes(searchValue) ||
      supplier.email?.toLowerCase().includes(searchValue) ||
      supplier.phone?.toLowerCase().includes(searchValue) ||
      supplier.address?.toLowerCase().includes(searchValue)
    );
  });

  // ==================================================
  // PAGINATION CALCULATIONS
  // ==================================================

  const totalSuppliers = filteredSuppliers.length;

  const totalPages = Math.max(1, Math.ceil(totalSuppliers / rowsPerPage));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const currentSuppliers = filteredSuppliers.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  // ==================================================
  // EDIT SUPPLIER
  // ==================================================

  const handleEditSupplier = (supplierId: number) => {
    dispatch(setSupplierId(supplierId));
    dispatch(openEditSupplier());
  };

  // ==================================================
  // CLOSE EDIT MODAL
  // ==================================================

  const handleCloseEditSupplier = () => {
    dispatch(closeEditSupplier());
  };

  // ==================================================
  // DELETE SUPPLIER
  // ==================================================

  const handleDeleteSupplier = (supplierId: number) => {
    dispatch(setSupplierId(supplierId));
    dispatch(openDeleteSupplier());
  };

  // ==================================================
  // CLOSE DELETE MODAL
  // ==================================================

  const handleCloseDeleteSupplier = () => {
    dispatch(closeDeleteSupplier());
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <>
      {/* ==================================================
          EDIT SUPPLIER MODAL
      ================================================== */}

      <DialogModal
        open={isEditSupplierModalOpen}
        onClick={handleCloseEditSupplier}
      >
        {supplierId !== null && <EditSupplier supplierId={supplierId} />}
      </DialogModal>

      {/* ==================================================
          DELETE SUPPLIER MODAL
      ================================================== */}

      <DialogModal
        open={isDeleteSupplierModalOpen}
        onClick={handleCloseDeleteSupplier}
      >
        {supplierId !== null && (
          <DeleteSupplier
            supplierId={supplierId}
            onClose={handleCloseDeleteSupplier}
          />
        )}
      </DialogModal>

      {/* ==================================================
          SUPPLIER TABLE
      ================================================== */}

      <article
        id="supplier-table"
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
                id="supplier-search"
                name="supplierSearch"
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

                <th className="px-6 py-4">Supplier</th>

                <th className="px-6 py-4">Email</th>

                <th className="px-6 py-4">Phone</th>

                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Payable</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            {/* ==================================================
                TABLE BODY
            ================================================== */}

            <tbody>
              {/* LOADING */}

              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    Loading suppliers...
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
                    Failed to load suppliers.
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!isLoading && !isError && currentSuppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[#646B72]"
                  >
                    {search ? "No suppliers found." : "No suppliers available."}
                  </td>
                </tr>
              )}

              {/* SUPPLIERS */}

              {!isLoading &&
                !isError &&
                currentSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* CODE */}

                    <td className="px-6 py-4 font-medium text-[#646B72]">
                      SUP-
                      {String(supplier.id).padStart(4, "0")}
                    </td>

                    {/* SUPPLIER */}

                    <td className="px-6 py-4 font-medium text-[#212529]">
                      {supplier.name}
                    </td>

                    {/* EMAIL */}

                    <td className="px-6 py-4 text-[#646B72]">
                      {supplier.email || "-"}
                    </td>

                    {/* PHONE */}

                    <td className="px-6 py-4 text-[#646B72]">
                      {supplier.phone || "-"}
                    </td>

                    {/* ADDRESS */}

                    <td className="px-6 py-4 text-[#646B72]">
                      {supplier.address || "-"}
                    </td>

                    <td className="px-6 py-4 text-[#646B72]">
                      ETB {(supplier.dueAmount ?? 0).toFixed(2)}
                    </td>
                    
                    {/* ACTIONS */}

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* EDIT */}

                        <button
                          type="button"
                          title="Edit supplier"
                          onClick={() => handleEditSupplier(supplier.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          title="Delete supplier"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
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
