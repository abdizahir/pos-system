import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiDownload, FiUpload } from "react-icons/fi";
import Button from "../../../components/Button";
import DialogModal from "../../../components/DialogModal";
import type { RootState } from "../../../store/store";
import { closeProductForm, openProductForm } from "../../../store/posSlice";
import { useGetProductsQuery } from "../../../api/api";
import CreateProduct from "../components/CreateProduct";
import ImportProducts from "../components/ImportProducts";
import ProductTable from "../components/ProductTable";
import { exportProductsCsv } from "../productCsv";
import { useOpenFromLink } from "../../../components/useOpenFromLink";

const OUTLINE_BUTTON =
  "flex items-center gap-2 rounded-[5px] border border-[#E6EAED] bg-white px-3 py-1.75 text-text-two transition-colors hover:border-[#FE9F43] hover:text-[#FE9F43] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

export default function ProductsPage() {
  const dispatch = useDispatch();
  const isProductFormModalOpen = useSelector(
    (state: RootState) => state.pos.isProductFormModalOpen,
  );
  const productId = useSelector(
    (state: RootState) => state.pos.ProductId,
  );
  const { data: products = [] } = useGetProductsQuery();
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Open the add form when linked with ?add=1 (e.g. dashboard quick action)
  useOpenFromLink(() => dispatch(openProductForm(null)));

  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
        <article id="prod-header" className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
                <h4 className="text-text-two font-bold text-[18px] mb-0.5">Product List</h4>
                <p className="text-[#646B72] text-14">Manage your products</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={OUTLINE_BUTTON}
                  onClick={() => setIsImportOpen(true)}
                >
                  <FiUpload size={16} />
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  className={OUTLINE_BUTTON}
                  disabled={products.length === 0}
                  title={products.length === 0 ? "No products to export" : "Download all products as CSV"}
                  onClick={() => exportProductsCsv(products)}
                >
                  <FiDownload size={16} />
                  <span>Export</span>
                </button>
                <Button name="Add Products"  onClick={() => dispatch(openProductForm(null))} />
            </div>
        </article>
        <ProductTable />

        <DialogModal
          onClick={() => dispatch(closeProductForm())}
          open={isProductFormModalOpen}
        >
          <CreateProduct productId={productId} />
        </DialogModal>

        <DialogModal
          onClick={() => setIsImportOpen(false)}
          open={isImportOpen}
        >
          <ImportProducts onClose={() => setIsImportOpen(false)} />
        </DialogModal>
    </section>
  );
}
