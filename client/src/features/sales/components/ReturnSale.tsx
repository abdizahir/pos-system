import { useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import {
  useCreateSaleReturnMutation,
  useGetAccountsQuery,
  useGetSaleQuery,
} from "../../../api/api";
import {
  Card,
  ErrorBox,
  MethodAndAccount,
  ModalFooter,
  ModalHeader,
  StatusBadge,
  SummaryRow,
} from "./SaleModalParts";
import {
  FIELD,
  LABEL,
  apiErrorMessage,
  customerName,
  etb,
  type PaymentMethod,
} from "./saleHelpers";

// ============================================================
// TYPES
// ============================================================

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

const REASONS = [
  { value: "CUSTOMER_CHANGED_MIND", label: "Customer changed mind" },
  { value: "DAMAGED", label: "Damaged product" },
  { value: "WRONG_PRODUCT", label: "Wrong product" },
  { value: "DEFECTIVE", label: "Defective product" },
  { value: "OTHER", label: "Other" },
];

// ============================================================
// COMPONENT
// ============================================================

export default function ReturnSale() {
  const [createSaleReturn, { isLoading: isReturning }] =
    useCreateSaleReturnMutation();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const close = () => navigate(-1);

  const saleId = Number(id);

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(saleId, {
    skip: !id || Number.isNaN(saleId),
  });

  const { data: accounts = [] } = useGetAccountsQuery();

  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (isLoading || isError || !sale) {
    return (
      <>
        <ModalHeader title="Return Sale" onClose={close} />
        <p className={`p-6 text-center text-sm ${isLoading ? "text-[#646B72]" : "text-red-500"}`}>
          {isLoading ? "Loading sale..." : "Unable to load sale."}
        </p>
      </>
    );
  }

  // ------------------------------------------------------------
  // Items
  // ------------------------------------------------------------

  const items: ReturnItem[] =
    returnItems.length > 0
      ? returnItems
      : sale.items.map((item) => ({
          saleItemId: item.id,
          productId: item.product?.id ?? item.productId,
          productName: item.product?.productName ?? "Unknown Product",
          soldQuantity: Number(item.quantity),
          returnedQuantity: Number(item.returnedQuantity ?? 0),
          returnQuantity: 0,
          unitPrice: Number(item.unitPrice),
          tax: Number(item.tax ?? 0),
        }));

  const remainingOf = (item: ReturnItem) =>
    Math.max(0, item.soldQuantity - item.returnedQuantity);

  const setReturnQuantity = (saleItemId: number, quantity: number) => {
    setError("");
    setReturnItems(
      items.map((item) =>
        item.saleItemId === saleItemId
          ? {
              ...item,
              returnQuantity: Math.max(0, Math.min(quantity, remainingOf(item))),
            }
          : item,
      ),
    );
  };

  const selectedItems = items.filter((item) => item.returnQuantity > 0);

  const itemsToReturn = selectedItems.reduce(
    (total, item) => total + item.returnQuantity,
    0,
  );

  const refundSubtotal = selectedItems.reduce(
    (total, item) => total + item.returnQuantity * item.unitPrice,
    0,
  );

  const refundTax = selectedItems.reduce((total, item) => {
    const taxPerItem = item.soldQuantity > 0 ? item.tax / item.soldQuantity : 0;
    return total + taxPerItem * item.returnQuantity;
  }, 0);

  const refundTotal = refundSubtotal + refundTax;

  // ------------------------------------------------------------
  // Confirm
  // ------------------------------------------------------------

  const handleConfirmReturn = async () => {
    setError("");

    if (selectedItems.length === 0) {
      setError("Choose at least one item to return.");
      return;
    }
    if (!reason) {
      setError("Select a return reason.");
      return;
    }
    if (refundMethod !== "CASH" && !accountId) {
      setError(
        `Select the ${refundMethod === "MOBILE" ? "wallet or merchant" : "bank"} account for the refund.`,
      );
      return;
    }

    try {
      await createSaleReturn({
        saleId,
        data: {
          reason,
          refundMethod,
          ...(refundMethod !== "CASH" && accountId ? { accountId } : {}),
          notes: notes.trim() || undefined,
          items: selectedItems.map((item) => ({
            saleItemId: item.saleItemId,
            productId: item.productId,
            quantity: item.returnQuantity,
          })),
        },
      }).unwrap();

      close();
    } catch (err) {
      console.error("Return failed:", err);
      setError(apiErrorMessage(err, "Couldn't save the return. Please try again."));
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <>
      <ModalHeader
        title="Return Sale"
        subtitle={`${sale.invoiceNumber} · ${customerName(sale.customer)}`}
        onClose={close}
      />

      <div className="p-5 space-y-4">
        {/* ---------------- Sale info ---------------- */}
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-xs text-[#646B72]">Date</p>
            <p className="font-medium text-text-two">
              {new Date(sale.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#646B72]">Grand Total</p>
            <p className="font-medium text-text-two tabular-nums">{etb(sale.total)}</p>
          </div>
          <StatusBadge status={sale.status} />
        </Card>

        {/* ---------------- Items ---------------- */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold text-text-two">
            Select items to return
          </div>
          <div className="overflow-x-auto border-t border-[#E6EAED]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left font-semibold text-gray-700">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Sold</th>
                  <th className="px-4 py-3 text-center">Returned</th>
                  <th className="px-4 py-3 text-center">Remaining</th>
                  <th className="px-4 py-3 text-center">Return Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const remaining = remainingOf(item);

                  return (
                    <tr key={item.saleItemId} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-text-two">{item.productName}</td>
                      <td className="px-4 py-3 text-center">{item.soldQuantity}</td>
                      <td className="px-4 py-3 text-center">{item.returnedQuantity}</td>
                      <td className={`px-4 py-3 text-center font-medium ${remaining === 0 ? "text-red-500" : ""}`}>
                        {remaining}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            aria-label="Decrease"
                            disabled={item.returnQuantity <= 0}
                            onClick={() => setReturnQuantity(item.saleItemId, item.returnQuantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white hover:border-[#FE9F43] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#646B72]"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="w-7 text-center font-semibold tabular-nums">
                            {item.returnQuantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase"
                            disabled={item.returnQuantity >= remaining}
                            onClick={() => setReturnQuantity(item.saleItemId, item.returnQuantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white hover:border-[#FE9F43] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#646B72]"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{etb(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {etb(item.returnQuantity * item.unitPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------------- Refund details ---------------- */}
        <Card className="p-4 space-y-3">
          <MethodAndAccount
            methodLabel="Refund Method"
            method={refundMethod}
            onMethodChange={(method) => {
              setRefundMethod(method);
              setError("");
            }}
            accountId={accountId}
            onAccountChange={setAccountId}
            accounts={accounts}
            disabled={isReturning}
          />

          <div>
            <label htmlFor="return-reason" className={LABEL}>
              Return Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="return-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              disabled={isReturning}
              className={FIELD}
            >
              <option value="">Select return reason</option>
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="return-notes" className={LABEL}>
              Notes
            </label>
            <textarea
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              disabled={isReturning}
              className={`${FIELD} resize-none`}
            />
          </div>
        </Card>

        {/* ---------------- Summary ---------------- */}
        <div className="flex justify-end">
          <Card className="w-full sm:w-80 px-4 py-3">
            <SummaryRow label="Items to return" value={String(itemsToReturn)} />
            <SummaryRow label="Refund subtotal" value={etb(refundSubtotal)} />
            <SummaryRow label="Tax refund" value={etb(refundTax)} />
            <SummaryRow label="Refund Total" value={etb(refundTotal)} strong />
          </Card>
        </div>

        <ErrorBox message={error} />
      </div>

      <ModalFooter
        onCancel={close}
        action={{
          label: isReturning ? "Processing..." : "Confirm Return",
          onClick: handleConfirmReturn,
          disabled: isReturning || selectedItems.length === 0 || !reason,
        }}
      />
    </>
  );
}
