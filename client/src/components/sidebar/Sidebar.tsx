// client/src/components/sidebar/Sidebar.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

import BrandLogo from "../BrandLogo";
import { SidebarNav } from "./SidebarParts";

const COLLAPSED_KEY = "sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      } catch {
        // Storage unavailable; keep it for this session only
      }
      return !current;
    });
  };

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-[#E6EAED] bg-white transition-[width] duration-200 ${
        collapsed ? "w-18" : "w-65"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-[#E6EAED] ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="min-w-0 cursor-pointer"
          title="Go to dashboard"
        >
          <BrandLogo size={collapsed ? 36 : 38} showText={!collapsed} />
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#8A94A3] transition hover:bg-[#F4F6F8] hover:text-text-two"
            title="Collapse sidebar"
          >
            <FiChevronsLeft size={17} />
          </button>
        )}
      </div>

      {/* Expand handle when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#E6EAED] bg-white text-[#8A94A3] shadow-sm transition hover:text-[#FE9F43]"
          title="Expand sidebar"
        >
          <FiChevronsRight size={13} />
        </button>
      )}

      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
