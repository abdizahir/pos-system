import { useDispatch, useSelector } from "react-redux";
import Button from "../../../components/Button";
import DialogModal from "../../../components/DialogModal";
import type { RootState } from "../../../store/store";
import { closeProductForm, openProductForm } from "../../../store/posSlice";
import CreateProduct from "../components/CreateProduct";
import ProductTable from "../components/ProductTable";
import { useOpenFromLink } from "../../../components/useOpenFromLink";



export default function ProductsPage() {
  const dispatch = useDispatch();
  const isProductFormModalOpen = useSelector(
    (state: RootState) => state.pos.isProductFormModalOpen,
  );
  const productId = useSelector(
    (state: RootState) => state.pos.ProductId,
  );

  // Open the add form when linked with ?add=1 (e.g. dashboard quick action)
  useOpenFromLink(() => dispatch(openProductForm(null)));

  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
        <article id="prod-header" className="flex items-center justify-between mb-6">
            <div>
                <h4 className="text-text-two font-bold text-[18px] mb-0.5">Product List</h4>
                <p className="text-[#646B72] text-14">Manage your products</p>
            </div>
            <Button name="Add Products"  onClick={() => dispatch(openProductForm(null))} />
        </article>
        <ProductTable />

        <DialogModal
          onClick={() => dispatch(closeProductForm())}
          open={isProductFormModalOpen}
        >
          <CreateProduct productId={productId} />
        </DialogModal>
    </section>
  );
}
