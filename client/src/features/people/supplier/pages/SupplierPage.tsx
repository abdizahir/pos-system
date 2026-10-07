import Button from "../../../../components/Button";
import SupplierTable from "../components/SupplierTable";
import DialogModal from "../../../../components/DialogModal";
import CreateSupplier from "../components/CreateSupplier";
import PaySupplier from "../components/PaySupplier";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../store/store";
import {
  closeCreateSupplier,
  closePaySupplier,
  openCreateSupplier,
  openPaySupplier,
} from "../../../../store/posSlice";

export default function SupplierPage() {
  const dispatch = useDispatch();

  const isCreateSupplierModalOpen = useSelector(
    (state: RootState) => state.pos.isCreateSupplierModalOpen,
  );

  const isPaySupplierModalOpen = useSelector(
    (state: RootState) => state.pos.isPaySupplierModalOpen,
  );

  return (
    <section id="supplier-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Suppliers
          </h4>
          <p className="text-[#646B72] text-14">Manage your suppliers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            name="Add Suppliers"
            onClick={() => dispatch(openCreateSupplier())}
          />
          <Button
            name="Pay Suppliers"
            onClick={() => dispatch(openPaySupplier())}
          />
        </div>
      </article>
      <SupplierTable />
      <DialogModal
        onClick={() => dispatch(closeCreateSupplier())}
        open={isCreateSupplierModalOpen}
      >
        <CreateSupplier />
      </DialogModal>

      <DialogModal
        onClick={() => dispatch(closePaySupplier())}
        open={isPaySupplierModalOpen}
      >
        <PaySupplier />
      </DialogModal>
    </section>
  );
}
