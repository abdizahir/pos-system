import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";

import Button from "../../../components/Button";
import {
  useCreateMoneyTransferMutation,
  useGetAccountsQuery,
} from "../../../api/api";
import { closeCreateMoneyTransfer } from "../../../store/posSlice";

export default function MoneyTransferForm() {
  const dispatch = useDispatch();

  const {
    data: accounts = [],
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useGetAccountsQuery();

  const [transferError, setTransferError] =
    useState("");
  const [createMoneyTransfer, { isLoading }] =
    useCreateMoneyTransferMutation();

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setTransferError("");

    const formData = new FormData(event.currentTarget);

    const fromAccountId = Number(
      formData.get("fromAccountId")
    );
    const toAccountId = Number(
      formData.get("toAccountId")
    );
    const amount = Number(formData.get("amount"));

    if (!Number.isFinite(fromAccountId)) {
      setTransferError(
        "Please select the from account."
      );
      return;
    }

    if (!Number.isFinite(toAccountId)) {
      setTransferError(
        "Please select the to account."
      );
      return;
    }

    if (fromAccountId === toAccountId) {
      setTransferError(
        "From account and to account must be different."
      );
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError(
        "Amount must be greater than 0."
      );
      return;
    }

    const fromAccount = accounts.find(
      (account) => account.id === fromAccountId
    );
    const toAccount = accounts.find(
      (account) => account.id === toAccountId
    );

    if (!fromAccount || !toAccount) {
      setTransferError(
        "Unable to find selected account details."
      );
      return;
    }

    try {
      await createMoneyTransfer({
        fromAccountId,
        toAccountId,
        amount,
      }).unwrap();

      dispatch(closeCreateMoneyTransfer());
    } catch (error: unknown) {
      console.error(
        "Failed to create money transfer:",
        error
      );

      if (
        typeof error === "object" &&
        error !== null &&
        "data" in error
      ) {
        const apiError = error as {
          data?: { message?: string };
        };

        if (apiError.data?.message) {
          setTransferError(apiError.data.message);
          return;
        }
      }

      setTransferError(
        "Something went wrong while creating the transfer."
      );
    }
  };

  if (isAccountsLoading) {
    return (
      <div className="p-6 text-center">
        Loading accounts...
      </div>
    );
  }

  if (isAccountsError) {
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load accounts for transfer.
      </div>
    );
  }

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <div className="max-h-[60vh] overflow-y-auto p-5">
        <div className="mb-4 flex flex-col items-start">
          <label
            htmlFor="fromAccountId"
            className="mb-2 text-sm font-medium"
          >
            From Account{" "}
            <span className="text-red-500">*</span>
          </label>

          <select
            id="fromAccountId"
            name="fromAccountId"
            defaultValue=""
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-[#FE9F43]"
            required
            disabled={isLoading}
          >
            <option value="" disabled>
              Select from account
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-col items-start">
          <label
            htmlFor="toAccountId"
            className="mb-2 text-sm font-medium"
          >
            To Account{" "}
            <span className="text-red-500">*</span>
          </label>

          <select
            id="toAccountId"
            name="toAccountId"
            defaultValue=""
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-[#FE9F43]"
            required
            disabled={isLoading}
          >
            <option value="" disabled>
              Select to account
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-col items-start">
          <label
            htmlFor="amount"
            className="mb-2 text-sm font-medium"
          >
            Amount <span className="text-red-500">*</span>
          </label>

          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-[#FE9F43]"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {transferError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {transferError}
        </p>
      )}

      <hr className="border-t border-[#D1D5DB]" />

      <div className="flex items-center justify-end gap-2 px-5 py-4">
        <button
          type="button"
          onClick={() =>
            dispatch(closeCreateMoneyTransfer())
          }
          disabled={isLoading}
          className="cursor-pointer rounded-md bg-gray-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <Button
          onClick={() => {}}
          name={
            isLoading
              ? "Creating..."
              : "Create Transfer"
          }
          type="submit"
        />
      </div>
    </form>
  );
}