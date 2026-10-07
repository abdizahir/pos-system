import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import Button from "../../../components/Button";
import DialogModal from "../../../components/DialogModal";
import { closeCreateSale, openCreateSale } from "../../../store/posSlice";
import SaleTable from "../components/SaleTable";
import CrateSale from "../components/CreateSale";

export default function SalePage() {
  const dispatch = useDispatch();

  const isCreateSaleModalOpen = useSelector(
    (state: RootState) => state.pos.isCreateSaleModalOpen
  );

  const handleOpenCreateSale = () => {
    dispatch(openCreateSale());
  };

  return (
    <section className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Manage Sale
          </h4>

          <p className="text-[#646B72] text-14">
            Manage your Sale
          </p>
        </div>

        <Button
          name="Add Sale"
          onClick={handleOpenCreateSale}
        />
      </article>

      <SaleTable />

      <DialogModal onClick={() => dispatch(closeCreateSale())} open={isCreateSaleModalOpen}>
        <CrateSale />
      </DialogModal>
    </section>
  );
}