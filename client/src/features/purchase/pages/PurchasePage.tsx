import Button from "../../../components/Button";
import PurchaseTable from "../components/PurchaseTable";
import { closeCreatePurchase, openCreatePurchase } from "../../../store/posSlice";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import DialogModal from "../../../components/DialogModal";
import CreatePurchase from "../components/CreatePurchase";

export default function PurchasePage() {
  const dispatch = useDispatch();
    const isCreatePurchaseModalOpen = useSelector(
      (state: RootState) => state.pos.isCreatePurchaseModalOpen,
    );
  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Purchase
          </h4>
          <p className="text-[#646B72] text-14">Manage your purchase</p>
        </div>
        <Button
          name="Add Purchase"
          onClick={() => dispatch(openCreatePurchase())}
        />
      </article>
      <PurchaseTable />
      
      <DialogModal
        onClick={() => dispatch(closeCreatePurchase())}
        open={isCreatePurchaseModalOpen}
      >
        <CreatePurchase />
      </DialogModal>
    </section>
  );
}
