import { useState, type FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import type { RootState } from "../../../store/store";
import Button from "../../../components/Button";
import { useCreateSaleMutation, useGetProductsQuery } from "../../../api/api";
import { closeCreateSale, closeEditStock } from "../../../store/posSlice";
import { FiTrash2, FiMinus, FiPlus } from "react-icons/fi";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
};

type SaleFormProps = {
  mode: "create" | "edit";
  saleId?: number;
};

type CartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
};

export default function SaleForm({ mode }: SaleFormProps) {
  const dispatch = useDispatch();

  const token = useSelector((state: RootState) => state.auth.token);

  const userId = token ? jwtDecode<JwtPayload>(token).id : null;
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [taxInput, setTaxInput] = useState("");
  const [saleError, setSaleError] = useState("");

  const [createSale] = useCreateSaleMutation();
  const { data: products = [] } = useGetProductsQuery();

  const searchResults = products.filter((product) => {
    const search = productSearch.toLowerCase().trim();

    return (
      product.productName.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search) ||
      product.barcode?.toLowerCase().includes(search)
    );
  });

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const discountAmount = Number(discountInput) || 0;
  const taxAmount = Number(taxInput) || 0;
  const paidAmount = Number(paidAmountInput) || 0;

  const total = Math.max(subtotal - discountAmount + taxAmount, 0);

  const dueAmount = Math.max(total - paidAmount, 0);

  const changeAmount = Math.max(paidAmount - total, 0);

  // ============================================================
  // SUBMIT SALE
  // ============================================================

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSaleError("");

    if (!userId) {
      setSaleError("You must be logged in to create a sale.");
      return;
    }

    if (cart.length === 0) {
      setSaleError("Please add at least one product.");
      return;
    }

    const formData = new FormData(e.currentTarget);

    const paymentMethod = formData.get("paymentMethod") as
      | "CASH"
      | "CARD"
      | "MOBILE"
      | "BANK"
      | null;

    if (!paymentMethod) {
      setSaleError("Please select a payment method.");
      return;
    }

    if (paidAmount < 0) {
      setSaleError("Paid amount cannot be negative.");
      return;
    }

    const paymentReference = formData.get("reference")?.toString() || null;

    const data = {
      userId,

      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        lineTotal: Number(item.lineTotal),
      })),

      subtotal: Number(subtotal),
      discount: Number(discountAmount),
      tax: Number(taxAmount),
      total: Number(total),

      paidAmount: Number(paidAmount),
      dueAmount: Number(dueAmount),
      changeAmount: Number(changeAmount),

      payments: [
        {
          method: paymentMethod,
          amount: Number(paidAmount),
          reference: paymentReference,
        },
      ],
    };

    try {
      await createSale(data).unwrap();

      dispatch(closeCreateSale());
    } catch (error: unknown) {
      console.error("Failed to create sale:", error);

      const message =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data
          ? String(error.data.message)
          : "Unable to complete the sale.";

      setSaleError(message);
    }
  };

  // ============================================================
  // ADD PRODUCT TO CART
  // ============================================================

  const addProductToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    const unitPrice = Number(product.sellingPrice);
    const availableStock = Number(product.stockQuantity);

    if (availableStock <= 0) {
      setSaleError(`${product.productName} is out of stock.`);
      return;
    }

    setSaleError("");

    setCart((prev) => {
      const existingItem = prev.find((item) => item.productId === productId);

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          setSaleError(
            `Insufficient stock for ${product.productName}. Available stock: ${availableStock}.`,
          );

          return prev;
        }

        const newQuantity = existingItem.quantity + 1;

        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: newQuantity,
                lineTotal:
                  newQuantity * item.unitPrice - item.discount + item.tax,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          quantity: 1,
          unitPrice,
          discount: 0,
          tax: 0,
          lineTotal: unitPrice,
        },
      ];
    });

    setProductSearch("");
  };

  // ============================================================
  // INCREASE QUANTITY
  // ============================================================

  const increaseQuantity = (productId: number) => {
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    const availableStock = Number(product.stockQuantity);

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        if (availableStock <= 0) {
          setSaleError(`${product.productName} is out of stock.`);
          return item;
        }

        if (item.quantity >= availableStock) {
          setSaleError(
            `Insufficient stock for ${product.productName}. Available stock: ${availableStock}.`,
          );

          return item;
        }

        setSaleError("");

        const newQuantity = item.quantity + 1;

        return {
          ...item,
          quantity: newQuantity,
          lineTotal: newQuantity * item.unitPrice - item.discount + item.tax,
        };
      }),
    );
  };

  // ============================================================
  // DECREASE QUANTITY
  // ============================================================

  const decreaseQuantity = (productId: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        if (item.quantity <= 1) {
          return item;
        }

        const newQuantity = item.quantity - 1;

        return {
          ...item,
          quantity: newQuantity,
          lineTotal: newQuantity * item.unitPrice - item.discount + item.tax,
        };
      }),
    );

    setSaleError("");
  };

  // ============================================================
  // REMOVE FROM CART
  // ============================================================

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // ============================================================
  // CLOSE FORM
  // ============================================================

  const handleClose = () => {
    if (mode === "create") {
      dispatch(closeCreateSale());
    } else {
      dispatch(closeEditStock());
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <form autoComplete="off" onSubmit={handleSubmit}>
      <div id="create-sale-inputs" className="p-5 max-h-[70vh] overflow-y-auto">
        {/* Product */}
        <div className="flex flex-col items-start mb-4">
          <label htmlFor="productSearch" className="text-sm font-medium mb-2">
            Product
          </label>

          <div className="relative w-full">
            <input
              id="productSearch"
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;

                e.preventDefault();

                const search = productSearch.trim().toLowerCase();

                if (!search) return;

                const product = products.find(
                  (product) =>
                    product.barcode?.toLowerCase() === search ||
                    product.sku.toLowerCase() === search,
                );

                if (product) {
                  addProductToCart(product.id);
                  return;
                }

                setSaleError("Product not found.");
              }}
              placeholder="Search product or scan barcode..."
              autoComplete="off"
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0"
            />

            {/* Search Results */}
            {productSearch.trim() && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-300 rounded-md shadow-md max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProductToCart(product.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{product.productName}</div>

                      <div className="text-sm text-gray-500">
                        SKU: {product.sku}
                        {product.barcode && ` • Barcode: ${product.barcode}`}
                        {" • "}
                        {Number(product.sellingPrice).toFixed(2)}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    No product found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3">Cart</h3>

            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>

                    <th className="px-3 py-2 text-left font-medium">Product</th>

                    <th className="px-3 py-2 text-right font-medium">Price</th>

                    <th className="px-3 py-2 text-center font-medium">Qty</th>

                    <th className="px-3 py-2 text-right font-medium">Amount</th>

                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>

                <tbody>
                  {cart.map((item, index) => (
                    <tr
                      key={item.productId}
                      className="border-t border-gray-200"
                    >
                      <td className="px-3 py-3">{index + 1}</td>

                      <td className="px-3 py-3 font-medium">
                        {item.productName}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {item.unitPrice.toFixed(2)}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.productId)}
                            disabled={item.quantity <= 1}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiMinus size={14} />
                          </button>

                          <span className="min-w-8 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.productId)}
                            disabled={(() => {
                              const product = products.find(
                                (p) => p.id === item.productId,
                              );

                              return (
                                !!product &&
                                item.quantity >= Number(product.stockQuantity)
                              );
                            })()}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-medium">
                        {item.lineTotal.toFixed(2)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="border border-[#E6EAED] p-2 rounded-md cursor-pointer text-[#646B72] hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subtotal */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="subtotal" className="text-sm font-medium mb-2">
            Subtotal
          </label>

          <input
            id="subtotal"
            type="number"
            name="subtotal"
            value={subtotal}
            readOnly
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 outline-0"
          />
        </div>

        {/* Discount */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="discount" className="text-sm font-medium mb-2">
            Discount
          </label>

          <input
            id="discount"
            type="number"
            name="discount"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0"
          />
        </div>

        {/* Tax */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="tax" className="text-sm font-medium mb-2">
            Tax
          </label>

          <input
            id="tax"
            type="number"
            name="tax"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={taxInput}
            onChange={(e) => setTaxInput(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0"
          />
        </div>

        {/* Total */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="total" className="text-sm font-medium mb-2">
            Total
          </label>

          <input
            id="total"
            type="number"
            name="total"
            value={total}
            readOnly
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 outline-0"
          />
        </div>

        {/* Payment Method */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="paymentMethod" className="text-sm font-medium mb-2">
            Payment Method <span className="text-red-500">*</span>
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue=""
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0 cursor-pointer"
            required
          >
            <option value="" disabled>
              Select Payment Method
            </option>

            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="MOBILE">Mobile</option>
            <option value="BANK">Bank</option>
          </select>
        </div>

        {/* Paid Amount */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="paidAmount" className="text-sm font-medium mb-2">
            Paid Amount <span className="text-red-500">*</span>
          </label>

          <input
            id="paidAmount"
            type="number"
            name="paidAmount"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={paidAmountInput}
            onChange={(e) => setPaidAmountInput(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0"
            required
          />
        </div>

        {/* Payment Reference */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="reference" className="text-sm font-medium mb-2">
            Payment Reference
          </label>

          <input
            id="reference"
            type="text"
            name="reference"
            placeholder="Card ref / transaction ID"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-0"
          />
        </div>

        {/* Due Amount */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="dueAmount" className="text-sm font-medium mb-2">
            Due Amount
          </label>

          <input
            id="dueAmount"
            type="number"
            name="dueAmount"
            value={dueAmount}
            readOnly
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 outline-0"
          />
        </div>

        {/* Change Amount */}
        <div className="flex flex-col items-start mb-3">
          <label htmlFor="changeAmount" className="text-sm font-medium mb-2">
            Change Amount
          </label>

          <input
            id="changeAmount"
            type="number"
            name="changeAmount"
            value={changeAmount}
            readOnly
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 outline-0"
          />
        </div>
      </div>

      {/* Error */}
      {saleError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {saleError}
        </p>
      )}

      <hr className="border-t border-[#D1D5DB]" />

      <div className="flex items-end justify-end gap-2 px-5 py-3.75">
        <button
          type="button"
          className="px-3.5 py-1.75 flex items-center gap-2 rounded-md bg-text-one text-white cursor-pointer"
          onClick={handleClose}
        >
          Cancel
        </button>

        <Button
          onClick={() => {}}
          name={mode === "create" ? "Create Sale" : "Update Sale"}
          type="submit"
        />
      </div>
    </form>
  );
}
