import { FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";


import { closeEditStock } from "../../../../store/posSlice";
import SupplierForm from "./SupplierForm";

type EditSupplierProps = {
  supplierId: number;
};

export default function EditSupplier({
  supplierId,
}: EditSupplierProps) {
  const dispatch = useDispatch();

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">
          Adjust Supplier
        </h4>

        <button
          type="button"
          onClick={() =>
            dispatch(closeEditStock())
          }
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX
            size={20}
            color="white"
          />
        </button>
      </div>

      <hr className="border-t border-[#D1D5DB]" />

      <SupplierForm
        mode="edit"
        supplierId={supplierId}
      />
    </div>
  );
}