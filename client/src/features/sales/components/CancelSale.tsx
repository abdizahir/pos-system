import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";

import {
  useGetSaleQuery,
  useCancelSaleMutation,
} from "../../../api/api";
import { apiErrorMessage, customerName, etb } from "./saleHelpers";

// Confirmation in the same style as Delete Product
export default function CancelSale() {
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

  const [cancelSale, { isLoading: isCancelling }] =
    useCancelSaleMutation();

  const [error, setError] = useState("");

  const handleCancel = async () => {
    if (!sale) return;
    setError("");

    try {
      await cancelSale(sale.id).unwrap();
      navigate("/sales");
    } catch (err) {
      console.error("Failed to cancel sale:", err);
      setError(apiErrorMessage(err, "Couldn't cancel the sale. Please try again."));
    }
  };

  return (
    <div className="px-6 py-10 text-center flex flex-col items-center justify-center">
      <div className="bg-red-500/10 rounded-full w-fit p-2 mb-2">
        <FiTrash2 size={18} color="#FF0000" />
      </div>

      <h4 className="text-xl text-text-two font-bold mb-2 mt-1">
        Cancel Sale
      </h4>

      {isLoading ? (
        <p className="text-[#646B72] text-sm">Loading sale...</p>
      ) : isError || !sale ? (
        <p className="text-red-500 text-sm">Unable to load sale details.</p>
      ) : (
        <>
          <p className="text-[#646B72] mb-1 text-[16px]">
            Are you sure you want to cancel sale{" "}
            <span className="font-semibold text-text-two">{sale.invoiceNumber}</span>?
          </p>
          <p className="text-sm text-[#646B72]">
            {customerName(sale.customer)} · {etb(sale.total)}
          </p>
          <p className="mt-3 text-xs text-red-500">
            The sale can't be completed after it's cancelled.
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={close}
          disabled={isCancelling}
          className="text-[13px] font-medium py-2 px-3 bg-text-one border border-text-one text-white rounded-md cursor-pointer disabled:opacity-50"
        >
          Keep Sale
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling || !sale}
          className="text-[13px] font-medium py-2 px-3 bg-[#FE9F43] border border-[#FE9F43] text-white shadow-[0_4px_20px_rgba(254,159,67,0.15)] hover:bg-[#e88d2f] hover:border-[#e88d2f] transition-all duration-200 rounded-md cursor-pointer disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Yes Cancel"}
        </button>
      </div>
    </div>
  );
}
