import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useDispatch } from "react-redux";

import Button from "../../../components/Button";

import {
  closeCreatePurchase,
  closeEditPurchase,
} from "../../../store/posSlice";

import {
  useGetSuppliersQuery,
  useGetProductsQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
} from "../../../api/api";

type PurchaseFormProps = {
  mode: "create" | "edit";
  purchaseId?: number;
};

// What the purchase costs, and so what is paid
function purchaseTotal(line: {
  quantity: number;
  purchasePrice: number;
  discount: number;
  tax: number;
}) {
  return Math.round((line.quantity * line.purchasePrice - line.discount + line.tax) * 100) / 100;
}

export default function PurchaseForm({
  mode,
  purchaseId,
}: PurchaseFormProps) {
  const dispatch = useDispatch();

  // --------------------------------------------------
  // Data
  // --------------------------------------------------

  const {
    data: suppliers = [],
    isLoading: isSuppliersLoading,
  } = useGetSuppliersQuery();

  const {
    data: products = [],
    isLoading: isProductsLoading,
  } = useGetProductsQuery();

  // --------------------------------------------------
  // Existing purchase for edit mode
  // --------------------------------------------------

  const {
    data: purchase,
    isLoading: isPurchaseLoading,
  } = useGetPurchaseQuery(purchaseId ?? 0, {
    skip:
      mode !== "edit" ||
      purchaseId === undefined,
  });

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  const [createPurchase, { isLoading: isCreating }] =
    useCreatePurchaseMutation();

  const [updatePurchase, { isLoading: isUpdating }] =
    useUpdatePurchaseMutation();

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  const [purchaseError, setPurchaseError] =
    useState("");
  const [sellingPriceInput, setSellingPriceInput] =
    useState("");
  const getProductSellingPrice = (
    productId: number | string | undefined,
  ) => {
    const selectedProduct = products.find(
      (product) =>
        product.id === Number(productId),
    );

    const price = Number(
      selectedProduct?.sellingPrice ?? 0,
    );

    return price > 0 ? String(price) : "";
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  const isLoading =
    isCreating ||
    isUpdating ||
    isSuppliersLoading ||
    isProductsLoading ||
    isPurchaseLoading;

  useEffect(() => {
    if (mode === "edit" && purchase) {
      setSellingPriceInput(
        getProductSellingPrice(
          purchase.items?.[0]?.productId,
        ),
      );
      return;
    }

    if (mode === "create") {
      setSellingPriceInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, purchase, products]);

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setPurchaseError("");

    const formData = new FormData(
      event.currentTarget,
    );

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const supplierValue =
      formData.get("supplierId");

    const productValue =
      formData.get("productId");

    const quantityValue =
      formData.get("quantity");

    const purchasePriceValue =
      formData.get("purchasePrice");

    const discountValue =
      formData.get("discount");

    const taxValue =
      formData.get("tax");

    const expiryDateValue =
      formData.get("expiryDate");

    const supplierId =
      typeof supplierValue === "string"
        ? supplierValue
        : "";

    const productId =
      typeof productValue === "string"
        ? productValue
        : "";

    const quantity =
      typeof quantityValue === "string"
        ? quantityValue
        : "";

    const purchasePrice =
      typeof purchasePriceValue === "string"
        ? purchasePriceValue
        : "";

    const discount =
      typeof discountValue === "string"
        ? discountValue
        : "";

    const tax =
      typeof taxValue === "string"
        ? taxValue
        : "";

    const expiryDate =
      typeof expiryDateValue === "string"
        ? expiryDateValue
        : "";

    // Purchases are paid in full: quantity × price − discount + tax
    const paidAmount = purchaseTotal({
      quantity: Number(quantity) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
    });

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!productId) {
      setPurchaseError(
        "Product is required.",
      );
      return;
    }

    if (
      !quantity ||
      Number(quantity) <= 0
    ) {
      setPurchaseError(
        "Quantity must be greater than 0.",
      );
      return;
    }

    if (
      purchasePrice === "" ||
      Number(purchasePrice) < 0
    ) {
      setPurchaseError(
        "Purchase price must be 0 or greater.",
      );
      return;
    }

    const sellingPrice =
      sellingPriceInput.trim() === ""
        ? undefined
        : Number(sellingPriceInput);

    if (
      sellingPrice !== undefined &&
      (!Number.isFinite(sellingPrice) ||
        sellingPrice < 0)
    ) {
      setPurchaseError(
        "Selling price must be 0 or greater.",
      );
      return;
    }

    if (Number(discount || 0) < 0) {
      setPurchaseError(
        "Discount cannot be negative.",
      );
      return;
    }

    if (Number(tax || 0) < 0) {
      setPurchaseError(
        "Tax cannot be negative.",
      );
      return;
    }

    if (
      !Number.isFinite(
        paidAmount,
      ) ||
      paidAmount < 0
    ) {
      setPurchaseError(
        "The discount can't be more than the purchase amount.",
      );
      return;
    }

    // --------------------------------------------------
    // Purchase item
    // --------------------------------------------------

    const item = {
      productId: Number(productId),
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      ...(sellingPrice !== undefined && {
        sellingPrice,
      }),
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      expiryDate: expiryDate || null,
    };

    try {
      // ==============================================
      // CREATE PURCHASE
      // ==============================================

      if (mode === "create") {
        await createPurchase({
          // Optional: no supplier picked records it without one
          supplierId: supplierId ? Number(supplierId) : null,
          // Discount / tax are on the item, so not repeated here
          discount: 0,
          tax: 0,
          // Paid in full; record-only, so the server books it as cash
          paidAmount,
          items: [item],
        }).unwrap();

        dispatch(
          closeCreatePurchase(),
        );

        return;
      }

      // ==============================================
      // UPDATE PURCHASE
      // ==============================================

      if (purchaseId === undefined) {
        setPurchaseError(
          "Purchase ID is missing.",
        );
        return;
      }

      await updatePurchase({
        id: purchaseId,
        supplierId: supplierId ? Number(supplierId) : null,
        discount: 0,
        tax: 0,
        paidAmount,
        // Keep how an existing purchase was paid; new payments are cash
        paymentMethod:
          paidAmount > 0
            ? (purchase?.paymentMethod ?? undefined)
            : undefined,
        accountId:
          paidAmount > 0
            ? (purchase?.accountId ?? null)
            : null,
        items: [item],
      }).unwrap();

      dispatch(
        closeEditPurchase(),
      );
    } catch (error: unknown) {
      console.error(
        mode === "create"
          ? "Failed to create purchase:"
          : "Failed to update purchase:",
        error,
      );

      if (
        typeof error === "object" &&
        error !== null &&
        "data" in error
      ) {
        const apiError = error as {
          data?: {
            message?: string;
          };
        };

        if (apiError.data?.message) {
          setPurchaseError(
            apiError.data.message,
          );
          return;
        }
      }

      setPurchaseError(
        mode === "create"
          ? "Something went wrong while creating the purchase."
          : "Something went wrong while updating the purchase.",
      );
    }
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (mode === "create") {
      dispatch(
        closeCreatePurchase(),
      );
    } else {
      dispatch(
        closeEditPurchase(),
      );
    }
  };

  // --------------------------------------------------
  // Loading purchase in edit mode
  // --------------------------------------------------

  if (
    mode === "edit" &&
    isPurchaseLoading
  ) {
    return (
      <div className="p-6 text-center">
        Loading purchase...
      </div>
    );
  }

  // --------------------------------------------------
  // Purchase not found
  // --------------------------------------------------

  if (
    mode === "edit" &&
    purchaseId !== undefined &&
    !purchase
  ) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load purchase.
      </div>
    );
  }

  // --------------------------------------------------
  // Loading suppliers/products
  // --------------------------------------------------

  if (
    isSuppliersLoading ||
    isProductsLoading
  ) {
    return (
      <div className="p-6 text-center">
        Loading suppliers and products...
      </div>
    );
  }

  // --------------------------------------------------
  // Existing item for edit mode
  // --------------------------------------------------

  const existingItem =
    purchase?.items?.[0];

  // --------------------------------------------------
  // Form
  // --------------------------------------------------

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      {/* ========================================
          FORM CONTENT
      ======================================== */}

      <div className="p-5 max-h-[60vh] overflow-y-auto">

        {/* ========================================
            SUPPLIER
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="supplierId"
            className="text-sm font-medium mb-2"
          >
            Supplier{" "}
            <span className="text-[#8A94A3] font-normal">
              (optional)
            </span>
          </label>

          <select
            id="supplierId"
            name="supplierId"
            defaultValue={
              mode === "edit"
                ? String(
                    purchase?.supplierId ?? "",
                  )
                : ""
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            disabled={isLoading}
          >
            <option value="">
              No supplier
            </option>

            {suppliers.map(
              (supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name}
                </option>
              ),
            )}
          </select>
        </div>

        {/* ========================================
            PRODUCT
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="productId"
            className="text-sm font-medium mb-2"
          >
            Product{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            id="productId"
            name="productId"
            defaultValue={
              mode === "edit"
                ? String(
                    existingItem?.productId ??
                      "",
                  )
                : ""
            }
            onChange={(event) =>
              setSellingPriceInput(
                getProductSellingPrice(
                  event.target.value,
                ),
              )
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={isLoading}
          >
            <option value="">
              Select product
            </option>

            {products.map(
              (product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.productName}
                </option>
              ),
            )}
          </select>
        </div>

        {/* ========================================
            QUANTITY
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="quantity"
            className="text-sm font-medium mb-2"
          >
            Quantity{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={
              mode === "edit"
                ? String(
                    existingItem?.quantity ??
                      "",
                  )
                : ""
            }
            placeholder="Enter quantity"
            inputMode="numeric"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            PURCHASE PRICE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="purchasePrice"
            className="text-sm font-medium mb-2"
          >
            Purchase Price{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              mode === "edit"
                ? String(
                    existingItem?.purchasePrice ??
                      "",
                  )
                : ""
            }
            placeholder="Enter purchase price"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            SELLING PRICE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="sellingPrice"
            className="text-sm font-medium mb-2"
          >
            Selling Price{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            value={sellingPriceInput}
            onChange={(event) =>
              setSellingPriceInput(
                event.target.value,
              )
            }
            placeholder="Enter selling price"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            DISCOUNT
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="discount"
            className="text-sm font-medium mb-2"
          >
            Discount
          </label>

          <input
            id="discount"
            name="discount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              mode === "edit"
                ? String(
                    existingItem?.discount ??
                      "",
                  )
                : ""
            }
            placeholder="Enter discount"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            TAX
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="tax"
            className="text-sm font-medium mb-2"
          >
            Tax
          </label>

          <input
            id="tax"
            name="tax"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              mode === "edit"
                ? String(
                    existingItem?.tax ??
                      "",
                  )
                : ""
            }
            placeholder="Enter tax"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            EXPIRY DATE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="expiryDate"
            className="text-sm font-medium mb-2"
          >
            Expiry Date
          </label>

          <input
            id="expiryDate"
            name="expiryDate"
            type="date"
            defaultValue={
              mode === "edit"
                ? existingItem?.stockBatch
                    ?.expiryDate
                  ? existingItem.stockBatch.expiryDate.slice(
                      0,
                      10,
                    )
                  : ""
                : ""
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {purchaseError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {purchaseError}
        </p>
      )}

      {/* ========================================
          FOOTER
      ======================================== */}

      <hr className="border-t border-[#D1D5DB]" />

      <div className="flex items-center justify-end gap-2 px-5 py-4">

        {/* Cancel */}

        <button
          type="button"
          disabled={isLoading}
          onClick={handleClose}
          className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        {/* Submit */}

        <Button
          onClick={() => {}}
          name={
            isLoading
              ? mode === "create"
                ? "Creating..."
                : "Updating..."
              : mode === "create"
                ? "Create Purchase"
                : "Update Purchase"
          }
          type="submit"
        />
      </div>
    </form>
  );
};
