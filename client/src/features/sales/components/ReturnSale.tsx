import { useState } from "react";
import {
  FiArrowLeft,
  FiMinus,
  FiPlus,
  FiX,
} from "react-icons/fi";
import {
  useCreateSaleReturnMutation,
  useGetSaleQuery,
} from "../../../api/api";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

// ============================================================
// TYPES
// ============================================================

type RefundMethod =
  | "CASH"
  | "BANK"
  | "CARD"
  | "MOBILE";

type ReturnItem = {
  saleItemId: number;
  productId: number;
  productName: string;
  soldQuantity: number;
  returnedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  tax: number;
};

// ============================================================
// COMPONENT
// ============================================================

export default function ReturnSale() {
  // ============================================================
  // API
  // ============================================================

  const [
    createSaleReturn,
    { isLoading: isReturning },
  ] = useCreateSaleReturnMutation();

  // ============================================================
  // ROUTER
  // ============================================================

  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const saleId = Number(id);

  // ============================================================
  // GET SALE
  // ============================================================

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(saleId, {
    skip: !id || Number.isNaN(saleId),
  });

  // ============================================================
  // STATE
  // ============================================================

  const [returnItems, setReturnItems] =
    useState<ReturnItem[]>([]);

  const [reason, setReason] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [refundMethod, setRefundMethod] =
    useState<RefundMethod>("CASH");

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">
          Loading sale...
        </p>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError || !sale) {
    return (
      <div className="p-6">
        <p className="text-red-500">
          Unable to load sale.
        </p>
      </div>
    );
  }

  // ============================================================
  // SALE ITEMS
  // ============================================================

  const items: ReturnItem[] =
    returnItems.length > 0
      ? returnItems
      : sale.items.map((item) => ({
          saleItemId: item.id,

          productId:
            item.product?.id ??
            item.productId,

          productName:
            item.product?.productName ??
            "Unknown Product",

          soldQuantity:
            Number(item.quantity),

          returnedQuantity:
            Number(
              item.returnedQuantity ?? 0
            ),

          returnQuantity: 0,

          unitPrice:
            Number(item.unitPrice),

          tax:
            Number(item.tax ?? 0),
        }));

  // ============================================================
  // UPDATE RETURN QUANTITY
  // ============================================================

  const updateReturnQuantity = (
    saleItemId: number,
    quantity: number,
  ) => {
    setReturnItems(
      items.map((item) => {
        if (
          item.saleItemId !==
          saleItemId
        ) {
          return item;
        }

        // Remaining quantity
        const maxReturn = Math.max(
          0,
          item.soldQuantity -
            item.returnedQuantity,
        );

        return {
          ...item,

          returnQuantity:
            Math.max(
              0,
              Math.min(
                quantity,
                maxReturn,
              ),
            ),
        };
      }),
    );
  };

  // ============================================================
  // INCREASE
  // ============================================================

  const increaseQuantity = (
    item: ReturnItem,
  ) => {
    const maxReturn =
      Math.max(
        0,
        item.soldQuantity -
          item.returnedQuantity,
      );

    if (
      item.returnQuantity >=
      maxReturn
    ) {
      return;
    }

    updateReturnQuantity(
      item.saleItemId,
      item.returnQuantity + 1,
    );
  };

  // ============================================================
  // DECREASE
  // ============================================================

  const decreaseQuantity = (
    item: ReturnItem,
  ) => {
    if (
      item.returnQuantity <= 0
    ) {
      return;
    }

    updateReturnQuantity(
      item.saleItemId,
      item.returnQuantity - 1,
    );
  };

  // ============================================================
  // SELECTED ITEMS
  // ============================================================

  const selectedItems =
    items.filter(
      (item) =>
        item.returnQuantity > 0,
    );

  // ============================================================
  // TOTAL ITEMS
  // ============================================================

  const itemsToReturn =
    selectedItems.reduce(
      (total, item) =>
        total +
        item.returnQuantity,
      0,
    );

  // ============================================================
  // REFUND SUBTOTAL
  // ============================================================

  const refundSubtotal =
    selectedItems.reduce(
      (total, item) =>
        total +
        item.returnQuantity *
          item.unitPrice,
      0,
    );

  // ============================================================
  // REFUND TAX
  // ============================================================

  const refundTax =
    selectedItems.reduce(
      (total, item) => {
        const taxPerItem =
          item.soldQuantity > 0
            ? item.tax /
              item.soldQuantity
            : 0;

        return (
          total +
          taxPerItem *
            item.returnQuantity
        );
      },
      0,
    );

  // ============================================================
  // REFUND TOTAL
  // ============================================================

  const refundTotal =
    refundSubtotal +
    refundTax;

  // ============================================================
  // CONFIRM RETURN
  // ============================================================

  const handleConfirmReturn =
    async () => {
      // No selected items
      if (
        selectedItems.length === 0
      ) {
        return;
      }

      // No reason
      if (!reason) {
        return;
      }

      try {
        const payload = {
          reason,

          refundMethod,

          notes:
            notes.trim() ||
            undefined,

          items:
            selectedItems.map(
              (item) => ({
                saleItemId:
                  item.saleItemId,

                productId:
                  item.productId,

                quantity:
                  item.returnQuantity,
              }),
            ),
        };

        console.log(
          "RETURN PAYLOAD:",
          payload,
        );

        const result =
          await createSaleReturn({
            saleId,
            data: payload,
          }).unwrap();

        console.log(
          "RETURN SUCCESS:",
          result,
        );

        navigate(-1);
      } catch (error) {
        console.error(
          "RETURN ERROR:",
          error,
        );
      }
    };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="rounded-xl bg-white">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <FiArrowLeft
              size={20}
            />
          </button>

          <h1 className="text-xl font-bold text-gray-900">
            Return Sale
          </h1>

        </div>

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <FiX size={20} />
        </button>

      </div>

      {/* ==================================================
          SALE INFORMATION
      ================================================== */}

      <div className="border-b border-gray-200 px-6 py-5">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-gray-500">
              Invoice
            </p>

            <p className="font-semibold text-gray-900">
              {sale.invoiceNumber}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {new Date(
                sale.createdAt,
              ).toLocaleString()}
            </p>

          </div>

          <span className="rounded-full bg-green-500 px-3 py-1.5 text-sm font-medium text-white">
            {sale.status}
          </span>

        </div>

      </div>

      {/* ==================================================
          ITEMS
      ================================================== */}

      <div className="px-6 py-5">

        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          SELECT ITEMS TO RETURN
        </h2>

        <div className="overflow-x-auto rounded-lg border border-gray-200">

          <table className="w-full">

            <thead>

              <tr className="border-b border-gray-200 bg-gray-50 text-sm text-gray-500">

                <th className="px-4 py-3 text-left">
                  Product
                </th>

                <th className="px-4 py-3 text-center">
                  Sold Qty
                </th>

                <th className="px-4 py-3 text-center">
                  Returned
                </th>

                <th className="px-4 py-3 text-center">
                  Remaining
                </th>

                <th className="px-4 py-3 text-center">
                  Return Qty
                </th>

                <th className="px-4 py-3 text-right">
                  Price
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>

              </tr>

            </thead>

            <tbody>

              {items.map(
                (item) => {

                  const maxReturn =
                    Math.max(
                      0,
                      item.soldQuantity -
                        item.returnedQuantity,
                    );

                  return (
                    <tr
                      key={
                        item.saleItemId
                      }
                      className="border-b border-gray-100 last:border-0"
                    >

                      {/* PRODUCT */}

                      <td className="px-4 py-4">

                        <p className="font-medium text-gray-900">
                          {
                            item.productName
                          }
                        </p>

                      </td>

                      {/* SOLD */}

                      <td className="px-4 py-4 text-center text-gray-700">
                        {
                          item.soldQuantity
                        }
                      </td>

                      {/* RETURNED */}

                      <td className="px-4 py-4 text-center font-medium text-gray-700">
                        {
                          item.returnedQuantity
                        }
                      </td>

                      {/* REMAINING */}

                      <td className="px-4 py-4 text-center">

                        <span
                          className={
                            maxReturn ===
                            0
                              ? "font-medium text-red-500"
                              : "font-medium text-gray-700"
                          }
                        >
                          {maxReturn}
                        </span>

                      </td>

                      {/* RETURN QUANTITY */}

                      <td className="px-4 py-4">

                        <div className="flex items-center justify-center gap-2">

                          <button
                            type="button"
                            disabled={
                              item.returnQuantity <=
                              0
                            }
                            onClick={() =>
                              decreaseQuantity(
                                item,
                              )
                            }
                            className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiMinus
                              size={14}
                            />
                          </button>

                          <span className="w-8 text-center font-medium">
                            {
                              item.returnQuantity
                            }
                          </span>

                          <button
                            type="button"
                            disabled={
                              item.returnQuantity >=
                                maxReturn ||
                              maxReturn ===
                                0
                            }
                            onClick={() =>
                              increaseQuantity(
                                item,
                              )
                            }
                            className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiPlus
                              size={14}
                            />
                          </button>

                        </div>

                      </td>

                      {/* PRICE */}

                      <td className="px-4 py-4 text-right text-gray-700">
                        ETB{" "}
                        {item.unitPrice.toFixed(
                          2,
                        )}
                      </td>

                      {/* TOTAL */}

                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        ETB{" "}
                        {(
                          item.returnQuantity *
                          item.unitPrice
                        ).toFixed(2)}
                      </td>

                    </tr>
                  );
                },
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ==================================================
          REFUND METHOD
      ================================================== */}

      <div className="border-t border-gray-200 px-6 py-5">

        <div className="mb-5">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Refund Method
          </label>

          <select
            value={refundMethod}
            onChange={(event) =>
              setRefundMethod(
                event.target
                  .value as RefundMethod,
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="CASH">
              Cash
            </option>

            <option value="BANK">
              Bank
            </option>

            <option value="CARD">
              Card
            </option>

            <option value="MOBILE">
              Mobile Wallet
            </option>

          </select>

        </div>

        {/* ==================================================
            RETURN REASON
        ================================================== */}

        <div className="mb-5">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Return Reason
          </label>

          <select
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="">
              Select return reason
            </option>

            <option value="CUSTOMER_CHANGED_MIND">
              Customer changed mind
            </option>

            <option value="DAMAGED">
              Damaged product
            </option>

            <option value="WRONG_PRODUCT">
              Wrong product
            </option>

            <option value="DEFECTIVE">
              Defective product
            </option>

            <option value="OTHER">
              Other
            </option>

          </select>

        </div>

        {/* ==================================================
            NOTES
        ================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            rows={3}
            placeholder="Optional notes..."
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

      </div>

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="border-t border-gray-200 px-6 py-5">

        <div className="ml-auto w-full space-y-3 md:w-80">

          <div className="flex justify-between text-sm">

            <span className="text-gray-500">
              Items to return
            </span>

            <span className="font-medium text-gray-900">
              {itemsToReturn}
            </span>

          </div>

          <div className="flex justify-between text-sm">

            <span className="text-gray-500">
              Refund subtotal
            </span>

            <span className="font-medium text-gray-900">
              ETB{" "}
              {refundSubtotal.toFixed(
                2,
              )}
            </span>

          </div>

          <div className="flex justify-between text-sm">

            <span className="text-gray-500">
              Tax refund
            </span>

            <span className="font-medium text-gray-900">
              ETB{" "}
              {refundTax.toFixed(2)}
            </span>

          </div>

          <div className="flex justify-between border-t border-gray-200 pt-3">

            <span className="text-lg font-bold text-gray-900">
              Refund Total
            </span>

            <span className="text-lg font-bold text-gray-900">
              ETB{" "}
              {refundTotal.toFixed(
                2,
              )}
            </span>

          </div>

        </div>

      </div>

      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            selectedItems.length ===
              0 ||
            !reason ||
            isReturning
          }
          onClick={
            handleConfirmReturn
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReturning
            ? "Processing..."
            : "Confirm Return"}
        </button>

      </div>

    </div>
  );
}