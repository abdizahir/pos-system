import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiMoreVertical, FiPrinter } from "react-icons/fi";
import { useGetSaleQuery } from "../../../api/api";



export default function SaleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const saleId = Number(id);

  const {
    data: sale,
    isLoading,
    isError,
  } = useGetSaleQuery(saleId, {
    skip: !id || Number.isNaN(saleId),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading sale details...</p>
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="p-6">
        <p className="text-red-500">Unable to load sale details.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft size={20} />
          <span>Sales</span>
        </button>

        <div className="flex items-center gap-3">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <FiPrinter size={18} />
            Print
          </button>

          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <FiMoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Sale Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sale.invoiceNumber}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>

          <span
            className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${
              sale.status === "COMPLETED"
                ? "bg-green-500"
                : sale.status === "PENDING"
                  ? "bg-yellow-500"
                  : sale.status === "CANCELLED"
                    ? "bg-red-500"
                    : "bg-gray-500"
            }`}
          >
            {sale.status}
          </span>
        </div>

        {/* Customer / Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-200">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Customer</h2>

            <p className="font-semibold text-gray-900">Walk-in Customer</p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Payment</h2>

            <p className="font-semibold text-gray-900">
              {sale.payments?.[0]?.method || "N/A"}
            </p>

            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <p>
                Paid:{" "}
                <span className="text-gray-900 font-medium">
                  ${sale.paidAmount}
                </span>
              </p>

              <p>
                Change:{" "}
                <span className="text-gray-900 font-medium">
                  ${sale.changeAmount}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">ITEMS</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="py-3 pr-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 pl-4 text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {sale.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-4 pr-4 font-medium text-gray-900">
                      {item.product?.productName || "Unknown Product"}
                    </td>

                    <td className="py-4 px-4 text-gray-500">
                      {item.product?.sku || "-"}
                    </td>

                    <td className="py-4 px-4 text-center text-gray-700">
                      {item.quantity}
                    </td>

                    <td className="py-4 px-4 text-right text-gray-700">
                      ${item.unitPrice}
                    </td>

                    <td className="py-4 px-4 text-right text-gray-700">
                      ${item.tax}
                    </td>

                    <td className="py-4 pl-4 text-right font-medium text-gray-900">
                      ${item.lineTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <div className="w-full md:w-80 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">
                ${sale.subtotal}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="font-medium text-gray-900">
                -${sale.discount}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium text-gray-900">${sale.tax}</span>
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">
                Grand Total
              </span>

              <span className="text-lg font-bold text-gray-900">
                ${sale.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
