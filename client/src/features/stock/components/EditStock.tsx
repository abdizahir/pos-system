import { useEffect, useState, type FormEvent } from "react";
import { FiX } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch } from "react-redux";

import {
  useGetStockQuery,
  useUpdateStockMutation,
} from "../../../api/api";
import { closeEditStock } from "../../../store/posSlice";

type EditStockProps = {
  stockId: number;
};

export default function EditStock({
  stockId,
}: EditStockProps) {
  const dispatch = useDispatch();

  const { data: stock, isLoading: isStockLoading } =
    useGetStockQuery(stockId);

  const [updateStock, { isLoading: isUpdating }] =
    useUpdateStockMutation();

  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(
    null,
  );

  useEffect(() => {
    if (!stock) {
      return;
    }

    setQuantity(String(stock.quantity));
    setPurchasePrice(String(stock.purchasePrice));
    setExpiryDate(
      stock.expiryDate
        ? new Date(stock.expiryDate)
        : null,
    );
  }, [stock]);

  const isLoading =
    isStockLoading || isUpdating;

  const handleClose = () => {
    dispatch(closeEditStock());
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextQuantity = Number(quantity);
    const nextPurchasePrice = Number(purchasePrice);

    if (
      !Number.isInteger(nextQuantity) ||
      nextQuantity < 0
    ) {
      alert("Quantity must be zero or greater.");
      return;
    }

    if (
      !Number.isFinite(nextPurchasePrice) ||
      nextPurchasePrice < 0
    ) {
      alert("Purchase price cannot be negative.");
      return;
    }

    try {
      await updateStock({
        id: stockId,
        quantity: nextQuantity,
        purchasePrice: nextPurchasePrice,
        expiryDate: expiryDate
          ? expiryDate.toISOString().split("T")[0]
          : null,
      }).unwrap();

      handleClose();
    } catch (error) {
      console.error("Failed to update stock:", error);
    }
  };

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">
          Adjust Stock
        </h4>

        <button
          type="button"
          onClick={handleClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX
            size={20}
            color="white"
          />
        </button>
      </div>

      <hr className="border-t border-[#D1D5DB]" />

      <form
        onSubmit={handleSubmit}
        className="p-5 text-left"
      >
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Product
          </label>
          <input
            type="text"
            value={stock?.product.productName ?? ""}
            disabled
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="edit-stock-quantity"
            className="text-sm font-medium mb-2 block"
          >
            Quantity
          </label>
          <input
            id="edit-stock-quantity"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            disabled={isLoading || !stock}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="edit-stock-purchase-price"
            className="text-sm font-medium mb-2 block"
          >
            Cost Price
          </label>
          <input
            id="edit-stock-purchase-price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={purchasePrice}
            onChange={(event) =>
              setPurchasePrice(event.target.value)
            }
            disabled={isLoading || !stock}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
          />
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block">
            Expiry Date
          </label>
          <DatePicker
            selected={expiryDate}
            onChange={(date: Date | null) =>
              setExpiryDate(date)
            }
            dateFormat="dd/MM/yyyy"
            placeholderText="Select expiry date"
            disabled={isLoading || !stock}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43]"
            wrapperClassName="w-full"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={15}
            showMonthDropdown
            scrollableMonthYearDropdown
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading || !stock}
            className="px-4 py-2 rounded-md bg-[#FE9F43] text-white cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
