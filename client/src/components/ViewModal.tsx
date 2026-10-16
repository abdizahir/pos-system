import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type DialogModalProps = {
  open: boolean;
  children: ReactNode;
  // Kept for callers; clicking outside no longer closes the modal
  onClick?: () => void;
};

// Closes only from its own buttons (✕ / Cancel), so a stray click
// outside never loses what was typed
export default function ViewModal({
  open,
  children,
}: DialogModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 bg-black/50 flex items-center justify-center p-4"
    >
      <div
        className="w-full max-w-235 max-h-[90dvh] overflow-y-auto bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}