import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";

import Button from "../../../components/Button";

import {
  useGetAccountQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
} from "../../../api/api";

import {
  closeCreateAccounts,
  closeEditAccounts,
} from "../../../store/posSlice";

type AccountsFormProps = {
  mode: "create" | "edit";
  accountId?: number;
};

type AccountType = "BANK" | "WALLET" | "MERCHANT";
type AccountStatus = "ACTIVE" | "INACTIVE";

export default function AccountsForm({
  mode,
  accountId,
}: AccountsFormProps) {
  const dispatch = useDispatch();

  // --------------------------------------------------
  // Existing account for edit mode
  // --------------------------------------------------

  const {
    data: account,
    isLoading: isAccountLoading,
  } = useGetAccountQuery(accountId ?? 0, {
    skip: mode !== "edit" || accountId === undefined,
  });

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  const [createAccount, { isLoading: isCreating }] =
    useCreateAccountMutation();

  const [updateAccount, { isLoading: isUpdating }] =
    useUpdateAccountMutation();

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  const [accountError, setAccountError] = useState("");

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  const isLoading =
    isCreating || isUpdating || isAccountLoading;

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setAccountError("");

    const formData = new FormData(event.currentTarget);

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const bankNameValue = formData.get("bankName");
    const nameValue = formData.get("name");
    const numberValue = formData.get("number");
    const typeValue = formData.get("type");
    const statusValue = formData.get("status");

    const bankName =
      typeof bankNameValue === "string"
        ? bankNameValue
        : "";

    const name =
      typeof nameValue === "string"
        ? nameValue
        : "";

    const number =
      typeof numberValue === "string"
        ? numberValue
        : "";

    const type =
      typeof typeValue === "string"
        ? typeValue
        : "";

    const status =
      typeof statusValue === "string"
        ? statusValue
        : "";

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!bankName.trim()) {
      setAccountError("Bank name is required.");
      return;
    }

    if (!name.trim()) {
      setAccountError("Account name is required.");
      return;
    }

    if (!number.trim()) {
      setAccountError("Account number is required.");
      return;
    }

    if (type !== "BANK" && type !== "WALLET" && type !== "MERCHANT") {
      setAccountError("Please select a valid account type.");
      return;
    }

    if (status !== "ACTIVE" && status !== "INACTIVE") {
      setAccountError("Please select a valid account status.");
      return;
    }

    // --------------------------------------------------
    // Account data
    // --------------------------------------------------

    const accountData = {
      bankName: bankName.trim(),

      name: name.trim(),

      // Keep account number as STRING.
      // This preserves leading zeros.
      number: number.trim(),

      type: type as AccountType,

      status: status as AccountStatus,
    };

    try {
      // ==============================================
      // CREATE ACCOUNT
      // ==============================================

      if (mode === "create") {
        await createAccount(accountData).unwrap();

        dispatch(closeCreateAccounts());

        return;
      }

      // ==============================================
      // UPDATE ACCOUNT
      // ==============================================

      if (accountId === undefined) {
        setAccountError("Account ID is missing.");
        return;
      }

      await updateAccount({
        id: accountId,
        ...accountData,
      }).unwrap();

      dispatch(closeEditAccounts());
    } catch (error: unknown) {
      console.error(
        mode === "create"
          ? "Failed to create account:"
          : "Failed to update account:",
        error
      );

      // ----------------------------------------------
      // API error
      // ----------------------------------------------

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
          setAccountError(apiError.data.message);
          return;
        }
      }

      // ----------------------------------------------
      // Default error
      // ----------------------------------------------

      setAccountError(
        mode === "create"
          ? "Something went wrong while creating the account."
          : "Something went wrong while updating the account."
      );
    }
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (mode === "create") {
      dispatch(closeCreateAccounts());
    } else {
      dispatch(closeEditAccounts());
    }
  };

  // --------------------------------------------------
  // Loading account in edit mode
  // --------------------------------------------------

  if (mode === "edit" && isAccountLoading) {
    return (
      <div className="p-6 text-center">
        Loading account...
      </div>
    );
  }

  // --------------------------------------------------
  // Account not found
  // --------------------------------------------------

  if (
    mode === "edit" &&
    accountId !== undefined &&
    !account
  ) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load account.
      </div>
    );
  }

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
            BANK NAME
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="bankName"
            className="text-sm font-medium mb-2"
          >
            Bank Name <span className="text-red-500">*</span>
          </label>

          <input
            id="bankName"
            name="bankName"
            type="text"
            defaultValue={
              mode === "edit"
                ? (account?.bankName ?? "")
                : ""
            }
            placeholder="Enter bank name"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            ACCOUNT NAME
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="name"
            className="text-sm font-medium mb-2"
          >
            Account Name <span className="text-red-500">*</span>
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={
              mode === "edit"
                ? (account?.name ?? "")
                : ""
            }
            placeholder="Enter account name"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            ACCOUNT NUMBER
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="number"
            className="text-sm font-medium mb-2"
          >
            Account Number <span className="text-red-500">*</span>
          </label>

          <input
            id="number"
            name="number"
            type="text"
            inputMode="numeric"
            defaultValue={
              mode === "edit"
                ? (account?.number ?? "")
                : ""
            }
            placeholder="Enter account number"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />

          <p className="mt-1 text-xs text-gray-500">
            Account number is stored as text to preserve
            leading zeros.
          </p>
        </div>

        {/* ========================================
            ACCOUNT TYPE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="type"
            className="text-sm font-medium mb-2"
          >
            Account Type <span className="text-red-500">*</span>
          </label>

          <select
            id="type"
            name="type"
            defaultValue={
              mode === "edit"
                ? (account?.type ?? "")
                : ""
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={isLoading}
          >
            <option value="">
              Select account type
            </option>

            <option value="BANK">
              Bank
            </option>

            <option value="WALLET">
              Wallet
            </option>

            <option value="MERCHANT">
              Merchant
            </option>
          </select>
        </div>

        {/* ========================================
            STATUS
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="status"
            className="text-sm font-medium mb-2"
          >
            Status <span className="text-red-500">*</span>
          </label>

          <select
            id="status"
            name="status"
            defaultValue={
              mode === "edit"
                ? (account?.status ?? "ACTIVE")
                : "ACTIVE"
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={isLoading}
          >
            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {accountError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {accountError}
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
                ? "Create Account"
                : "Update Account"
          }
          type="submit"
        />
      </div>
    </form>
  );
}