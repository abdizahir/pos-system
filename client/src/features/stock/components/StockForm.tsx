import { type FormEvent, useState } from "react";

import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Button from "../../../components/Button";

import {
  useCreateOpeningStockMutation,
  useGetProductsQuery,
} from "../../../api/api";

import { closeCreateStock } from "../../../store/posSlice";

import { useDispatch } from "react-redux";

type SelectOption = {
  value: number;
  label: string;
};

type OpeningStockRow = {
  product: SelectOption;
  quantity: number;
  purchasePrice: number;
  expiryDate: Date | null;
};

export default function StockForm() {
  const dispatch = useDispatch();

  // ============================================================
  // CREATE OPENING STOCK
  // ============================================================

  const [createOpeningStock, { isLoading: isCreating }] =
    useCreateOpeningStockMutation();

  // ============================================================
  // PRODUCTS
  // ============================================================

  const { data: products = [], isLoading: isProductsLoading } =
    useGetProductsQuery();

  // ============================================================
  // FORM STATE
  // ============================================================

  const [selectedProduct, setSelectedProduct] =
    useState<SelectOption | null>(null);

  const [quantity, setQuantity] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");

  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<OpeningStockRow[]>([]);

  // ============================================================
  // PRODUCT OPTIONS
  // ============================================================

  const productOptions: SelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.productName,
  }));

  // Products already added to the table
  const availableProductOptions = productOptions.filter(
    (option) => !rows.some((row) => row.product.value === option.value),
  );

  // ============================================================
  // ADD PRODUCT TO OPENING STOCK
  // ============================================================

  const handleAddProduct = () => {
    if (!selectedProduct) {
      alert("Please select a product.");
      return;
    }

    const quantityNumber = Number(quantity);
    const priceNumber = Number(purchasePrice);

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      alert("Purchase price cannot be negative.");
      return;
    }

    if (!expiryDate) {
      alert("Please select an expiry date.");
      return;
    }

    // Prevent duplicate product
    const alreadyExists = rows.some(
      (row) => row.product.value === selectedProduct.value,
    );

    if (alreadyExists) {
      alert("This product has already been added.");
      return;
    }

    setRows((previousRows) => [
      ...previousRows,
      {
        product: selectedProduct,
        quantity: quantityNumber,
        purchasePrice: priceNumber,
        expiryDate,
      },
    ]);

    // Reset row form
    setSelectedProduct(null);
    setQuantity("");
    setPurchasePrice("");
    setExpiryDate(null);
  };

  // ============================================================
  // REMOVE PRODUCT
  // ============================================================

  const handleRemoveRow = (productId: number) => {
    setRows((previousRows) =>
      previousRows.filter((row) => row.product.value !== productId),
    );
  };

  // ============================================================
  // TOTAL
  // ============================================================

  const totalOpeningInventory = rows.reduce(
    (total, row) => total + row.quantity * row.purchasePrice,
    0,
  );

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rows.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    try {
      await createOpeningStock({
        items: rows.map((row) => ({
          productId: row.product.value,
          quantity: row.quantity,
          purchasePrice: row.purchasePrice,
          expiryDate: row.expiryDate
            ? row.expiryDate.toISOString().split("T")[0]
            : null,
        })),
      }).unwrap();

      dispatch(closeCreateStock());
    } catch (error) {
      console.error("Failed to create opening stock:", error);
    }
  };

  // ============================================================
  // CLOSE
  // ============================================================

  const handleClose = () => {
    dispatch(closeCreateStock());
  };

  // ============================================================
  // LOADING
  // ============================================================

  const isLoading = isCreating || isProductsLoading;

  // ============================================================
  // FORM
  // ============================================================

  return (
    <form autoComplete="off" onSubmit={handleSubmit}>
      <div className="p-5 max-h-[65dvh] overflow-y-auto">
        {/* ======================================================
            ADD PRODUCT
        ====================================================== */}

        <div className="border border-gray-200 rounded-lg p-4 mb-5">
          <h3 className="text-sm font-semibold mb-4">
            Add Opening Stock
          </h3>

          {/* PRODUCT */}

          <div className="flex flex-col items-start mb-4">
            <label className="text-sm font-medium mb-2">
              Product <span className="text-red-500">*</span>
            </label>

            <Select<SelectOption>
              className="w-full text-left"
              placeholder={
                isProductsLoading
                  ? "Loading products..."
                  : "Select Product"
              }
              isSearchable
              isLoading={isProductsLoading}
              options={availableProductOptions}
              value={selectedProduct}
              onChange={(option) => setSelectedProduct(option)}
              isDisabled={isLoading}
              noOptionsMessage={() => "No products found"}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              menuShouldScrollIntoView={false}
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

          {/* QUANTITY */}

          <div className="flex flex-col items-start mb-4">
            <label
              htmlFor="quantity"
              className="text-sm font-medium mb-2"
            >
              Quantity <span className="text-red-500">*</span>
            </label>

            <input
              id="quantity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
              disabled={isLoading}
              onWheel={(event) => event.currentTarget.blur()}
            />
          </div>

          {/* PURCHASE PRICE */}

          <div className="flex flex-col items-start mb-4">
            <label
              htmlFor="purchasePrice"
              className="text-sm font-medium mb-2"
            >
              Cost Price <span className="text-red-500">*</span>
            </label>

            <input
              id="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(event) =>
                setPurchasePrice(event.target.value)
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
              disabled={isLoading}
              onWheel={(event) => event.currentTarget.blur()}
            />
          </div>

          {/* EXPIRY DATE */}

          <div className="flex flex-col items-start mb-4">
            <label
              htmlFor="expiryDate"
              className="text-sm font-medium mb-2"
            >
              Expiry Date <span className="text-red-500">*</span>
            </label>

            <DatePicker
              id="expiryDate"
              selected={expiryDate}
              onChange={(date: Date | null) => setExpiryDate(date)}
              minDate={new Date()}
              dateFormat="dd/MM/yyyy"
              placeholderText="Select expiry date"
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
              wrapperClassName="w-full"
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={15}
              showMonthDropdown
              scrollableMonthYearDropdown
            />
          </div>

          {/* ADD BUTTON */}

          <button
            type="button"
            onClick={handleAddProduct}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-md bg-[#FE9F43] text-white font-medium cursor-pointer disabled:opacity-50"
          >
            Add Product
          </button>
        </div>

        {/* ======================================================
            OPENING STOCK TABLE
        ====================================================== */}

        {rows.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold">
                Opening Stock
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">
                      Product
                    </th>

                    <th className="text-right px-4 py-3 font-medium">
                      Qty
                    </th>

                    <th className="text-right px-4 py-3 font-medium">
                      Cost
                    </th>

                    <th className="text-right px-4 py-3 font-medium">
                      Value
                    </th>

                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const value =
                      row.quantity * row.purchasePrice;

                    return (
                      <tr
                        key={row.product.value}
                        className="border-t border-gray-100"
                      >
                        <td className="px-4 py-3">
                          {row.product.label}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {row.quantity}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {row.purchasePrice.toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right font-medium">
                          {value.toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveRow(row.product.value)
                            }
                            disabled={isLoading}
                            className="text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TOTAL */}

                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50">
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-right font-semibold"
                    >
                      Total Opening Inventory
                    </td>

                    <td className="px-4 py-4 text-right font-bold">
                      {totalOpeningInventory.toFixed(2)} ETB
                    </td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================
            EMPTY STATE
        ====================================================== */}

        {rows.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            No opening stock added yet.
          </div>
        )}
      </div>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <hr className="border-t border-[#D1D5DB]" />

      <div className="flex items-center justify-end gap-2 px-5 py-4">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleClose}
          className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <Button
          onClick={() => {}}
          name={
            isCreating
              ? "Saving..."
              : "Opening Stock"
          }
          type="submit"
        />
      </div>
    </form>
  );
}