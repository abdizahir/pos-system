import { useState } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";

type StockBatch = {
  id: number;
  quantity: number;
  purchasePrice: number | string;
  expiryDate: string | null;
  createdAt: string;
};

import { useGetProductsQuery } from "../../../api/api";

import DialogModal from "../../../components/DialogModal";
import DeleteStock from "./DeleteStock";
import EditStock from "./EditStock";

import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";

import {
  closeDeleteProduct,
  closeEditStock,
  openDeleteProduct,
  openEditStock,
} from "../../../store/posSlice";

export default function StockTable() {
  const dispatch = useDispatch();

  // ============================================================
  // GET PRODUCTS
  // ============================================================

  const { data: products = [], isLoading, isError } = useGetProductsQuery();

  // ============================================================
  // STATE
  // ============================================================

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // ============================================================
  // REDUX MODAL STATE
  // ============================================================

  const isEditStockModalOpen = useSelector(
    (state: RootState) => state.pos.isEditStockModalOpen,
  );

  const isDeleteModalOpen = useSelector(
    (state: RootState) => state.pos.isDeleteModalOpen,
  );

  // ============================================================
  // SEARCH
  // ============================================================

  const searchTerm = search.toLowerCase().trim();

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;

    const productName = product.productName?.toLowerCase() ?? "";
    const sku = product.sku?.toLowerCase() ?? "";
    const barcode = product.barcode?.toLowerCase() ?? "";

    return (
      productName.includes(searchTerm) ||
      sku.includes(searchTerm) ||
      barcode.includes(searchTerm)
    );
  });

  // ============================================================
  // HELPERS
  // ============================================================

  const [currentTime] = useState(() => Date.now());

  const isBatchExpired = (expiryDate: string | null, currentTime: number) => {
    if (!expiryDate) return false;

    return new Date(expiryDate).getTime() < currentTime;
  };

const getLatestBatch = (stockBatches: StockBatch[]) => {
  if (stockBatches.length === 0) return null;

  return [...stockBatches].sort((a, b) => {
    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  })[0];
};

  const getAvailableQuantity = (
    stockBatches: StockBatch[],
    currentTime: number,
  ) => {
    return stockBatches.reduce((total, batch) => {
      if (isBatchExpired(batch.expiryDate, currentTime)) {
        return total;
      }

      return total + batch.quantity;
    }, 0);
  };

  // ============================================================
  // PAGINATION
  // ============================================================

  const rowsPerPage = 10;

  const totalPages = Math.max(
    Math.ceil(filteredProducts.length / rowsPerPage),
    1,
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  // ============================================================
  // EDIT / DELETE
  // ============================================================

  const handleEdit = (batchId: number | null) => {
    if (batchId === null) return;
    setSelectedBatchId(batchId);
    dispatch(openEditStock());
  };

  const handleDelete = (batchId: number | null) => {
    if (batchId === null) return;
    setSelectedBatchId(batchId);
    dispatch(openDeleteProduct());
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <article className="shadow bg-white rounded-lg border border-[#E6EAED] p-6">
        <p className="text-center text-gray-500">Loading stocks...</p>
      </article>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError) {
    return (
      <article className="shadow bg-white rounded-lg border border-[#E6EAED] p-6">
        <p className="text-center text-red-500">Failed to load stocks.</p>
      </article>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* EDIT STOCK MODAL */}
      <DialogModal
        open={isEditStockModalOpen}
        onClick={() => {
          dispatch(closeEditStock());
          setSelectedBatchId(null);
        }}
      >
        {selectedBatchId !== null && <EditStock stockId={selectedBatchId} />}
      </DialogModal>

      {/* STOCK TABLE */}
      <article className="shadow bg-white rounded-lg border border-[#E6EAED]">
        {/* HEADER */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="relative">
            <FiSearch
              size={14}
              color="#A6AAAF"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />

            <input
              className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#646B72] text-sm outline-none focus:border-[#FE9F43]"
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">SKU</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4 text-center">Min. Stock</th>
                <th className="px-6 py-4 text-center">Purchase Price</th>
                <th className="px-6 py-4 text-center">Expiry Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No stocks found.
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => {
                  const stockBatches = product.stockBatches ?? [];

                 const latestBatch = getLatestBatch(stockBatches);

                  const quantity = getAvailableQuantity(
                    stockBatches,
                    currentTime,
                  );

                  const lowStockLimit = product.lowStockLimit ?? 0;

                  const isOutOfStock = quantity <= 0;

                  const isLowStock = quantity > 0 && quantity <= lowStockLimit;

                  const latestBatchId = latestBatch?.id ?? null;

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-[#E6EAED] hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#212529]">
                            {product.productName ?? "-"}
                          </span>

                          {product.barcode && (
                            <span className="text-xs text-gray-400">
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">{product.sku ?? "-"}</td>

                      <td className="px-6 py-4">
                        {product.category?.name ?? "-"}
                      </td>

                      <td className="px-6 py-4 text-center font-medium">
                        {quantity}
                      </td>

                      <td className="px-6 py-4 text-center">{lowStockLimit}</td>

                      <td className="px-6 py-4 text-center">
                        {latestBatch?.purchasePrice ?? "-"}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {latestBatch?.expiryDate
                          ? new Date(
                              latestBatch.expiryDate,
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={
                            isOutOfStock
                              ? "inline-block rounded-md bg-red-100 px-3 py-1 text-red-600 text-sm"
                              : isLowStock
                                ? "inline-block rounded-md bg-yellow-100 px-3 py-1 text-yellow-600 text-sm"
                                : "inline-block rounded-md bg-green-100 px-3 py-1 text-green-600 text-sm"
                          }
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : isLowStock
                              ? "Low Stock"
                              : "In Stock"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {latestBatch?.createdAt
                          ? new Date(latestBatch.createdAt).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(latestBatchId)}
                            disabled={latestBatchId === null}
                            className="border border-[#E6EAED] p-2 rounded-md cursor-pointer text-[#646B72] hover:bg-blue-50 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              latestBatchId === null
                                ? "No stock batch to edit"
                                : "Adjust stock"
                            }
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(latestBatchId)}
                            disabled={latestBatchId === null}
                            className="border border-[#E6EAED] p-2 rounded-md cursor-pointer text-[#646B72] hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              latestBatchId === null
                                ? "No stock batch to delete"
                                : "Delete stock"
                            }
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]">
          <div className="flex items-center gap-2 text-sm text-[#646B72]">
            <span>Rows Per Page:</span>
            <span className="border border-[#E6EAED] rounded-lg px-3 py-1">
              {rowsPerPage}
            </span>
            <span>Entries</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors ${
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
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>

      {/* DELETE MODAL */}
      <DialogModal
        open={isDeleteModalOpen}
        onClick={() => {
          dispatch(closeDeleteProduct());
          setSelectedBatchId(null);
        }}
      >
        {selectedBatchId !== null && (
          <DeleteStock
            stockId={selectedBatchId}
            onClose={() => {
              dispatch(closeDeleteProduct());
              setSelectedBatchId(null);
            }}
          />
        )}
      </DialogModal>
    </>
  );
}
