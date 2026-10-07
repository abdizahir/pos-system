import { useMemo, useState } from "react";
import { FiEdit2, FiSearch, FiTrash2 } from "react-icons/fi";

import { useGetPurchasesQuery } from "../../../api/api";
import { useDispatch, useSelector } from "react-redux";

import { closeEditPurchase, openEditPurchase, setPurchaseId } from "../../../store/posSlice";

import type { RootState } from "../../../store/store";
import DialogModal from "../../../components/DialogModal";
import EditPurchase from "./EditPurchase";

export default function PurchaseTable() {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");

  const { data: purchases = [], isLoading, isError } = useGetPurchasesQuery();

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const filteredPurchases = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      const reference = purchase.reference.toLowerCase();
      const supplier = purchase.supplier?.name?.toLowerCase() ?? "";

      const products = purchase.items
        .map((item) => item.product?.productName?.toLowerCase() ?? "")
        .join(" ");

      return (
        reference.includes(value) ||
        supplier.includes(value) ||
        products.includes(value)
      );
    });
  }, [purchases, search]);

  const isEditPurchasModalOpen = useSelector(
    (state: RootState) => state.pos.isEditPurchasModalOpen,
  );

    const purchaseId = useSelector(
      (state: RootState) => state.pos.PurchaseId,
    );

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const formatMoney = (value: number | string) => {
    return Number(value).toFixed(2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  // --------------------------------------------------
  // EDIT PURCHASE
  // --------------------------------------------------

  const handleEditPurchase = (purchaseId: number) => {
    dispatch(setPurchaseId(purchaseId));
    dispatch(openEditPurchase());
  };

  // --------------------------------------------------
  // DELETE PURCHASE
  // --------------------------------------------------

  const handleDeletePurchase = (purchaseId: number) => {
    dispatch(setPurchaseId(purchaseId));

    // Add your delete/cancel action here later.
    console.log("Delete purchase:", purchaseId);
  };

  const handleCloseEditPurchase = () => {
    dispatch(closeEditPurchase());
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (isLoading) {
    return (
      <article className="shadow bg-white rounded-lg border border-[#E6EAED]">
        <div className="p-6 text-center text-gray-500">
          Loading purchases...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (isError) {
    return (
      <article className="shadow bg-white rounded-lg border border-[#E6EAED]">
        <div className="p-6 text-center text-red-500">
          Failed to load purchases.
        </div>
      </article>
    );
  }

  return (
    <>
    
      <DialogModal
        open={isEditPurchasModalOpen}
        onClick={handleCloseEditPurchase}
      >
        {purchaseId !== null && <EditPurchase PurchaseId={purchaseId}  />}
      </DialogModal>
      <article
        id="recent-purchases"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        {/* HEADER */}

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
                className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#646B72] text-14 outline-none focus:border-[#FE9F43]"
                type="search"
                id="purchase-search"
                name="purchaseSearch"
                placeholder="Search purchase..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-right">Subtotal</th>
                <th className="px-6 py-4 text-right">Tax</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    {search ? "No purchases found." : "No purchases available."}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* Reference */}

                    <td className="px-6 py-4 font-medium text-gray-800">
                      {purchase.reference}
                    </td>

                    {/* Supplier */}

                    <td className="px-6 py-4 text-gray-600">
                      {purchase.supplier?.name ?? "-"}
                    </td>

                    {/* Product */}

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {purchase.items.map((item) => (
                          <div
                            key={item.id}
                            className="text-gray-700 whitespace-nowrap"
                          >
                            {item.product?.productName ?? "-"}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Quantity */}

                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1">
                        {purchase.items.map((item) => (
                          <div key={item.id} className="text-gray-700">
                            {item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Subtotal */}

                    <td className="px-6 py-4 text-right text-gray-700">
                      {formatMoney(purchase.subtotal)}
                    </td>

                    {/* Tax */}

                    <td className="px-6 py-4 text-right text-gray-700">
                      {formatMoney(purchase.tax)}
                    </td>

                    {/* Total */}

                    <td className="px-6 py-4 text-right font-semibold text-gray-800">
                      {formatMoney(purchase.total)}
                    </td>

                    {/* Status */}

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          purchase.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : purchase.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </td>

                    {/* Date */}

                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(purchase.createdAt)}
                    </td>

                    {/* Actions */}

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* EDIT */}

                        <button
                          type="button"
                          title="Edit purchase"
                          onClick={() => handleEditPurchase(purchase.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          title="Delete purchase"
                          onClick={() => handleDeletePurchase(purchase.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}

        <div
          id="pagination"
          className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]"
        >
          <div className="text-sm text-[#646B72]">
            Showing {filteredPurchases.length} of {purchases.length} purchases
          </div>

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
        </div>
      </article>
    </>
  );
}
