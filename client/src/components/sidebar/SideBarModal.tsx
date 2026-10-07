import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { closeSidebar } from "../../store/posSlice";

type SideBarModalProps = {
  open: boolean;
  children: ReactNode;
};

// Slide-in drawer for small screens. It stays mounted so it can
// animate both in and out.
export default function SideBarModal({ open, children }: SideBarModalProps) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(closeSidebar());
    };

    // Stop the page behind from scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dispatch]);

  const portalElement = document.getElementById("sidebar-modal");
  if (!portalElement) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => dispatch(closeSidebar())}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`relative h-full w-[min(85vw,300px)] bg-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>,
    portalElement,
  );
}
