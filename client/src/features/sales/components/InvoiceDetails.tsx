import { FiArrowLeft, FiPrinter } from "react-icons/fi";


import { useGetSaleQuery } from "../../../api/api";
import { shopDetailsLine, useShop } from "../../shop/useShop";
import { useDispatch } from "react-redux";
import { closeInvoiceDetails } from "../../../store/posSlice";

type InvoiceIdProps = {
  invoiceId: number;
};

export default function InvoiceDetails({
  invoiceId,
}: InvoiceIdProps) {
  
  const dispatch = useDispatch();
  const { shop, name: shopName } = useShop();

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(invoiceId);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (isLoading) {
    return (
      <article className="w-full max-w-none bg-white rounded-lg border border-[#E6EAED] shadow">
        <div className="px-6 py-10 text-center text-[#646B72]">
          Loading invoice...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (isError || !sale) {
    return (
      <article className="w-full max-w-none bg-white rounded-lg border border-[#E6EAED] shadow">
        <div className="px-6 py-10 text-center text-red-500">
          Invoice not found.
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <article
      id="invoice-details"
      className="w-full max-w-none bg-white rounded-lg border border-[#E6EAED] shadow"
    >
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="w-full px-6 py-5 border-b border-[#E6EAED] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => dispatch(closeInvoiceDetails())}
            title="Back"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-two">
              Invoice Details
            </h2>

            <p className="text-sm text-[#646B72] truncate">
              {sale.invoiceNumber}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FE9F43] text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <FiPrinter size={16} />
          <span>Print</span>
        </button>
      </div>

      {/* ================================================== */}
      {/* SHOP */}
      {/* ================================================== */}

      <div className="w-full px-6 pt-6 text-center">
        <p className="text-xl font-bold text-text-two">{shopName}</p>
        {shopDetailsLine(shop) && (
          <p className="mt-0.5 text-sm text-[#646B72]">{shopDetailsLine(shop)}</p>
        )}
      </div>

      {/* ================================================== */}
      {/* INVOICE INFORMATION */}
      {/* ================================================== */}

      <div className="w-full px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="min-w-0">
            <p className="text-sm text-[#646B72]">
              Invoice Number
            </p>

            <p className="mt-1 font-medium text-text-two wrap-break-word">
              {sale.invoiceNumber}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm text-[#646B72]">
              Date
            </p>

            <p className="mt-1 font-medium text-text-two wrap-break-word">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm text-[#646B72]">
              Cashier
            </p>

            <p className="mt-1 font-medium text-text-two wrap-break-word">
              {sale.user?.name ||
                sale.user?.email ||
                "N/A"}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm text-[#646B72]">
              Status
            </p>

            <span
              className={`inline-flex mt-1 px-3 py-1 rounded-md text-xs font-medium ${
                sale.status === "COMPLETED"
                  ? "bg-green-100 text-green-700"
                  : sale.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : sale.status === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : sale.status === "RETURNED"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
              }`}
            >
              {sale.status}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* ITEMS TABLE */}
      {/* ================================================== */}

      <div className="w-full px-6 pb-6">
        <div className="w-full overflow-x-auto border border-[#E6EAED] rounded-lg">
          <table className="w-full min-w-225 text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E6EAED] text-left text-sm font-semibold text-gray-700">
                <th className="px-5 py-4 min-w-55">
                  Product
                </th>

                <th className="px-5 py-4 min-w-32.5">
                  SKU
                </th>

                <th className="px-5 py-4 text-center min-w-25">
                  Quantity
                </th>

                <th className="px-5 py-4 text-right min-w-32.5">
                  Unit Price
                </th>

                <th className="px-5 py-4 text-right min-w-30">
                  Discount
                </th>

                <th className="px-5 py-4 text-right min-w-25">
                  Tax
                </th>

                <th className="px-5 py-4 text-right min-w-32.5">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {sale.items.length > 0 ? (
                sale.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-text-two whitespace-nowrap">
                        {item.product?.productName || "N/A"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#646B72] whitespace-nowrap">
                      {item.product?.sku || "N/A"}
                    </td>

                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      ETB{" "}
                      {Number(item.unitPrice).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      ETB{" "}
                      {Number(
                        item.discount || 0,
                      ).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      ETB{" "}
                      {Number(
                        item.tax || 0,
                      ).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right font-medium whitespace-nowrap">
                      ETB{" "}
                      {Number(
                        item.lineTotal,
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-[#646B72]"
                  >
                    No invoice items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================== */}
      {/* PAYMENT / TOTALS */}
      {/* ================================================== */}

      <div className="w-full px-6 pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8">
          {/* Payment Information */}

          <div className="w-full min-w-0">
            <h3 className="text-sm font-semibold text-text-two mb-4">
              Payment Information
            </h3>

            {sale.payments.length > 0 ? (
              <div className="w-full overflow-x-auto border border-[#E6EAED] rounded-lg">
                <table className="w-full min-w-137.5 text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E6EAED]">
                      <th className="px-4 py-3 text-left">
                        Method
                      </th>

                      <th className="px-4 py-3 text-right">
                        Amount
                      </th>

                      <th className="px-4 py-3 text-left">
                        Reference
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sale.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {payment.method}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          ETB{" "}
                          {Number(
                            payment.amount,
                          ).toLocaleString()}
                        </td>

                        <td className="px-4 py-3 wrap-break-word">
                          {payment.reference || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-[#E6EAED] rounded-lg px-4 py-5 text-sm text-[#646B72]">
                No payments recorded.
              </div>
            )}
          </div>

          {/* Totals */}

          <div className="w-full xl:w-105">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Subtotal
                </span>

                <span className="font-medium text-text-two whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.subtotal,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Discount
                </span>

                <span className="font-medium text-text-two whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.discount || 0,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Tax
                </span>

                <span className="font-medium text-text-two whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.tax || 0,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="border-t border-[#E6EAED] pt-3 flex items-center justify-between gap-6">
                <span className="font-semibold text-text-two">
                  Total
                </span>

                <span className="text-lg font-bold text-[#FE9F43] whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.total,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Paid
                </span>

                <span className="font-medium text-green-600 whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.paidAmount || 0,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Due
                </span>

                <span className="font-medium text-red-500 whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.dueAmount || 0,
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-[#646B72]">
                  Change
                </span>

                <span className="font-medium text-text-two whitespace-nowrap">
                  ETB{" "}
                  {Number(
                    sale.changeAmount || 0,
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}