import { FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";


import { closeEditCustomer } from "../../../../store/posSlice";
import CustomerForm from "./CustomerForm";

type EditCustomerProps = {
  customerId: number;
};

export default function EditCustomer({
  customerId,
}: EditCustomerProps) {
  const dispatch = useDispatch();

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">
          Edit Customer
        </h4>

        <button
          type="button"
          onClick={() =>
            dispatch(closeEditCustomer())
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

      <CustomerForm
        mode="edit"
        customerId={customerId}
      />
    </div>
  );
}