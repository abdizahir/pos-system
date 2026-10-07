import { FiX } from "react-icons/fi";
import SupplierForm from "./SupplierForm";
import { useDispatch } from "react-redux";
import { closeCreateSupplier } from "../../../../store/posSlice";



export default function CreateSupplier() {
  
  const dispatch = useDispatch();
    const handleClose = () => {
      dispatch(closeCreateSupplier());
    };
  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div id="modal-header" className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">Add Supplier</h4>
        <button onClick={handleClose} className="p-0.5 bg-red-500 rounded-full cursor-pointer">
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <SupplierForm mode="create" />
    </div>
  );
}