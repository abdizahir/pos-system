import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type DialogModalProps = {
  open: boolean;
  children: ReactNode;
  onClick: () => void;
};

export default function DialogModal({
  open,
  children,
  onClick,
}: DialogModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 bg-black/50 flex items-center justify-center p-4"
      onClick={onClick}
    >
      <div
        className="w-full max-w-125 bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}