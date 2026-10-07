import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";

import Button from "../../../components/Button";

import {
  useGetAccountsQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "../../../api/api";
import {
  closeCreateExpenses,
  closeEditExpenses,
} from "../../../store/posSlice";

type ExpenseFormProps = {
  mode: "create" | "edit";
  expenseId?: number;
};

type PaymentMethod = "" | "CASH" | "CARD" | "MOBILE" | "BANK";

export default function ExpenseForm({ mode, expenseId }: ExpenseFormProps) {
  const dispatch = useDispatch();

  // --------------------------------------------------
  // Existing expense for edit mode
  // --------------------------------------------------

  const { data: expense, isLoading: isExpenseLoading } = useGetExpenseQuery(
    expenseId ?? 0,
    {
      skip: mode !== "edit" || expenseId === undefined,
    },
  );

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();

  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();

  const { data: accounts = [] } = useGetAccountsQuery();

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  const [expenseError, setExpenseError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const bankAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.type === "BANK" && account.status === "ACTIVE",
      ),
    [accounts],
  );

  const walletAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => (account.type === "WALLET" || account.type === "MERCHANT") && account.status === "ACTIVE",
      ),
    [accounts],
  );

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  const isLoading = isCreating || isUpdating || isExpenseLoading;

  useEffect(() => {
    if (mode === "edit" && expense) {
      setPaymentMethod(expense.paymentMethod);
      setSelectedAccountId(expense.accountId ?? null);
      return;
    }

    if (mode === "create") {
      setPaymentMethod("");
      setSelectedAccountId(null);
    }
  }, [expense, mode]);

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setExpenseError("");

    const formData = new FormData(event.currentTarget);

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const titleValue = formData.get("title");
    const categoryValue = formData.get("category");
    const amountValue = formData.get("amount");
    const dateValue = formData.get("date");
    const referenceValue = formData.get("reference");
    const notesValue = formData.get("notes");

    const title = typeof titleValue === "string" ? titleValue : "";

    const category = typeof categoryValue === "string" ? categoryValue : "";

    const amount = typeof amountValue === "string" ? amountValue : "";

    const date = typeof dateValue === "string" ? dateValue : "";

    const reference = typeof referenceValue === "string" ? referenceValue : "";

    const notes = typeof notesValue === "string" ? notesValue : "";

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!title.trim()) {
      setExpenseError("Expense title is required.");
      return;
    }

    if (!category.trim()) {
      setExpenseError("Expense category is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setExpenseError("Amount must be greater than 0.");
      return;
    }

    if (!date) {
      setExpenseError("Expense date is required.");
      return;
    }

    if (
      paymentMethod !== "CASH" &&
      paymentMethod !== "CARD" &&
      paymentMethod !== "MOBILE" &&
      paymentMethod !== "BANK"
    ) {
      setExpenseError("Please select a valid payment method.");
      return;
    }

    if (paymentMethod !== "CASH" && selectedAccountId === null) {
      setExpenseError(
        `Please select a ${
          paymentMethod === "MOBILE" ? "wallet or merchant" : "bank account"
        }.`,
      );
      return;
    }

    // --------------------------------------------------
    // Expense data
    // --------------------------------------------------

    const expenseData = {
      title: title.trim(),
      category: category.trim(),
      amount: Number(amount),
      date,
      paymentMethod,
      accountId: paymentMethod === "CASH" ? null : selectedAccountId,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      // ==============================================
      // CREATE EXPENSE
      // ==============================================

      if (mode === "create") {
        await createExpense(expenseData).unwrap();

        dispatch(closeCreateExpenses());

        return;
      }

      // ==============================================
      // UPDATE EXPENSE
      // ==============================================

      if (expenseId === undefined) {
        setExpenseError("Expense ID is missing.");
        return;
      }

      await updateExpense({
        id: expenseId,
        ...expenseData,
      }).unwrap();

      dispatch(closeEditExpenses());
    } catch (error: unknown) {
      console.error(
        mode === "create"
          ? "Failed to create expense:"
          : "Failed to update expense:",
        error,
      );

      // ----------------------------------------------
      // API error
      // ----------------------------------------------

      if (typeof error === "object" && error !== null && "data" in error) {
        const apiError = error as {
          data?: {
            message?: string;
          };
        };

        if (apiError.data?.message) {
          setExpenseError(apiError.data.message);
          return;
        }
      }

      // ----------------------------------------------
      // Default error
      // ----------------------------------------------

      setExpenseError(
        mode === "create"
          ? "Something went wrong while creating the expense."
          : "Something went wrong while updating the expense.",
      );
    }
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (mode === "create") {
      dispatch(closeCreateExpenses());
    } else {
      dispatch(closeEditExpenses());
    }
  };

  // --------------------------------------------------
  // Loading expense in edit mode
  // --------------------------------------------------

  if (mode === "edit" && isExpenseLoading) {
    return <div className="p-6 text-center">Loading expense...</div>;
  }

  // --------------------------------------------------
  // Expense not found
  // --------------------------------------------------

  if (mode === "edit" && expenseId !== undefined && !expense) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load expense.
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

      <div className="p-5 max-h-[60vh] overflow-y-auto">
        {/* ========================================
            EXPENSE TITLE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="title" className="text-sm font-medium mb-2">
            Expense Title <span className="text-red-500">*</span>
          </label>

          <input
            id="title"
            name="title"
            type="text"
            defaultValue={mode === "edit" ? (expense?.title ?? "") : ""}
            placeholder="Enter expense title"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            CATEGORY
        ======================================== */}

        {/* ========================================
    CATEGORY
======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="category" className="text-sm font-medium mb-2">
            Category <span className="text-red-500">*</span>
          </label>

          <select
            id="category"
            name="category"
            defaultValue={mode === "edit" ? (expense?.category ?? "") : ""}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={isLoading}
          >
            <option value="">Select category</option>

            <option value="RENT">Rent</option>

            <option value="UTILITIES">Utilities</option>

            <option value="ELECTRICITY">Electricity</option>

            <option value="WATER">Water</option>


            <option value="TRANSPORTATION">Transportation</option>

            <option value="SALARY">Salary</option>


            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* ========================================
            AMOUNT
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="amount" className="text-sm font-medium mb-2">
            Amount <span className="text-red-500">*</span>
          </label>

          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={mode === "edit" ? String(expense?.amount ?? "") : ""}
            placeholder="Enter amount"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            DATE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="date" className="text-sm font-medium mb-2">
            Date <span className="text-red-500">*</span>
          </label>

          <input
            id="date"
            name="date"
            type="date"
            defaultValue={
              mode === "edit" && expense?.date ? expense.date.slice(0, 10) : ""
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            PAYMENT METHOD
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="paymentMethod" className="text-sm font-medium mb-2">
            Payment Method <span className="text-red-500">*</span>
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => {
              const value = event.target.value as PaymentMethod;
              setPaymentMethod(value);
              setSelectedAccountId(null);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={isLoading}
          >
            <option value="">Select payment method</option>

            <option value="CASH">Cash</option>

            <option value="CARD">Card</option>

            <option value="MOBILE">Mobile</option>

            <option value="BANK">Bank</option>
          </select>
        </div>

        {paymentMethod !== "" && paymentMethod !== "CASH" && (
          <div className="flex flex-col items-start mb-4">
            <label htmlFor="accountId" className="text-sm font-medium mb-2">
              {paymentMethod === "MOBILE" ? "Wallet / Merchant Account" : "Bank Account"}{" "}
              <span className="text-red-500">*</span>
            </label>

            <select
              id="accountId"
              name="accountId"
              value={selectedAccountId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedAccountId(value ? Number(value) : null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
              required
              disabled={isLoading}
            >
              <option value="">
                Select {paymentMethod === "MOBILE" ? "wallet or merchant" : "bank account"}
              </option>

              {(paymentMethod === "MOBILE"
                ? walletAccounts
                : bankAccounts
              ).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName
                    ? `${account.bankName} - ${account.name} (${account.number})`
                    : `${account.name} (${account.number})`}
                  {account.type === "MERCHANT" ? " · Merchant" : account.type === "WALLET" ? " · Wallet" : ""}
                </option>
              ))}
            </select>

            {(paymentMethod === "MOBILE"
              ? walletAccounts
              : bankAccounts
            ).length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No active{" "}
                {paymentMethod === "MOBILE" ? "wallet or merchant" : "bank accounts"}{" "}
                available.
              </p>
            )}
          </div>
        )}

        {/* ========================================
            REFERENCE
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="reference" className="text-sm font-medium mb-2">
            Reference
          </label>

          <input
            id="reference"
            name="reference"
            type="text"
            defaultValue={mode === "edit" ? (expense?.reference ?? "") : ""}
            placeholder="Enter reference"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            disabled={isLoading}
          />
        </div>

        {/* ========================================
            NOTES / DESCRIPTION
        ======================================== */}

        <div className="flex flex-col items-start mb-4">
          <label htmlFor="notes" className="text-sm font-medium mb-2">
            Description
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={mode === "edit" ? (expense?.notes ?? "") : ""}
            placeholder="Enter expense description"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] resize-none disabled:bg-gray-100"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {expenseError && (
        <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {expenseError}
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
                ? "Create Expense"
                : "Update Expense"
          }
          type="submit"
        />
      </div>
    </form>
  );
}
