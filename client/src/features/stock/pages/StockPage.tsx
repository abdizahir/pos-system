import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import Button from "../../../components/Button";
import StockTable from "../components/StockTable";
import DialogModal from "../../../components/DialogModal";
import { closeCreateStock, openCreateStock } from "../../../store/posSlice";
import StockForm from "../components/StockForm";

export default function StockPage() {
  const dispatch = useDispatch();

  const isCreateStockModalOpen = useSelector(
    (state: RootState) => state.pos.isCreateSrockModalOpen,
  );

  const handleOpenCreateStock = () => {
    dispatch(openCreateStock());
  };

  return (
    <section className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Manage Stock
          </h4>

          <p className="text-[#646B72] text-14">Manage your Stock</p>
        </div>

        <Button name="Add Opening Stock" onClick={() => handleOpenCreateStock()} />
      </article>

      <StockTable />

      <DialogModal
        onClick={() => dispatch(closeCreateStock())}
        open={isCreateStockModalOpen}
      >
        <StockForm />
      </DialogModal>
    </section>
  );
}
