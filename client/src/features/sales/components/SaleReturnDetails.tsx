import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiMoreVertical,
  FiPrinter,
} from "react-icons/fi";
import { useGetSaleReturnsQuery } from "../../../api/api";

export default function SaleReturnDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const returnId = Number(id);

  const {
    data: saleReturn,
    isLoading,
    isError,
  } = useGetSaleReturnsQuery(returnId, {
    skip: !id || Number.isNaN(returnId),
  });

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">
          Loading return details...
        </p>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError || !saleReturn) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <FiArrowLeft size={20} />

          <span>Sale Returns</span>
        </button>

        <p className="text-red-500">
          Unable to load sale return details.
        </p>
      </div>
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (value: string | number | null | undefined) => {
    const amount = Number(value ?? 0);

    return amount.toFixed(2);
  };

  // ============================================================
  // RETURN NUMBER
  // ============================================================

  const returnNumber = `RET-${String(saleReturn.id).padStart(4, "0")}`;

  return (
    <div className="p-6">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="mb-6 flex items-center justify-between">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <FiArrowLeft size={20} />

          <span>Sale Returns</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <FiPrinter size={18} />

            <span>Print</span>
          </button>

          {/* More */}
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          >
            <FiMoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* ========================================================
          MAIN CARD
      ======================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* ======================================================
            RETURN HEADER
        ====================================================== */}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {returnNumber}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {formatDateTime(saleReturn.createdAt)}
            </p>
          </div>

          {/* Return status is always RETURNED */}
          <span className="rounded-full bg-blue-500 px-3 py-1.5 text-sm font-medium text-white">
            RETURNED
          </span>
        </div>

        {/* ======================================================
            RETURN INFORMATION
        ====================================================== */}

        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-gray-200 pt-6 md:grid-cols-2">
          {/* Original Invoice */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Original Invoice
            </h2>

            <p className="font-semibold text-gray-900">
              {saleReturn.sale?.invoiceNumber || "-"}
            </p>

            {saleReturn.sale?.createdAt && (
              <p className="mt-1 text-sm text-gray-500">
                Sale date:{" "}
                {formatDate(saleReturn.sale.createdAt)}
              </p>
            )}
          </div>

          {/* Return Date */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Return Date
            </h2>

            <p className="font-semibold text-gray-900">
              {formatDate(saleReturn.createdAt)}
            </p>
          </div>
        </div>

        {/* ======================================================
            REASON / NOTES
        ====================================================== */}

        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-gray-200 pt-6 md:grid-cols-2">
          {/* Reason */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Reason
            </h2>

            <p className="font-semibold text-gray-900">
              {saleReturn.reason || "-"}
            </p>
          </div>

          {/* Notes */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Notes
            </h2>

            <p className="text-gray-700">
              {saleReturn.notes || "No notes"}
            </p>
          </div>
        </div>

        {/* ======================================================
            RETURNED ITEMS
        ====================================================== */}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            RETURNED ITEMS
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="py-3 pr-4">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    SKU
                  </th>

                  <th className="px-4 py-3 text-center">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-right">
                    Unit Price
                  </th>

                  <th className="py-3 pl-4 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {saleReturn.items.length > 0 ? (
                  saleReturn.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {/* Product */}
                      <td className="py-4 pr-4 font-medium text-gray-900">
                        {item.product?.productName ||
                          "Unknown Product"}
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-4 text-gray-500">
                        {item.product?.sku || "-"}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-4 text-center text-gray-700">
                        {item.quantity}
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-4 text-right text-gray-700">
                        {formatAmount(item.unitPrice)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 pl-4 text-right font-medium text-gray-900">
                        {formatAmount(item.lineTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No returned items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================
            REFUND SUMMARY
        ====================================================== */}

        <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
          <div className="w-full space-y-3 md:w-80">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Subtotal
              </span>

              <span className="font-medium text-gray-900">
                {formatAmount(saleReturn.subtotal)}
              </span>
            </div>

            {/* Tax */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Tax
              </span>

              <span className="font-medium text-gray-900">
                {formatAmount(saleReturn.tax)}
              </span>
            </div>

            {/* Total */}
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="text-lg font-bold text-gray-900">
                Refund Total
              </span>

              <span className="text-lg font-bold text-gray-900">
                {formatAmount(saleReturn.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================
            ORIGINAL SALE
        ====================================================== */}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            ORIGINAL SALE
          </h2>

          <div className="space-y-3">
            {/* Invoice Number */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Invoice Number
              </span>

              <span className="font-medium text-gray-900">
                {saleReturn.sale?.invoiceNumber || "-"}
              </span>
            </div>

            {/* Sale Date */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Sale Date
              </span>

              <span className="font-medium text-gray-900">
                {saleReturn.sale?.createdAt
                  ? formatDate(saleReturn.sale.createdAt)
                  : "-"}
              </span>
            </div>

            {/* Original Sale Total */}
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-900">
                Original Sale Total
              </span>

              <span className="font-bold text-gray-900">
                {formatAmount(saleReturn.sale?.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}