import Button from "../../../../components/Button";
import DialogModal from "../../../../components/DialogModal";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../store/store";
import {
    closeCreateCustomer,
  openCreateCustomer,

} from "../../../../store/posSlice";
import CreateCustomer from "../components/CreateCustomer";
import CustomerTable from "../components/CustomerTable";

export default function CustomerPage() {
  const dispatch = useDispatch();

  const isCreateCustomerModalOpen = useSelector(
    (state: RootState) => state.pos.isCreateCustomerModalOpen,
  );


  return (
    <section id="supplier-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Customers
          </h4>
          <p className="text-[#646B72] text-14">Manage your customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            name="Add Customer"
            onClick={() => dispatch(openCreateCustomer())}
          />       
        </div>
      </article>
      <CustomerTable />
      <DialogModal
        onClick={() => dispatch(closeCreateCustomer())}
        open={isCreateCustomerModalOpen}
      >
        <CreateCustomer />
      </DialogModal>

    </section>
  );
}
