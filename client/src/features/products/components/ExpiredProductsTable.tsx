import { useState } from "react";
import { FiSearch, FiChevronLeft, FiChevronRight, FiTrash2 } from "react-icons/fi";
import {
  useGetProductsQuery,
  useGetStocksQuery,
  useWriteOffExpiredStockMutation,
} from "../../../api/api";
import DeleteModal from "../../../components/DeleteModal";

type ExpiredStock = {
  id: number;
  productId: number;
  quantity: number;
  purchasePrice: number | string;
  expiryDate: string | null;
};

// What a write-off confirmation is for: one product's batches or all of them
type WriteOffTarget = {
  title: string;
  batchIds?: number[];
  units: number;
  cost: number;
};

const etb = (value: number) =>
  `ETB ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpiredProductsTable() {
  const { data: products = [], isLoading: productsLoading } =
    useGetProductsQuery();

  const { data: stocks = [], isLoading: stocksLoading } = useGetStocksQuery();

  const [writeOff, { isLoading: isWritingOff }] = useWriteOffExpiredStockMutation();

  const [selectedCategory] = useState("Category");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [target, setTarget] = useState<WriteOffTarget | null>(null);
  const [writeOffError, setWriteOffError] = useState("");
  const [notice, setNotice] = useState("");

  const rowsPerPage = 10;

  // --------------------------------------------------
  // GET ONLY EXPIRED STOCK BATCHES THAT STILL HAVE UNITS
  // --------------------------------------------------

  const expiredStocks: ExpiredStock[] = stocks.filter((stock) => {
    if (!stock.expiryDate || stock.quantity <= 0) {
      return false;
    }

    const expiryDate = new Date(stock.expiryDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    return expiryDate < today;
  });

  // --------------------------------------------------
  // GROUP EXPIRED STOCK BY PRODUCT
  // --------------------------------------------------

  const expiredProducts = Object.values(
    expiredStocks.reduce(
      (acc, stock) => {
        const product = products.find(
          (product) => product.id === stock.productId,
        );

        if (!product) {
          return acc;
        }

        const batchCost = stock.quantity * Number(stock.purchasePrice);

        // First expired batch for this product
        if (!acc[stock.productId]) {
          acc[stock.productId] = {
            product,
            quantity: stock.quantity,
            purchasePrice: Number(stock.purchasePrice),
            expiryDate: stock.expiryDate,
            batchIds: [stock.id],
            cost: batchCost,
          };

          return acc;
        }

        // Add quantity and cost from this expired batch
        acc[stock.productId].quantity += stock.quantity;
        acc[stock.productId].batchIds.push(stock.id);
        acc[stock.productId].cost += batchCost;

        // --------------------------------------------------
        // KEEP THE EARLIEST EXPIRY DATE
        // --------------------------------------------------

        const currentExpiry = acc[stock.productId].expiryDate;
        const newExpiry = stock.expiryDate;

        if (newExpiry) {
          // If there is no current expiry date,
          // use the new expiry date.
          if (!currentExpiry) {
            acc[stock.productId].expiryDate = newExpiry;
            acc[stock.productId].purchasePrice = Number(stock.purchasePrice);
          }

          // Otherwise compare the two dates
          else if (
            new Date(newExpiry).getTime() <
            new Date(currentExpiry).getTime()
          ) {
            acc[stock.productId].expiryDate = newExpiry;
            acc[stock.productId].purchasePrice = Number(stock.purchasePrice);
          }
        }

        return acc;
      },
      {} as Record<
        number,
        {
          product: (typeof products)[number];
          quantity: number;
          purchasePrice: number;
          expiryDate: string | null;
          batchIds: number[];
          cost: number;
        }
      >,
    ),
  );

  // --------------------------------------------------
  // SEARCH + CATEGORY FILTER
  // --------------------------------------------------

  const filteredProducts = expiredProducts.filter(({ product }) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      product.productName.toLowerCase().startsWith(searchTerm) ||
      product.sku.toLowerCase().startsWith(searchTerm) ||
      product.category.name.toLowerCase().startsWith(searchTerm) ||
      product.unit.name.toLowerCase().startsWith(searchTerm);

    const matchesCategory =
      selectedCategory === "Category" ||
      selectedCategory === "All Categories" ||
      product.category.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);

  /*
   * Prevent the table from trying to display a page
   * that no longer exists after filtering.
   *
   * This is derived state, so we don't need useEffect.
   */
  const safeCurrentPage =
    totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // --------------------------------------------------
  // FORMAT EXPIRY DATE
  // --------------------------------------------------

  const formatExpiryDate = (date: string | null) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString();
  };

  // --------------------------------------------------
  // WRITE OFF
  // --------------------------------------------------

  const totalUnits = expiredProducts.reduce((sum, row) => sum + row.quantity, 0);
  const totalCost = expiredProducts.reduce((sum, row) => sum + row.cost, 0);

  const openWriteOff = (next: WriteOffTarget) => {
    setWriteOffError("");
    setNotice("");
    setTarget(next);
  };

  const confirmWriteOff = async () => {
    if (!target) return;
    setWriteOffError("");

    try {
      const result = await writeOff(
        target.batchIds ? { batchIds: target.batchIds } : undefined,
      ).unwrap();

      setTarget(null);
      setNotice(
        `Wrote off ${result.units} unit${result.units === 1 ? "" : "s"} (${etb(result.total)}) of ${result.products.join(", ")}.`,
      );
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      setWriteOffError(message ?? "Couldn't write off the stock. Please try again.");
    }
  };

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
          Loading expired products...
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
        className="px-5 py-4 flex flex-wrap gap-3 items-center justify-between"
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

        {/* Write off everything that has expired */}
        {expiredProducts.length > 0 && (
          <button
            type="button"
            onClick={() =>
              openWriteOff({
                title: "all expired products",
                units: totalUnits,
                cost: totalCost,
              })
            }
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-red-500 text-white text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors"
          >
            <FiTrash2 size={15} />
            Write Off All ({etb(totalCost)})
          </button>
        )}
      </div>

      {notice && (
        <p className="mx-5 mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
          {notice}
        </p>
      )}

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

              <th className="px-6 py-4 text-center">Expiry Date</th>

              <th className="px-6 py-4 text-right">Cost Value</th>

              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map(
                ({ product, quantity, purchasePrice, expiryDate, batchIds, cost }) => (
                  <tr
                    key={product.id}
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
                      ETB {purchasePrice.toLocaleString()}
                    </td>

                    {/* Selling Price */}
                    <td className="px-6 py-4">
                      ETB {Number(product.sellingPrice).toLocaleString()}
                    </td>

                    {/* Total Expired Quantity */}
                    <td className="px-6 py-4 text-center">{quantity}</td>

                    {/* Earliest Expiry Date */}
                    <td className="px-6 py-4 text-center text-red-500 font-medium">
                      {formatExpiryDate(expiryDate)}
                    </td>

                    {/* Cost of the expired units */}
                    <td className="px-6 py-4 text-right font-medium">{etb(cost)}</td>

                    {/* Write off this product's expired batches */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        title="Write off"
                        onClick={() =>
                          openWriteOff({
                            title: product.productName,
                            batchIds,
                            units: quantity,
                            cost,
                          })
                        }
                        className="inline-flex items-center gap-1.5 border border-[#E6EAED] px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer text-[#646B72] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors duration-200"
                      >
                        <FiTrash2 size={13} />
                        Write off
                      </button>
                    </td>
                  </tr>
                ),
              )
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-8 text-center text-[#646B72]"
                >
                  No expired products found.
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
            onClick={() => setCurrentPage((page) => page - 1)}
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
            onClick={() => setCurrentPage((page) => page + 1)}
            className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ================= WRITE-OFF CONFIRMATION ================= */}

      <DeleteModal open={target !== null} onClick={() => !isWritingOff && setTarget(null)}>
        {target && (
          <div className="px-6 py-10 text-center bg-[#F7F7F7] flex flex-col items-center justify-center rounded-lg">
            <div className="bg-red-500/10 rounded-full w-fit p-2 mb-2">
              <FiTrash2 size={18} color="#FF0000" />
            </div>

            <h4 className="text-xl text-text-two font-bold mb-2 mt-1">
              Write Off Expired Stock
            </h4>

            <p className="text-[#646B72] mb-1 text-[15px]">
              Remove{" "}
              <span className="font-semibold text-text-two">
                {target.units} expired unit{target.units === 1 ? "" : "s"}
              </span>{" "}
              of <span className="font-semibold text-text-two">{target.title}</span> from stock?
            </p>
            <p className="text-sm text-[#646B72]">
              Their cost of{" "}
              <span className="font-semibold text-red-500">{etb(target.cost)}</span> is recorded
              as an expired-stock loss.
            </p>

            {writeOffError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {writeOffError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={isWritingOff}
                className="text-[13px] font-medium py-2 px-3 bg-text-one border border-text-one text-white rounded-md cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWriteOff}
                disabled={isWritingOff}
                className="text-[13px] font-medium py-2 px-3 bg-[#FE9F43] border border-[#FE9F43] text-white shadow-[0_4px_20px_rgba(254,159,67,0.15)] hover:bg-[#e88d2f] hover:border-[#e88d2f] transition-all duration-200 rounded-md cursor-pointer disabled:opacity-50"
              >
                {isWritingOff ? "Writing off..." : "Yes, Write Off"}
              </button>
            </div>
          </div>
        )}
      </DeleteModal>
    </article>
  );
}
