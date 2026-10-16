import { type FormEvent, useState } from "react";
import { useDispatch } from "react-redux";

import Button from "../../../../components/Button";

import {
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
} from "../../../../api/api";

import {
  closeCreateCustomer,
  closeEditCustomer,
} from "../../../../store/posSlice";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: number;
};

export default function CustomerForm({
  mode,
  customerId,
}: CustomerFormProps) {
  const dispatch = useDispatch();

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  const [createCustomer, { isLoading: isCreating }] =
    useCreateCustomerMutation();

  const [updateCustomer, { isLoading: isUpdating }] =
    useUpdateCustomerMutation();

  // --------------------------------------------------
  // Existing customer for edit mode
  // --------------------------------------------------

  const {
    data: customer,
    isLoading: isCustomerLoading,
  } = useGetCustomerQuery(customerId ?? 0, {
    skip: mode !== "edit" || customerId === undefined,
  });

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  const [customerError, setCustomerError] = useState("");

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  const isLoading =
    isCreating || isUpdating || isCustomerLoading;

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setCustomerError("");

    const formData = new FormData(event.currentTarget);

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const fnameValue = formData.get("fname");
    const lnameValue = formData.get("lname");
    const phoneValue = formData.get("phone");
    const addressValue = formData.get("address");

    const fname =
      typeof fnameValue === "string"
        ? fnameValue.trim()
        : "";

    const lname =
      typeof lnameValue === "string"
        ? lnameValue.trim()
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

    if (!fname) {
      setCustomerError("First name is required.");
      return;
    }

    if (!lname) {
      setCustomerError("Last name is required.");
      return;
    }

    if (!phone) {
      setCustomerError("Phone number is required.");
      return;
    }

    const payload = {
      fname,
      lname,
      phone,
      address,
    };

    try {
      // ==============================================
      // CREATE CUSTOMER
      // ==============================================

      if (mode === "create") {
        await createCustomer(payload).unwrap();

        dispatch(closeCreateCustomer());

        return;
      }

      // ==============================================
      // UPDATE CUSTOMER
      // ==============================================

      if (customerId === undefined) {
        setCustomerError("Customer ID is missing.");
        return;
      }

      await updateCustomer({
        id: customerId,
        ...payload,
      }).unwrap();

      dispatch(closeEditCustomer());
    } catch (error: unknown) {
      console.error(
        mode === "create"
          ? "Failed to create customer:"
          : "Failed to update customer:",
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
          setCustomerError(apiError.data.message);
          return;
        }
      }

      setCustomerError(
        mode === "create"
          ? "Something went wrong while creating the customer."
          : "Something went wrong while updating the customer.",
      );
    }
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (mode === "create") {
      dispatch(closeCreateCustomer());
    } else {
      dispatch(closeEditCustomer());
    }
  };

  // --------------------------------------------------
  // Loading customer
  // --------------------------------------------------

  if (mode === "edit" && isCustomerLoading) {
    return (
      <div className="p-6 text-center">
        Loading customer...
      </div>
    );
  }

  // --------------------------------------------------
  // Customer not found
  // --------------------------------------------------

  if (
    mode === "edit" &&
    customerId !== undefined &&
    !customer
  ) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load customer.
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
            FIRST NAME
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="fname"
            className="text-sm font-medium mb-2"
          >
            First Name <span className="text-red-500">*</span>
          </label>

          <input
            id="fname"
            name="fname"
            type="text"
            placeholder="Enter first name"
            defaultValue={
              mode === "edit"
                ? (customer?.fname ?? "")
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
            LAST NAME
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="lname"
            className="text-sm font-medium mb-2"
          >
            Last Name <span className="text-red-500">*</span>
          </label>

          <input
            id="lname"
            name="lname"
            type="text"
            placeholder="Enter last name"
            defaultValue={
              mode === "edit"
                ? (customer?.lname ?? "")
                : ""
            }
            autoComplete="off"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
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
            Phone <span className="text-red-500">*</span>
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            defaultValue={
              mode === "edit"
                ? (customer?.phone ?? "")
                : ""
            }
            autoComplete="off"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
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
            placeholder="Enter customer address"
            defaultValue={
              mode === "edit"
                ? (customer?.address ?? "")
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

      {customerError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {customerError}
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
                ? "Add Customer"
                : "Update Customer"
          }
          type="submit"
        />
      </div>
    </form>
  );
}