import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiX } from "react-icons/fi";
import {
  useGetSaleQuery,
  useCancelSaleMutation,
} from "../../../api/api";

export default function CancelSale() {
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

  const [cancelSale, { isLoading: isCancelling }] =
    useCancelSaleMutation();

  const handleCancel = async () => {
    if (!sale) return;

    try {
      await cancelSale(sale.id).unwrap();

      navigate("/sales");
    } catch (error) {
      console.error("Failed to cancel sale:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">
          Loading sale details...
        </p>
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="p-6">
        <p className="text-red-500">
          Unable to load sale details.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex cursor-pointer items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft size={20} />
          <span>Sales</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="cursor-pointer rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Cancel Sale Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Title */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Cancel Sale
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Are you sure you want to cancel this sale?
          </p>
        </div>

        {/* Sale Information */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Invoice
            </h2>

            <p className="font-semibold text-gray-900">
              {sale.invoiceNumber}
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-500">
              Total
            </h2>

            <p className="font-semibold text-gray-900">
              ${Number(sale.total).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            This action will mark the sale as cancelled.
            The sale cannot be completed afterward.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isCancelling}
            className="cursor-pointer rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Sale
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCancelling ? "Cancelling..." : "Cancel Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}