import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  // sm: confirmations, md: forms, lg: modals with item tables
  size?: "sm" | "md" | "lg";
};

// Modal opened by a route (e.g. /sales/:id). It closes from its own
// buttons only, so a stray click outside never loses what was typed.
export default function Modal({ children, size = "md" }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full ${
          size === "lg" ? "max-w-3xl" : size === "sm" ? "max-w-100" : "max-w-xl"
        } max-h-[90dvh] overflow-y-auto rounded-lg bg-[#F7F7F7] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
