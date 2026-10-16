// ...existing code...
import { useState } from "react";
import {
  FiSearch,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useGetProductsQuery } from "../../../api/api";
import DialogModal from "../../../components/DialogModal";
import DeleteProduct from "./DeleteProduct";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import {
  closeDeleteProduct,
  openDeleteProduct,
  openProductForm,
} from "../../../store/posSlice";

export default function ProductTable() {
  const { data: products = [] } = useGetProductsQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Category");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );

  // Taken once per visit, so the table doesn't change between renders
  const [now] = useState(() => Date.now());

  // Usable stock: all batches that haven't expired
  const getAvailableQuantity = (
    stockBatches: NonNullable<(typeof products)[number]["stockBatches"]> = [],
  ) => {
    return stockBatches.reduce((total, batch) => {
      const isExpired =
        batch.expiryDate !== null && new Date(batch.expiryDate).getTime() < now;

      if (isExpired) {
        return total;
      }

      return total + Math.max(batch.quantity, 0);
    }, 0);
  };

  // Every product is listed, including ones with no stock left
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.productName.toLowerCase().startsWith(search.toLowerCase()) ||
      product.sku.toLowerCase().startsWith(search.toLowerCase()) ||
      product.category.name.toLowerCase().startsWith(search.toLowerCase()) ||
      product.unit.name.toLowerCase().startsWith(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "Category" ||
      selectedCategory === "All Categories" ||
      product.category.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const rowsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const categories = [
    "All Categories",
    "Beverages",
    "Snacks",
    "Dairy",
    "Bakery",
    "Fruits & Vegetables",
    "Meat & Poultry",
    "Frozen Foods",
    "Personal Care",
    "Household",
    "Others",
  ];


  const dispatch = useDispatch();
  const isDeleteModalOpen = useSelector(
    (state: RootState) => state.pos.isDeleteModalOpen,
  );
  const handleOpenDeleteModal = (id?: number) => {
    if (id !== undefined) setSelectedProductId(id);
    dispatch(openDeleteProduct());
  };

  return (
    <>
      <article
        id="recent-transactions"
        className="shadow bg-white  rounded-lg border border-[#E6EAED]"
      >
        <div
          id="card-header"
          className="px-5 py-4 flex items-center justify-between"
        >
          <div id="serach-input" className="flex items-center gap-2">
            <div className="search-input relative">
              <FiSearch
                size={14}
                color="#A6AAAF"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                className="w-50 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-[#A6AAAF] text-14"
                type="search"
                id="product-search"
                name="productSearch"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Go back to page 1 when searching
                }}
              />
            </div>
          </div>
          <div id="category-selector" className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`${isOpen ? "bg-[#FE9F43] text-white" : ""} flex items-center gap-1 hover:bg-[#FE9F43] hover:text-white px-3 py-1.75 rounded-lg border hover:border-0 border-gray-200 cursor-pointer transition-colors duration-200`}
            >
              <span>Category</span>
              <FiChevronDown />
            </button>

            {isOpen && (
              <ul className="absolute right-0 mt-1 w-60 rounded-xl border border-gray-200 bg-white shadow-sm z-50">
                {categories.map((category) => (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[#646B72] text-[13px] hover:bg-[#FE9F43]/10 hover:text-[#FE9F43] cursor-pointer"
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700 rounded-0">
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Purchase Price</th>
                <th className="px-6 py-4">Selling Price</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4 text-center">VAT</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">{product.sku}</td>
                  <td className="px-6 py-4">{product.productName}</td>
                  <td className="px-6 py-4">{product.category.name}</td>
                  <td className="px-6 py-4">{product.unit.name}</td>
                  <td className="px-6 py-4">
                    ETB {product.stockBatches?.[0]?.purchasePrice ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    ETB {product.sellingPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(() => {
                      const quantity = getAvailableQuantity(product.stockBatches);
                      return quantity > 0 ? (
                        quantity
                      ) : (
                        <span className="inline-flex flex-col items-center leading-tight">
                          <span className="font-semibold text-red-500">0</span>
                          <span className="text-[11px] text-red-500">Out of stock</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">{product.vat}%</td>
                  <td className="px-6 py-4 text-center flex items-center gap-2">
                    <button
                      onClick={() => dispatch(openProductForm(product.id))}
                      className="border border-[#E6EAED] p-2 rounded-md cursor-pointer text-[#646B72] hover:bg-blue-50 hover:text-blue-500 transition-colors duration-200"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="border border-[#E6EAED] p-2 rounded-md cursor-pointer text-[#646B72] hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
                      onClick={() => handleOpenDeleteModal(product.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          id="pagination"
          className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]"
        >
          {/* Right - Rows per page */}
          <div className="flex items-center gap-2 text-sm text-[#646B72]">
            <span>Rows Per Page:</span>

            <select
              disabled
              className="border border-[#E6EAED] rounded-lg pt-1 pb-1 text-12 outline-none cursor-pointer focus:border-[#FE9F43]"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>

            <span>Entries</span>
          </div>
          {/* Left - Pagination */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                    currentPage === page
                      ? "bg-[#FE9F43] border border-[#FE9F43] text-white"
                      : "bg-[rgba(145,158,171,0.3)] text-[#5B6670] hover:bg-[#FE9F43] hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>

      {/* delete dialog */}
      <DialogModal
        open={isDeleteModalOpen}
        onClick={() => dispatch(closeDeleteProduct())}
      >
        {selectedProductId !== null && (
          <DeleteProduct
            productId={selectedProductId}
            onClose={() => dispatch(closeDeleteProduct())}
          />
        )}
      </DialogModal>
    </>
  );
}
// ...existing code...
