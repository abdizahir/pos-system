// import { FiTrash2 } from "react-icons/fi";
import { FiX } from "react-icons/fi";

import SaleForm from "./SaleForm";
import { useDispatch } from "react-redux";
import { closeCreateSale } from "../../../store/posSlice";



export default function CrateSale() {
  const dispatch = useDispatch();
  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div id="modal-header" className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">Add Sale</h4>
        <button onClick={() => dispatch(closeCreateSale())} className="p-0.5 bg-red-500 rounded-full cursor-pointer">
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <SaleForm mode="create" />
    </div>
  );
}
