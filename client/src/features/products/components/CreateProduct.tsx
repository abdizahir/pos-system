import { FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { closeProductForm } from "../../../store/posSlice";
import ProductForm from "./ProductForm";

type CreateProductProps = {
  productId?: number | null;
};

export default function CreateProduct({
  productId,
}: CreateProductProps) {
  const dispatch = useDispatch();

  return (
    <div className="bg-[#F7F7F7] rounded-lg">
      <div
        id="modal-header"
        className="flex items-center justify-between px-5 py-3.75"
      >
        <h4 className="text-lg text-text-two font-semibold">
          {productId ? "Edit Product" : "Add Product"}
        </h4>
        <button
          type="button"
          onClick={() => dispatch(closeProductForm())}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <div className="max-h-[70vh] overflow-y-auto">
        <ProductForm productId={productId} />
      </div>
    </div>
  );
}
