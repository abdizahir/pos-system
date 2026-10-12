// Adjust a product's stock to a physical count (damage, loss, breakage,
// counting errors). The server moves the difference in or out of stock
// and records its cost under Inventory Adjustments.

import { useState } from "react";
import { FiX } from "react-icons/fi";

import { useAdjustStockMutation, type StockAdjustmentReason } from "../../../api/api";

const REASONS: { value: StockAdjustmentReason; label: string }[] = [
  { value: "DAMAGE", label: "Damage" },
  { value: "LOSS", label: "Loss / theft" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "COUNT_ERROR", label: "Counting error" },
  { value: "OTHER", label: "Other" },
];

const FIELD =
  "w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] bg-white disabled:bg-gray-100";

const money = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type AdjustTarget = {
  productId: number;
  productName: string;
  unitName: string;
  systemQuantity: number;
  // Latest purchase price, for the estimate shown before saving
  unitCost: number | null;
};

export default function AdjustStockModal({
  target,
  onClose,
  onDone,
}: {
  target: AdjustTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [adjustStock, { isLoading }] = useAdjustStockMutation();

  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState<StockAdjustmentReason | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const countedNumber = counted.trim() === "" ? null : Number(counted);
  const validCount =
    countedNumber !== null && Number.isInteger(countedNumber) && countedNumber >= 0;
  const difference = validCount ? countedNumber - target.systemQuantity : 0;
  const estimate = target.unitCost !== null ? Math.abs(difference) * target.unitCost : null;

  const handleSave = async () => {
    setError("");

    if (!validCount) {
      setError("Enter the counted quantity (a whole number, 0 or more).");
      return;
    }
    if (difference === 0) {
      setError("The count matches the system. Nothing to adjust.");
      return;
    }
    if (!reason) {
      setError("Select a reason for the adjustment.");
      return;
    }

    try {
      const result = await adjustStock({
        productId: target.productId,
        countedQuantity: countedNumber,
        reason,
        notes: notes.trim() || null,
      }).unwrap();

      onDone(
        `${result.productName}: ${result.before} → ${result.after} (${
          result.difference > 0 ? "+" : ""
        }${result.difference}), ETB ${money(result.value)} recorded as ${result.reason.toLowerCase()}.`,
      );
    } catch (err) {
      const message =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      setError(message ?? "Couldn't adjust the stock. Please try again.");
    }
  };

  return (
    <div className="bg-[#F7F7F7] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.75">
        <div>
          <h4 className="text-lg text-text-two font-semibold">Adjust Stock</h4>
          <p className="text-sm text-[#646B72]">{target.productName}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-[#646B72]">
          Correct the stock when your physical count is different from the system because of
          damage, loss, breakage or a counting error.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#E6EAED] bg-white px-4 py-3">
            <p className="text-xs text-[#646B72]">In the system</p>
            <p className="mt-0.5 text-lg font-bold text-text-two">
              {target.systemQuantity} {target.unitName}
            </p>
          </div>
          <div className="rounded-lg border border-[#E6EAED] bg-white px-4 py-3">
            <p className="text-xs text-[#646B72]">Difference</p>
            <p
              className={`mt-0.5 text-lg font-bold ${
                difference < 0 ? "text-red-500" : difference > 0 ? "text-green-600" : "text-text-two"
              }`}
            >
              {validCount ? `${difference > 0 ? "+" : ""}${difference}` : "—"}
            </p>
            {validCount && difference !== 0 && estimate !== null && (
              <p className="text-xs text-[#8A94A3]">
                ≈ ETB {money(estimate)} {difference < 0 ? "loss" : "found"}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="adjust-counted" className="text-sm font-medium mb-2 block text-text-two">
            Counted Quantity <span className="text-red-500">*</span>
          </label>
          <input
            id="adjust-counted"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={counted}
            onChange={(e) => {
              setCounted(e.target.value);
              setError("");
            }}
            placeholder="What you counted on the shelf"
            disabled={isLoading}
            className={FIELD}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="adjust-reason" className="text-sm font-medium mb-2 block text-text-two">
            Reason <span className="text-red-500">*</span>
          </label>
          <select
            id="adjust-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as StockAdjustmentReason);
              setError("");
            }}
            disabled={isLoading}
            className={FIELD}
          >
            <option value="">Select reason</option>
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="adjust-notes" className="text-sm font-medium mb-2 block text-text-two">
            Notes
          </label>
          <textarea
            id="adjust-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional, e.g. 3 bottles broken during delivery"
            disabled={isLoading}
            className={`${FIELD} resize-none`}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <hr className="border-t border-[#D1D5DB]" />
      <div className="flex items-center justify-end gap-2 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 rounded-md bg-gray-600 text-white text-sm cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 rounded-md bg-[#FE9F43] text-white text-sm cursor-pointer hover:bg-[#e88d2f] disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Adjustment"}
        </button>
      </div>
    </div>
  );
}
