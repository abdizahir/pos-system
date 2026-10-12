import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  // sm: confirmations, md: forms, lg: modals with item tables
  size?: "sm" | "md" | "lg";
};

// Modal opened by a route (e.g. /sales/:id). Clicking the backdrop
// goes back to the page underneath.
export default function Modal({ children, size = "md" }: ModalProps) {
  const navigate = useNavigate();

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4"
      onClick={() => navigate(-1)}
    >
      <div
        className={`w-full ${
          size === "lg" ? "max-w-3xl" : size === "sm" ? "max-w-100" : "max-w-xl"
        } max-h-[90vh] overflow-y-auto rounded-lg bg-[#F7F7F7] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
