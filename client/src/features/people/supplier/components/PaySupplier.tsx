import { FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { closePaySupplier } from "../../../../store/posSlice";
import PayForm from "./PayForm";

export default function PaySupplier() {
  const dispatch = useDispatch();
  const handleClose = () => {
    dispatch(closePaySupplier());
  };

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div
        id="modal-header"
        className="flex items-center justify-between px-5 py-3.75"
      >
        <h4 className="text-lg text-text-two font-semibold">
          Pay Supplier
        </h4>
        <button
          onClick={handleClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <PayForm mode="create" />
    </div>
  );
}