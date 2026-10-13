import { FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";

import { closeCreatePurchase } from "../../../store/posSlice";
import PurchaseForm from "./PurchaseForm";

export default function CreatePurchase() {
  const dispatch = useDispatch();
  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div id="modal-header" className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">Add Purchase</h4>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dispatch(closeCreatePurchase())}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <PurchaseForm mode="create" />
    </div>
  );
}
