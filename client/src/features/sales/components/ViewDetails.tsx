import { useNavigate, useParams } from "react-router-dom";

import { useGetSaleQuery } from "../../../api/api";
import {
  Card,
  ModalFooter,
  ModalHeader,
  StatusBadge,
  SummaryRow,
} from "./SaleModalParts";
import { customerName, etb } from "./saleHelpers";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile",
  BANK: "Bank",
};

export default function SaleDetails() {
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

  if (isLoading || isError || !sale) {
    return (
      <>
        <ModalHeader title="Sale Details" onClose={close} />
        <p className={`p-6 text-center text-sm ${isLoading ? "text-[#646B72]" : "text-red-500"}`}>
          {isLoading ? "Loading sale details..." : "Unable to load sale details."}
        </p>
      </>
    );
  }

  const methods = [...new Set((sale.payments ?? []).map((p) => METHOD_LABELS[p.method] ?? p.method))];

  return (
    <>
      <ModalHeader
        title="Sale Details"
        subtitle={sale.invoiceNumber}
        onClose={close}
      />

      <div className="p-5 space-y-4">
        {/* ---------------- Summary ---------------- */}
        <Card className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#646B72] mb-1">Status</p>
              <StatusBadge status={sale.status} />
            </div>
            <div>
              <p className="text-xs text-[#646B72] mb-1">Date</p>
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
              <p className="text-xs text-[#646B72] mb-1">Customer</p>
              <p className="font-medium text-text-two">{customerName(sale.customer)}</p>
              {sale.customer?.phone && (
                <p className="text-xs text-[#646B72]">{sale.customer.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#646B72] mb-1">Payment</p>
              <p className="font-medium text-text-two">
                {methods.length > 0 ? methods.join(", ") : "Not paid"}
              </p>
            </div>
          </div>
        </Card>

        {/* ---------------- Items ---------------- */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left font-semibold text-gray-700">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text-two">
                      {item.product?.productName ?? "Unknown Product"}
                      {item.returnedQuantity > 0 && (
                        <span className="ml-2 text-xs font-normal text-blue-600">
                          {item.returnedQuantity} returned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#646B72]">{item.product?.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{etb(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{etb(item.tax)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{etb(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------------- Totals ---------------- */}
        <div className="flex justify-end">
          <Card className="w-full sm:w-80 px-4 py-3">
            <SummaryRow label="Subtotal" value={etb(sale.subtotal)} />
            <SummaryRow label="Discount" value={`− ${etb(sale.discount)}`} />
            <SummaryRow label="Tax" value={etb(sale.tax)} />
            <SummaryRow label="Grand Total" value={etb(sale.total)} strong />
            <SummaryRow label="Paid" value={etb(sale.paidAmount)} tone="green" />
            {Number(sale.changeAmount) > 0 && (
              <SummaryRow label="Change" value={etb(sale.changeAmount)} />
            )}
            {Number(sale.dueAmount) > 0 && (
              <SummaryRow label="Due" value={etb(sale.dueAmount)} tone="red" />
            )}
          </Card>
        </div>
      </div>

      <ModalFooter onCancel={close} cancelLabel="Close" />
    </>
  );
}
