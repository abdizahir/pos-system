import { FiTrash2 } from "react-icons/fi";
import { useDeleteProductMutation } from "../../../api/api";

type Props = {
  productId: number;
  onClose?: () => void;
};

export default function DeleteProduct({
  productId,
  onClose,
}: Props) {
  const [deleteProduct, { isLoading, error }] =
    useDeleteProductMutation();

  async function handleDelete() {
    try {
      await deleteProduct({ id: productId }).unwrap();
      onClose?.();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  return (
    <div className="px-4! p-12! text-center bg-[#F7F7F7] flex flex-col items-center justify-center rounded-lg">
      <div className="bg-red-500/10! rounded-[50%] w-fit p-2 mb-2">
        <FiTrash2 size={18} color="#FF0000" />
      </div>

      <h4 className="text-xl text-text-two font-bold mb-2 mt-1">
        Delete Product
      </h4>

      <p className="text-[#646B72] mb-2 text-[16px]">
        Are you sure you want to delete product?
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-2">
          Delete failed
        </p>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="text-[13px] font-medium py-2 px-3 shadow-none bg-text-one border border-text-one text-white rounded-md cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-[13px] font-medium py-2 px-3 bg-[#FE9F43] border border-[#FE9F43] text-white shadow-[0_4px_20px_rgba(254,159,67,0.15)] hover:bg-[#e88d2f] hover:border-[#e88d2f] transition-all duration-200 rounded-md cursor-pointer"
        >
          {isLoading ? "Deleting..." : "Yes Delete"}
        </button>
      </div>
    </div>
  );
}