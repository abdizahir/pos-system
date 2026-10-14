import { type FormEvent, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import Select from "react-select";

import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetCategoriesQuery,
  useGetUnitsQuery,
  useGetProductQuery,
} from "../../../api/api";

import Button from "../../../components/Button";
import { closeProductForm } from "../../../store/posSlice";

type SelectOption = {
  value: number;
  label: string;
};

type ProductFormData = {
  productName: string;
  barcode?: string;
  categoryId: number;
  unitId: number;
  lowStockLimit: number;
  vat: number;
  sellingPrice?: number;
  purchasePrice?: number;
  initialQuantity?: number;
};

type ProductFormProps = {
  productId?: number | null;
};

export default function ProductForm({
  productId,
}: ProductFormProps) {
  const dispatch = useDispatch();

  const editingId = productId ?? undefined;
  const isEditing =
    editingId !== undefined && Number.isInteger(editingId);

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------

  const [createProduct, { isLoading: isCreating }] =
    useCreateProductMutation();

  const [updateProduct, { isLoading: isUpdating }] =
    useUpdateProductMutation();

  const { data: categoriesResponse = [], isLoading: isCategoriesLoading } =
    useGetCategoriesQuery();

  const { data: unitsResponse = [], isLoading: isUnitsLoading } =
    useGetUnitsQuery();

  const {
    data: product,
    isLoading: isProductLoading,
  } = useGetProductQuery(editingId ?? 0, {
    skip: !isEditing,
  });

  // ----------------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------------

  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] =
    useState<SelectOption | null>(null);
  const [unit, setUnit] =
    useState<SelectOption | null>(null);

  const [lowStockLimit, setLowStockLimit] = useState("");

  const [sellingPrice, setSellingPrice] = useState("");

  // Create only: stock the shop already has when adding the product
  const [purchasePrice, setPurchasePrice] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("");

  const [vat, setVat] =
    useState<SelectOption | null>(null);

  // ----------------------------------------------------------
  // OPTIONS
  // ----------------------------------------------------------

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categoriesResponse.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [categoriesResponse],
  );

  const unitOptions = useMemo<SelectOption[]>(
    () =>
      unitsResponse.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [unitsResponse],
  );

  const vatOptions: SelectOption[] = [
    {
      value: 0,
      label: "0%",
    },
    {
      value: 15,
      label: "15%",
    },
  ];

  // ----------------------------------------------------------
  // EDIT VALUES
  // ----------------------------------------------------------
  //
  // Instead of useEffect + setState, use the fetched product
  // as fallback values.
  //
  // This avoids the React 19 set-state-in-effect warning.
  // ----------------------------------------------------------

  const productNameValue =
    productName ||
    (product ? product.productName : "");

  const barcodeValue =
    barcode ||
    (product?.barcode ?? "");

  const lowStockLimitValue =
    lowStockLimit ||
    (product ? String(product.lowStockLimit) : "");

  const sellingPriceValue =
    sellingPrice ||
    (product ? String(Number(product.sellingPrice ?? 0)) : "");

  const selectedCategory =
    category ??
    (product
      ? {
          value: product.category.id,
          label: product.category.name,
        }
      : null);

  const selectedUnit =
    unit ??
    (product
      ? {
          value: product.unit.id,
          label: product.unit.name,
        }
      : null);

  const selectedVat =
    vat ??
    (product
      ? {
          value: Number(product.vat ?? 0),
          label: `${Number(product.vat ?? 0)}%`,
        }
      : null);

  // ----------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!selectedCategory) {
      alert("Please select a category.");
      return;
    }

    if (!selectedUnit) {
      alert("Please select a unit.");
      return;
    }

    const trimmedProductName =
      productNameValue.trim();

    if (!trimmedProductName) {
      alert("Product name is required.");
      return;
    }

    const lowStockLimitNumber =
      Number(lowStockLimitValue || 0);

    if (
      !Number.isInteger(lowStockLimitNumber) ||
      lowStockLimitNumber < 0
    ) {
      alert("Please enter a valid low stock limit.");
      return;
    }

    const sellingPriceNumber = Number(sellingPriceValue || 0);

    if (!Number.isFinite(sellingPriceNumber) || sellingPriceNumber < 0) {
      alert("Please enter a valid selling price.");
      return;
    }

    const quantityNumber = Number(initialQuantity || 0);
    const purchasePriceNumber = Number(purchasePrice || 0);

    if (!isEditing) {
      if (!Number.isInteger(quantityNumber) || quantityNumber < 0) {
        alert("Initial quantity must be a whole number.");
        return;
      }

      if (!Number.isFinite(purchasePriceNumber) || purchasePriceNumber < 0) {
        alert("Please enter a valid purchase price.");
        return;
      }

      if (quantityNumber > 0 && purchasePrice.trim() === "") {
        alert("Enter the purchase price for the initial quantity.");
        return;
      }
    }

    const payload: ProductFormData = {
      productName: trimmedProductName,

      barcode:
        barcodeValue.trim() || undefined,

      categoryId:
        selectedCategory.value,

      unitId:
        selectedUnit.value,

      lowStockLimit:
        lowStockLimitNumber,

      vat:
        selectedVat?.value ?? 0,

      sellingPrice: sellingPriceNumber,

      ...(isEditing
        ? {}
        : {
            purchasePrice: purchasePriceNumber,
            initialQuantity: quantityNumber,
          }),
    };

    try {
      if (isEditing && editingId) {
        await updateProduct({
          id: editingId,
          ...payload,
        }).unwrap();
      } else {
        await createProduct(payload).unwrap();
      }

      dispatch(closeProductForm());
    } catch (error) {
      console.error("Product save error:", error);
      const message = (error as { data?: { message?: string } })?.data
        ?.message;
      alert(message || "Failed to save product.");
    }
  };

  const isLoading =
    isCreating ||
    isUpdating ||
    isProductLoading;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <div className="p-5">

        {/* PRODUCT NAME + SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">

          <div className="flex flex-col gap-2">
            <label
              htmlFor="productName"
              className="text-sm font-medium"
            >
              Product Name{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              id="productName"
              type="text"
              value={productNameValue}
              onChange={(e) =>
                setProductName(e.target.value)
              }
              placeholder="Enter product name"
              className="border border-gray-300 rounded-md px-3 py-2 outline-0"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="sku"
              className="text-sm font-medium"
            >
              SKU
            </label>

            <input
              id="sku"
              type="text"
              value={product?.sku ?? ""}
              disabled
              placeholder="Generated automatically"
              className="border border-gray-300 rounded-md px-3 py-2 bg-gray-100 outline-0"
            />
          </div>

        </div>

        {/* BARCODE + CATEGORY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">

          <div className="flex flex-col gap-2">
            <label
              htmlFor="barcode"
              className="text-sm font-medium"
            >
              Barcode
            </label>

            <input
              id="barcode"
              type="text"
              value={barcodeValue}
              onChange={(e) =>
                setBarcode(e.target.value)
              }
              placeholder="Enter barcode"
              className="border border-gray-300 rounded-md px-3 py-2 outline-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="category"
              className="text-sm font-medium"
            >
              Category{" "}
              <span className="text-red-500">*</span>
            </label>

            <Select<SelectOption>
              inputId="category"
              value={selectedCategory}
              onChange={(option) =>
                setCategory(option)
              }
              options={categoryOptions}
              placeholder="Select Category"
              isSearchable
              isLoading={isCategoriesLoading}
              isDisabled={isLoading}
              noOptionsMessage={() =>
                "No categories found"
              }
              menuPortalTarget={
                typeof document !== "undefined"
                  ? document.body
                  : null
              }
              menuPosition="fixed"
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

        </div>

        {/* UNIT + LOW STOCK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">

          <div className="flex flex-col gap-2">
            <label
              htmlFor="unit"
              className="text-sm font-medium"
            >
              Unit{" "}
              <span className="text-red-500">*</span>
            </label>

            <Select<SelectOption>
              inputId="unit"
              value={selectedUnit}
              onChange={(option) =>
                setUnit(option)
              }
              options={unitOptions}
              placeholder="Select Unit"
              isSearchable
              isLoading={isUnitsLoading}
              isDisabled={isLoading}
              noOptionsMessage={() =>
                "No units found"
              }
              menuPortalTarget={
                typeof document !== "undefined"
                  ? document.body
                  : null
              }
              menuPosition="fixed"
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="lowStockLimit"
              className="text-sm font-medium"
            >
              Low Stock Limit
            </label>

            <input
              id="lowStockLimit"
              type="number"
              min="0"
              step="1"
              value={lowStockLimitValue}
              onChange={(e) =>
                setLowStockLimit(
                  e.target.value,
                )
              }
              placeholder="0"
              className="border border-gray-300 rounded-md px-3 py-2 outline-0"
            />
          </div>

        </div>

        {/* Add: purchase price, selling price, initial quantity, VAT
            Edit: selling price, VAT (stock changes go through
            purchases or Adjust Stock) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-4 mb-4">

          {!isEditing && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="purchasePrice"
                className="text-sm font-medium"
              >
                Purchase Price
              </label>

              <input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={purchasePrice}
                onChange={(e) =>
                  setPurchasePrice(e.target.value)
                }
                placeholder="0.00"
                className="border border-gray-300 rounded-md px-3 py-2 outline-0"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="sellingPrice"
              className="text-sm font-medium"
            >
              Selling Price
            </label>

            <input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={sellingPriceValue}
              onChange={(e) =>
                setSellingPrice(e.target.value)
              }
              placeholder="0.00"
              className="border border-gray-300 rounded-md px-3 py-2 outline-0"
            />
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="initialQuantity"
                className="text-sm font-medium"
              >
                Initial Quantity
              </label>

              <input
                id="initialQuantity"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={initialQuantity}
                onChange={(e) =>
                  setInitialQuantity(e.target.value)
                }
                placeholder="0"
                className="border border-gray-300 rounded-md px-3 py-2 outline-0"
              />

              <p className="text-xs text-[#646B72]">
                Stock you already have. Leave empty for none.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="vat"
              className="text-sm font-medium"
            >
              VAT (%)
            </label>

            <Select<SelectOption>
              inputId="vat"
              value={selectedVat}
              onChange={(option) =>
                setVat(option)
              }
              options={vatOptions}
              placeholder="Select VAT"
              isSearchable={false}
              isClearable
              isDisabled={isLoading}
              menuPortalTarget={
                typeof document !== "undefined"
                  ? document.body
                  : null
              }
              menuPosition="fixed"
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

        </div>

        {/* BUTTONS */}
        <div className="flex items-end justify-end gap-2">

          <button
            type="button"
            disabled={isLoading}
            className="px-3.5 py-1.75 rounded-md bg-text-one text-white cursor-pointer disabled:opacity-50"
            onClick={() => dispatch(closeProductForm())}
          >
            Cancel
          </button>

          <Button
            name={
              isLoading
                ? "Saving..."
                : isEditing
                  ? "Update"
                  : "Save"
            }
            type="submit"
            onClick={() => {}}
          />

        </div>
      </div>
    </form>
  );
}