import { FiX } from "react-icons/fi";
import AccountsForm from "./AccountsForm";
import { useDispatch } from "react-redux";
import { closeCreateAccounts } from "../../../store/posSlice";



export default function CreateAccounts() {
  const dispatch = useDispatch();
  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div id="modal-header" className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">Create Account</h4>
        <button onClick={() => dispatch(closeCreateAccounts())} className="p-0.5 bg-red-500 rounded-full cursor-pointer">
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />
      <AccountsForm mode="create" />
    </div>
  );
}