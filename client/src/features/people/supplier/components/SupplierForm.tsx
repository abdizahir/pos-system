import { type FormEvent, useState } from "react";
import { useDispatch } from "react-redux";

import Button from "../../../../components/Button";

import {
  useCreateSupplierMutation,
  useGetSupplierQuery,
  useUpdateSupplierMutation,
} from "../../../../api/api";

import {
  closeCreateSupplier,
  closeEditSupplier,
} from "../../../../store/posSlice";

type SupplierFormProps = {
  mode: "create" | "edit";
  supplierId?: number;
};

export default function SupplierForm({
  mode,
  supplierId,
}: SupplierFormProps) {
  const dispatch = useDispatch();

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  const [createSupplier, { isLoading: isCreating }] =
    useCreateSupplierMutation();

  const [updateSupplier, { isLoading: isUpdating }] =
    useUpdateSupplierMutation();

  // --------------------------------------------------
  // Existing supplier for edit mode
  // --------------------------------------------------

  const {
    data: supplier,
    isLoading: isSupplierLoading,
  } = useGetSupplierQuery(supplierId ?? 0, {
    skip: mode !== "edit" || supplierId === undefined,
  });

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  const [supplierError, setSupplierError] = useState("");

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  const isLoading =
    isCreating || isUpdating || isSupplierLoading;

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSupplierError("");

    const formData = new FormData(event.currentTarget);

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const nameValue = formData.get("name");
    const emailValue = formData.get("email");
    const phoneValue = formData.get("phone");
    const addressValue = formData.get("address");

    const name =
      typeof nameValue === "string"
        ? nameValue.trim()
        : "";

    const email =
      typeof emailValue === "string"
        ? emailValue.trim()
        : "";

    const phone =
      typeof phoneValue === "string"
        ? phoneValue.trim()
        : "";

    const address =
      typeof addressValue === "string"
        ? addressValue.trim()
        : "";

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!name) {
      setSupplierError("Supplier name is required.");
      return;
    }

    const payload = {
      name,
      email,
      phone,
      address,
    };

    try {
      // ==============================================
      // CREATE SUPPLIER
      // ==============================================

      if (mode === "create") {
        await createSupplier(payload).unwrap();

        dispatch(closeCreateSupplier());

        return;
      }

      // ==============================================
      // UPDATE SUPPLIER
      // ==============================================

      if (supplierId === undefined) {
        setSupplierError("Supplier ID is missing.");
        return;
      }

      await updateSupplier({
        id: supplierId,
        ...payload,
      }).unwrap();

      dispatch(closeEditSupplier());
    } catch (error: unknown) {
      console.error(
        mode === "create"
          ? "Failed to create supplier:"
          : "Failed to update supplier:",
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
          setSupplierError(apiError.data.message);
          return;
        }
      }

      setSupplierError(
        mode === "create"
          ? "Something went wrong while creating the supplier."
          : "Something went wrong while updating the supplier.",
      );
    }
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (mode === "create") {
      dispatch(closeCreateSupplier());
    } else {
      dispatch(closeEditSupplier());
    }
  };

  // --------------------------------------------------
  // Loading supplier
  // --------------------------------------------------

  if (mode === "edit" && isSupplierLoading) {
    return (
      <div className="p-6 text-center">
        Loading supplier...
      </div>
    );
  }

  // --------------------------------------------------
  // Supplier not found
  // --------------------------------------------------

  if (
    mode === "edit" &&
    supplierId !== undefined &&
    !supplier
  ) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load supplier.
      </div>
    );
  }

  // --------------------------------------------------
  // Form
  // --------------------------------------------------

  return (
    <form autoComplete="off" onSubmit={handleSubmit}>
      {/* ========================================
          FORM CONTENT
      ======================================== */}

      <div className="p-5 max-h-[60dvh] overflow-y-auto">
        {/* ========================================
            SUPPLIER NAME
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="name"
            className="text-sm font-medium mb-2"
          >
            Supplier <span className="text-red-500">*</span>
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter supplier name"
            defaultValue={
              mode === "edit"
                ? (supplier?.name ?? "")
                : ""
            }
            autoComplete="off"
            autoFocus
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
          />
        </div>

        {/* ========================================
            EMAIL
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="email"
            className="text-sm font-medium mb-2"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter email address"
            defaultValue={
              mode === "edit"
                ? (supplier?.email ?? "")
                : ""
            }
            autoComplete="off"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
          />
        </div>

        {/* ========================================
            PHONE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="phone"
            className="text-sm font-medium mb-2"
          >
            Phone
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            defaultValue={
              mode === "edit"
                ? (supplier?.phone ?? "")
                : ""
            }
            autoComplete="off"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
          />
        </div>

        {/* ========================================
            ADDRESS
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="address"
            className="text-sm font-medium mb-2"
          >
            Address
          </label>

          <input
            id="address"
            name="address"
            type="text"
            placeholder="Enter supplier address"
            defaultValue={
              mode === "edit"
                ? (supplier?.address ?? "")
                : ""
            }
            autoComplete="off"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {supplierError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {supplierError}
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
                ? "Add Supplier"
                : "Update Supplier"
          }
          type="submit"
        />
      </div>
    </form>
  );
}