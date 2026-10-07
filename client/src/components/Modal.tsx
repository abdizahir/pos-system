import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
};

export default function Modal({ children }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}