import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useDispatch } from "react-redux";

import Button from "../../../../components/Button";
import {
  useGetAccountsQuery,
  useGetPurchasesQuery,
  useGetSuppliersQuery,
  usePaySupplierMutation,
} from "../../../../api/api";
import { closePaySupplier } from "../../../../store/posSlice";

type PayFormProps = {
  mode: "create" | "edit";
  supplierId?: number;
};

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "MOBILE"
  | "BANK";

export default function PayForm({
  mode: _mode,
  supplierId: _supplierId,
}: PayFormProps) {
  const dispatch = useDispatch();

  const {
    data: suppliers = [],
    isLoading: isSuppliersLoading,
  } = useGetSuppliersQuery();

  const {
    data: purchases = [],
    isLoading: isPurchasesLoading,
  } = useGetPurchasesQuery();

  const {
    data: accounts = [],
    isLoading: isAccountsLoading,
  } = useGetAccountsQuery();

  const [paySupplier, { isLoading: isPaying }] =
    usePaySupplierMutation();

  const [selectedSupplierId, setSelectedSupplierId] =
    useState("");
  const [amountInput, setAmountInput] =
    useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [selectedAccountId, setSelectedAccountId] =
    useState<number | null>(null);
  const [paymentError, setPaymentError] =
    useState("");

  const bankAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.type === "BANK" &&
          account.status === "ACTIVE",
      ),
    [accounts],
  );

  const walletAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          (account.type === "WALLET" || account.type === "MERCHANT") &&
          account.status === "ACTIVE",
      ),
    [accounts],
  );

  const supplierPayables = useMemo(() => {
    const totals = new Map<number, number>();

    for (const purchase of purchases) {
      if (
        purchase.status === "CANCELLED"
      ) {
        continue;
      }

      const dueAmount = Number(
        purchase.dueAmount,
      );

      if (dueAmount <= 0) {
        continue;
      }

      totals.set(
        purchase.supplierId,
        (totals.get(purchase.supplierId) ??
          0) + dueAmount,
      );
    }

    return suppliers
      .map((supplier) => ({
        ...supplier,
        payableAmount:
          totals.get(supplier.id) ?? 0,
      }))
      .filter(
        (supplier) =>
          supplier.payableAmount > 0,
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      );
  }, [purchases, suppliers]);

  const selectedSupplier =
    supplierPayables.find(
      (supplier) =>
        supplier.id ===
        Number(selectedSupplierId),
    ) ?? null;

  const selectedAccount =
    (
      paymentMethod === "MOBILE"
        ? walletAccounts
        : bankAccounts
    ).find(
      (account) =>
        account.id === selectedAccountId,
    ) ?? null;

  const insufficientBalanceMessage =
    useMemo(() => {
      if (
        paymentMethod === "CASH" ||
        selectedAccount === null
      ) {
        return "";
      }

      const amount = Number(amountInput);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return "";
      }

      const currentBalance = Number(
        selectedAccount.currentBalance,
      );

      if (amount > currentBalance) {
        return `Insufficient account balance. Available balance: ETB ${currentBalance.toFixed(
          2,
        )}.`;
      }

      return "";
    }, [
      amountInput,
      paymentMethod,
      selectedAccount,
    ]);

  const handleClose = () => {
    dispatch(closePaySupplier());
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPaymentError("");

    const supplierId =
      Number(selectedSupplierId);
    const amount = Number(amountInput);

    if (
      !Number.isInteger(supplierId) ||
      supplierId <= 0
    ) {
      setPaymentError(
        "Please select a supplier with outstanding payable.",
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPaymentError(
        "Payment amount must be greater than 0.",
      );
      return;
    }

    if (
      selectedSupplier &&
      amount >
        selectedSupplier.payableAmount
    ) {
      setPaymentError(
        `Payment amount cannot exceed ETB ${selectedSupplier.payableAmount.toFixed(
          2,
        )}.`,
      );
      return;
    }

    if (
      paymentMethod !== "CASH" &&
      selectedAccountId === null
    ) {
      setPaymentError(
        `Please select a ${
          paymentMethod === "MOBILE"
            ? "wallet or merchant"
            : "bank account"
        }.`,
      );
      return;
    }

    if (insufficientBalanceMessage) {
      setPaymentError(
        insufficientBalanceMessage,
      );
      return;
    }

    try {
      await paySupplier({
        supplierId,
        amount,
        paymentMethod,
        accountId:
          paymentMethod === "CASH"
            ? null
            : selectedAccountId,
      }).unwrap();

      dispatch(closePaySupplier());
    } catch (error: unknown) {
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
          setPaymentError(
            apiError.data.message,
          );
          return;
        }
      }

      setPaymentError(
        "Failed to pay supplier.",
      );
    }
  };

  if (
    isSuppliersLoading ||
    isPurchasesLoading ||
    isAccountsLoading
  ) {
    return (
      <div className="p-6 text-center">
        Loading payable suppliers...
      </div>
    );
  }

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <div className="p-5 max-h-[60vh] overflow-y-auto">
        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="supplierId"
            className="text-sm font-medium mb-2"
          >
            Supplier{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            id="supplierId"
            name="supplierId"
            value={selectedSupplierId}
            onChange={(event) => {
              const value =
                event.target.value;
              setSelectedSupplierId(value);
              setPaymentError("");

              const supplier =
                supplierPayables.find(
                  (item) =>
                    item.id ===
                    Number(value),
                );

              setSelectedAccountId(null);

              setAmountInput(
                supplier
                  ? String(
                      supplier.payableAmount,
                    )
                  : "",
              );
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={
              isPaying ||
              supplierPayables.length === 0
            }
          >
            <option value="">
              Select supplier
            </option>

            {supplierPayables.map(
              (supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name} - ETB{" "}
                  {supplier.payableAmount.toFixed(
                    2,
                  )}
                </option>
              ),
            )}
          </select>

          {supplierPayables.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              No suppliers have outstanding payable balances.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="amount"
            className="text-sm font-medium mb-2"
          >
            Amount{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(
                event.target.value,
              );
              setPaymentError("");
            }}
            placeholder="Enter amount"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100"
            required
            disabled={
              isPaying ||
              supplierPayables.length === 0
            }
          />

          {selectedSupplier && (
            <p className="mt-1 text-xs text-[#646B72]">
              Outstanding payable: ETB{" "}
              {selectedSupplier.payableAmount.toFixed(
                2,
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start mb-4">
          <label
            htmlFor="paymentMethod"
            className="text-sm font-medium mb-2"
          >
            Payment Method{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(
                event.target
                  .value as PaymentMethod,
              );
              setSelectedAccountId(
                null,
              );
              setPaymentError("");
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
            required
            disabled={
              isPaying ||
              supplierPayables.length === 0
            }
          >
            <option value="CASH">
              Cash
            </option>
            <option value="CARD">
              Card
            </option>
            <option value="MOBILE">
              Mobile
            </option>
            <option value="BANK">
              Bank
            </option>
          </select>
        </div>

        {paymentMethod !== "CASH" && (
          <div className="flex flex-col items-start mb-4">
            <label
              htmlFor="accountId"
              className="text-sm font-medium mb-2"
            >
              {paymentMethod === "MOBILE"
                ? "Wallet / Merchant Account"
                : "Bank Account"}{" "}
              <span className="text-red-500">
                *
              </span>
            </label>

            <select
              id="accountId"
              name="accountId"
              value={selectedAccountId ?? ""}
              onChange={(event) => {
                const value =
                  event.target.value;
                setSelectedAccountId(
                  value
                    ? Number(value)
                    : null,
                );
                setPaymentError("");
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100"
              required
              disabled={
                isPaying ||
                supplierPayables.length === 0
              }
            >
              <option value="">
                Select{" "}
                {paymentMethod === "MOBILE"
                  ? "wallet or merchant"
                  : "bank account"}
              </option>

              {(paymentMethod === "MOBILE"
                ? walletAccounts
                : bankAccounts
              ).map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
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
                {paymentMethod === "MOBILE"
                  ? "wallet or merchant"
                  : "bank accounts"}{" "}
                available.
              </p>
            )}

            {selectedAccount && (
              <p className="mt-1 text-xs text-[#646B72]">
                Current balance: ETB{" "}
                {Number(
                  selectedAccount.currentBalance,
                ).toFixed(2)}
              </p>
            )}

            {insufficientBalanceMessage && (
              <p className="mt-1 text-xs text-red-500">
                {insufficientBalanceMessage}
              </p>
            )}
          </div>
        )}

        {paymentError && (
          <p className="mt-1 text-xs text-red-500">
            {paymentError}
          </p>
        )}
      </div>

      <hr className="border-t border-[#D1D5DB]" />

      <div className="flex items-center justify-end gap-2 px-5 py-4">
        <button
          type="button"
          disabled={isPaying}
          onClick={handleClose}
          className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        <Button
          onClick={() => {}}
          name={
            isPaying
              ? "Paying..."
              : "Pay Supplier"
          }
          type="submit"
        />
      </div>
    </form>
  );
}
