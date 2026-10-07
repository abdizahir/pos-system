import { useState } from "react";
import { FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useGetProductsQuery, useGetStocksQuery } from "../../../api/api";

export default function LowStocksProductsTable() {
  const { data: products = [], isLoading: productsLoading } =
    useGetProductsQuery();

  const { data: stocks = [], isLoading: stocksLoading } = useGetStocksQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const rowsPerPage = 10;

  // --------------------------------------------------
  // GET ONLY LOW STOCK PRODUCTS
  // --------------------------------------------------

  const lowStockProducts = products.filter(
    (product) => product.stockQuantity <= product.lowStockLimit,
  );

  // --------------------------------------------------
  // CONNECT PRODUCT WITH STOCK
  // --------------------------------------------------

  const lowStockProductsWithStock = lowStockProducts
    .map((product) => {
      const productStocks = stocks.filter(
        (stock) => stock.productId === product.id,
      );

      if (productStocks.length === 0) {
        return null;
      }

      // First try to find the latest batch that still has stock
      const availableStocks = productStocks.filter(
        (stock) => stock.quantity > 0,
      );

      const stock =
        availableStocks.length > 0
          ? availableStocks.reduce((latest, current) =>
              current.id > latest.id ? current : latest,
            )
          : productStocks.reduce((latest, current) =>
              current.id > latest.id ? current : latest,
            );

      return {
        stock,
        product,
      };
    })
    .filter(
      (
        item,
      ): item is {
        stock: (typeof stocks)[number];
        product: (typeof products)[number];
      } => item !== null,
    );

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredProducts = lowStockProductsWithStock.filter(({ product }) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      product.productName.toLowerCase().startsWith(searchTerm) ||
      product.sku.toLowerCase().startsWith(searchTerm) ||
      product.category.name.toLowerCase().startsWith(searchTerm) ||
      product.unit.name.toLowerCase().startsWith(searchTerm);

    return matchesSearch;
  });

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);

  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (productsLoading || stocksLoading) {
    return (
      <article
        id="recent-transactions"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        <div className="px-5 py-6 text-center text-[#646B72]">
          Loading low stock products...
        </div>
      </article>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <article
      id="recent-transactions"
      className="shadow bg-white rounded-lg border border-[#E6EAED]"
    >
      {/* ================= HEADER ================= */}

      <div
        id="card-header"
        className="px-5 py-4 flex items-center justify-between"
      >
        {/* Search */}

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
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}

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

              <th className="px-6 py-4 text-center">Low Stock Limit</th>
            </tr>
          </thead>

          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map(({ stock, product }) => (
                <tr
                  key={stock.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  {/* SKU */}

                  <td className="px-6 py-4">{product.sku}</td>

                  {/* Name */}

                  <td className="px-6 py-4">{product.productName}</td>

                  {/* Category */}

                  <td className="px-6 py-4">{product.category.name}</td>

                  {/* Unit */}

                  <td className="px-6 py-4">{product.unit.name}</td>

                  {/* Purchase Price */}

                  <td className="px-6 py-4">
                    ETB {Number(stock.purchasePrice).toLocaleString()}
                  </td>

                  {/* Selling Price */}

                  <td className="px-6 py-4">
                    ETB {Number(product.sellingPrice).toLocaleString()}
                  </td>

                  {/* Quantity */}

                  <td className="px-6 py-4 text-center text-red-500 font-medium">
                    {product.stockQuantity}
                  </td>

                  {/* Low Stock Limit */}

                  <td className="px-6 py-4 text-center">
                    {product.lowStockLimit}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No low stock products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= PAGINATION ================= */}

      <div
        id="pagination"
        className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]"
      >
        {/* Rows per page */}

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

        {/* Pagination */}

        <div className="flex items-center gap-2">
          {/* Previous */}

          <button
            type="button"
            disabled={safeCurrentPage === 1 || totalPages === 0}
            onClick={() => setCurrentPage((page: number) => page - 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft size={18} />
          </button>

          {/* Page Numbers */}

          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                  safeCurrentPage === page
                    ? "bg-[#FE9F43] border border-[#FE9F43] text-white"
                    : "bg-[rgba(145,158,171,0.3)] text-[#5B6670] hover:bg-[#FE9F43] hover:text-white"
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next */}

          <button
            type="button"
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((page: number) => page + 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
