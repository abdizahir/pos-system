import { useState, type ChangeEvent } from "react";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { useGetSaleQuery, useUpdateSaleMutation } from "../../../api/api";

type PaymentMethod = "CASH" | "CARD" | "MOBILE" | "BANK";

export default function CompleteSale() {
  const [paymentError, setPaymentError] = useState("");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const saleId = Number(id);

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(saleId, {
    skip: !id || Number.isNaN(saleId),
  });

  const [updateSale, { isLoading: isCompleting }] = useUpdateSaleMutation();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  const [paidAmount, setPaidAmount] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <p className="text-gray-500">Loading sale...</p>
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="rounded-xl bg-white p-6">
        <p className="text-red-500">Unable to load sale details.</p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2"
        >
          Go Back
        </button>
      </div>
    );
  }

  const total = Number(sale.total) || 0;
  const alreadyPaid = Number(sale.paidAmount) || 0;

  const remainingDue = Math.max(total - alreadyPaid, 0);

  const enteredPayment = Number(paidAmount) || 0;

  const change = Math.max(enteredPayment - remainingDue, 0);

  const onComplete = async () => {
    setPaymentError("");

    if (enteredPayment <= 0) {
      setPaymentError("Please enter a payment amount.");
      return;
    }

    if (enteredPayment < remainingDue) {
      setPaymentError(`Payment must be at least ETB ${remainingDue.toFixed(2)}.`);
      return;
    }

    try {
      await updateSale({
        id: sale.id,
        data: {
          status: "COMPLETED",

          items: sale.items.map((item) => ({
            saleItemId: item.id,
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),

          discountAmount: Number(sale.discount) || 0,
          taxAmount: Number(sale.tax) || 0,
          paymentMethod,
          paidAmount: alreadyPaid + enteredPayment,
        },
      }).unwrap();

      navigate("/sales");
    } catch (error) {
      console.error("Failed to complete sale:", error);

      setPaymentError("Failed to complete sale. Please try again.");
    }
  };

  return (
    <div className="rounded-xl bg-white">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <FiArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-lg font-bold text-gray-900">Complete Sale</h1>

            <p className="text-sm text-gray-500">{sale.invoiceNumber}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* SALE INFO */}
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Customer</p>

            <p className="font-semibold text-gray-900">Walk-in Customer</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Biller</p>

            <p className="font-semibold text-gray-900">
              {sale.user?.name ?? sale.user?.role ?? "Cashier"}
            </p>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="px-6 py-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Products</h2>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-sm text-gray-500">
                <th className="px-4 py-3 text-left">Product</th>

                <th className="px-4 py-3 text-right">Price</th>

                <th className="px-4 py-3 text-center">Qty</th>

                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {sale.items.map((item) => {
                const amount = Number(item.unitPrice) * Number(item.quantity);

                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {item.product?.productName ?? "Product"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right text-gray-700">
                      ${Number(item.unitPrice).toFixed(2)}
                    </td>

                    <td className="px-4 py-4 text-center text-gray-700">
                      {item.quantity}
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-gray-900">
                      ${amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTALS */}
      <div className="border-t border-gray-200 px-6 py-5">
        <div className="ml-auto w-full space-y-3 md:w-80">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>

            <span className="font-medium text-gray-900">
              ${Number(sale.subtotal).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>

            <span className="font-medium text-gray-900">
              ${Number(sale.discount).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>

            <span className="font-medium text-gray-900">
              ${Number(sale.tax).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between border-t pt-3">
            <span className="text-lg font-bold text-gray-900">TOTAL</span>

            <span className="text-lg font-bold text-gray-900">
              ${total.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Already Paid</span>

            <span className="font-medium text-gray-900">
              ${alreadyPaid.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Remaining Due</span>

            <span className="font-bold text-red-600">
              ${remainingDue.toFixed(2)}
            </span>
          </div>

          {/* PAYMENT */}
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Method
              </label>

              <select
                value={paymentMethod}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="MOBILE">MOBILE</option>
                <option value="BANK">BANK</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => {
                  setPaidAmount(e.target.value);
                  setPaymentError("");
                }}
                placeholder={remainingDue.toFixed(2)}
                className={`w-full rounded-lg border px-4 py-2.5 text-right focus:outline-none focus:ring-2 ${
                  paymentError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />

              {paymentError && (
                <p className="mt-1 text-sm text-red-600">{paymentError}</p>
              )}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Change</span>

              <span className="font-medium text-gray-900">
                ${change.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={isCompleting}
          className="rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onComplete}
          disabled={isCompleting}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompleting ? "Completing..." : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}
