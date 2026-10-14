// client/src/layouts/DashboardLayout.tsx

import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Header from "../components/Header";
import Sidebar from "../components/sidebar/Sidebar";
import SideBarModal from "../components/sidebar/SideBarModal";
import SidebarMobile from "../components/sidebar/SidebarMobile";
import Footer from "../components/Footer";

import type { RootState } from "../store/store";

export default function DashboardLayout() {
  const isOpen = useSelector(
    (state: RootState) => state.pos.isSidebarOpen,
  );

  // Pages scroll inside <main>, not the window, so the browser never
  // resets it. Start each new page at the top (filters and ?add=1 on
  // the same page keep their place).
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0 print:hidden!">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <div className="print:hidden">
        <SideBarModal open={isOpen}>
          <SidebarMobile />
        </SideBarModal>
      </div>

      {/* Right Content */}
      <div className="flex flex-1 min-w-0 flex-col print:block">
        <div className="print:hidden">
          <Header />
        </div>

        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto print:overflow-visible">
          <Outlet />
          <div className="print:hidden">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}