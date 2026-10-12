import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  useAddSalePaymentMutation,
  useGetAccountsQuery,
  useGetSaleQuery,
} from "../../../api/api";
import {
  Card,
  ErrorBox,
  MethodAndAccount,
  ModalFooter,
  ModalHeader,
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

export default function ResumeSale() {
  const navigate = useNavigate();
  const close = () => navigate(-1);
  const { id } = useParams<{ id: string }>();

  const saleId = Number(id);

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(saleId, {
    skip: !id || Number.isNaN(saleId),
  });

  const { data: accounts = [] } = useGetAccountsQuery();

  const [addSalePayment, { isLoading: isSaving }] =
    useAddSalePaymentMutation();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");

  if (isLoading || isError || !sale) {
    return (
      <>
        <ModalHeader title="Resume Sale" onClose={close} />
        <p className={`p-6 text-center text-sm ${isLoading ? "text-[#646B72]" : "text-red-500"}`}>
          {isLoading ? "Loading sale..." : "Unable to load sale details."}
        </p>
      </>
    );
  }

  const total = Number(sale.total) || 0;
  const previouslyPaid = Number(sale.paidAmount) || 0;
  const due = Math.max(total - previouslyPaid, 0);
  const enteredPayment = Number(paymentAmount) || 0;

  const onSavePayment = async () => {
    setPaymentError("");

    if (enteredPayment <= 0) {
      setPaymentError("Please enter a payment amount.");
      return;
    }

    if (enteredPayment > due + 0.005) {
      setPaymentError(
        `Payment cannot be greater than the remaining due of ${etb(due)}.`,
      );
      return;
    }

    if (paymentMethod !== "CASH" && !accountId) {
      setPaymentError(
        `Select the ${paymentMethod === "MOBILE" ? "wallet or merchant" : "bank"} account that received the money.`,
      );
      return;
    }

    try {
      await addSalePayment({
        saleId: sale.id,
        data: {
          amount: enteredPayment,
          method: paymentMethod,
          accountId: paymentMethod === "CASH" ? null : accountId,
          reference: null,
        },
      }).unwrap();

      navigate("/sales");
    } catch (error) {
      console.error("Failed to save payment:", error);
      setPaymentError(apiErrorMessage(error, "Failed to save payment. Please try again."));
    }
  };

  return (
    <>
      <ModalHeader
        title="Resume Sale"
        subtitle={`${sale.invoiceNumber} · ${customerName(sale.customer)}`}
        onClose={close}
      />

      <div className="p-5 space-y-4">
        {/* ---------------- Products ---------------- */}
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left font-semibold text-gray-700">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => {
                const price = Number(item.unitPrice) || 0;
                const quantity = Number(item.quantity) || 0;

                return (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text-two">
                      {item.product?.productName ?? "Product"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{etb(price)}</td>
                    <td className="px-4 py-3 text-center">{quantity}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {etb(price * quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* ---------------- Totals ---------------- */}
        <div className="flex justify-end">
          <Card className="w-full sm:w-80 px-4 py-3">
            <SummaryRow label="Subtotal" value={etb(sale.subtotal)} />
            <SummaryRow label="Discount" value={`− ${etb(sale.discount)}`} />
            <SummaryRow label="Tax" value={etb(sale.tax)} />
            <SummaryRow label="Total" value={etb(total)} strong />
            <SummaryRow label="Previously Paid" value={etb(previouslyPaid)} tone="green" />
            <SummaryRow label="Due" value={etb(due)} tone="red" strong />
          </Card>
        </div>

        {/* ---------------- Payment ---------------- */}
        <Card className="p-4 space-y-3">
          <MethodAndAccount
            methodLabel="Payment Method"
            method={paymentMethod}
            onMethodChange={(method) => {
              setPaymentMethod(method);
              setPaymentError("");
            }}
            accountId={accountId}
            onAccountChange={setAccountId}
            accounts={accounts}
            disabled={isSaving}
          />

          <div>
            <label htmlFor="payment-amount" className={LABEL}>
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="payment-amount"
                type="number"
                min="0"
                max={due}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setPaymentError("");
                }}
                placeholder="0.00"
                inputMode="decimal"
                disabled={isSaving}
                className={FIELD}
              />
              <button
                type="button"
                onClick={() => setPaymentAmount(due.toFixed(2))}
                disabled={isSaving || due <= 0}
                className="shrink-0 px-3 rounded-md border border-[#FE9F43] text-[#FE9F43] text-sm font-medium cursor-pointer hover:bg-[#FE9F43] hover:text-white transition-colors disabled:opacity-50"
              >
                Pay full
              </button>
            </div>
          </div>

          <ErrorBox message={paymentError} />
        </Card>
      </div>

      <ModalFooter
        onCancel={close}
        action={{
          label: isSaving ? "Saving..." : "Save Payment",
          onClick: onSavePayment,
          disabled: isSaving || due <= 0,
        }}
      />
    </>
  );
}
