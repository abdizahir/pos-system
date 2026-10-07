// client/src/components/sidebar/SidebarMobile.tsx

import { useDispatch } from "react-redux";
import { FiX } from "react-icons/fi";

import BrandLogo from "../BrandLogo";
import { closeSidebar } from "../../store/posSlice";
import { SidebarNav } from "./SidebarParts";

export default function SidebarMobile() {
  const dispatch = useDispatch();
  const close = () => dispatch(closeSidebar());

  return (
    <aside className="flex h-full w-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E6EAED] px-4">
        <BrandLogo size={36} showText />
        <button
          type="button"
          onClick={close}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#8A94A3] transition hover:bg-[#F4F6F8] hover:text-text-two"
          aria-label="Close menu"
        >
          <FiX size={20} />
        </button>
      </div>

      <SidebarNav onNavigate={close} />
    </aside>
  );
}
