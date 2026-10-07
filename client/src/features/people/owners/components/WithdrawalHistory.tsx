import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiRotateCcw, FiX } from "react-icons/fi";

import {
  useGetOwnerWithdrawalsQuery,
  useUndoWithdrawalMutation,
  type Owner,
  type OwnerWithdrawal,
} from "../../../../api/api";
import { useCurrentUser } from "../../../auth/useCurrentUser";

const METHOD_LABEL: Record<OwnerWithdrawal["paymentMethod"], string> = {
  CASH: "Cash",
  BANK: "Bank",
  CARD: "Card",
  MOBILE: "Mobile",
};

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Props = {
  owner: Owner;
  onClose: () => void;
  onWithdraw: () => void;
};

// One owner's withdrawals, opened from the owner row's "View" action
export default function WithdrawalHistory({ owner, onClose, onWithdraw }: Props) {
  const {
    data: withdrawals = [],
    isLoading,
    isError,
  } = useGetOwnerWithdrawalsQuery(owner.id, { refetchOnMountOrArgChange: true });
  const [undoWithdrawal, { isLoading: undoing }] = useUndoWithdrawalMutation();
  const { isManager } = useCurrentUser();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const total = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  const handleUndo = async (withdrawal: OwnerWithdrawal) => {
    const confirmed = window.confirm(
      `Undo the withdrawal of ${money(Number(withdrawal.amount))}? The money goes back to its account.`,
    );
    if (!confirmed) return;

    try {
      await undoWithdrawal(withdrawal.id).unwrap();
    } catch (err) {
      console.error("Undo withdrawal failed:", err);
      window.alert("Unable to undo this withdrawal.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-[#F7F7F7] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.75">
          <div>
            <h4 className="text-lg font-semibold text-text-two">
              {owner.fname} {owner.lname}
            </h4>
            <p className="text-xs text-[#646B72]">
              OWN-{String(owner.id).padStart(4, "0")} · {owner.nationalId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full bg-red-500 p-0.5"
            aria-label="Close"
          >
            <FiX size={20} color="white" />
          </button>
        </div>

        <hr className="border-t border-[#D1D5DB]" />

        {/* Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-text-two">Withdrawal History</p>
            <p className="text-xs text-[#646B72]">
              {withdrawals.length} withdrawal{withdrawals.length === 1 ? "" : "s"} · Total{" "}
              <span className="font-semibold text-red-500">{money(total)}</span>
            </p>
          </div>
          {isManager && (
          <button
            type="button"
            onClick={onWithdraw}
            className="cursor-pointer rounded-md bg-[#FE9F43] px-3 py-2 text-sm font-medium text-white hover:bg-[#e88d2f]"
          >
            Make Withdrawal
          </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="overflow-x-auto rounded-lg border border-[#E6EAED] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Taken from</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  {isManager && <th className="px-4 py-3 text-center">Undo</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={isManager ? 5 : 4} className="px-4 py-6 text-center">
                      Loading withdrawals...
                    </td>
                  </tr>
                )}

                {isError && !isLoading && (
                  <tr>
                    <td colSpan={isManager ? 5 : 4} className="px-4 py-6 text-center text-red-500">
                      Failed to load withdrawals.
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 5 : 4} className="px-4 py-6 text-center text-[#646B72]">
                      No withdrawals yet.
                    </td>
                  </tr>
                )}

                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-[#212529]">
                      {new Date(withdrawal.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-[#646B72]">
                      {METHOD_LABEL[withdrawal.paymentMethod]}
                      {withdrawal.account && (
                        <span className="block text-xs">
                          {withdrawal.account.name} ({withdrawal.account.number})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#646B72]">
                      {[withdrawal.reference, withdrawal.notes].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-red-500">
                      {money(Number(withdrawal.amount))}
                    </td>
                    {isManager && (
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          title="Undo withdrawal"
                          onClick={() => handleUndo(withdrawal)}
                          disabled={undoing}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          <FiRotateCcw size={14} />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
