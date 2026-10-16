// client/src/layouts/DashboardLayout.tsx

import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Header from "../components/Header";
import Sidebar from "../components/sidebar/Sidebar";
import SideBarModal from "../components/sidebar/SideBarModal";
import SidebarMobile from "../components/sidebar/SidebarMobile";
import Footer from "../components/Footer";
import { useIdleLogout } from "../components/useIdleLogout";

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

  // Sign out after 15 minutes without activity; warn in the last minute
  const idleSecondsLeft = useIdleLogout();

  return (
    <div className="flex h-app overflow-hidden print:block print:h-auto print:overflow-visible">
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

        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain print:overflow-visible">
          <Outlet />
          <div className="print:hidden">
            <Footer />
          </div>
        </main>
      </div>

      {idleSecondsLeft !== null && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 left-4 z-10000 rounded-xl border border-[#E6EAED] bg-white p-4 shadow-2xl sm:left-auto sm:w-80 print:hidden"
        >
          <p className="font-semibold text-text-two">Still there?</p>
          <p className="mt-1 text-sm text-[#646B72]">
            You will be signed out in{" "}
            <span className="font-semibold text-[#E53E3E] tabular-nums">
              {idleSecondsLeft}s
            </span>{" "}
            because there was no activity.
          </p>
          {/* Any click counts as activity, which hides this */}
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-[#FE9F43] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90"
          >
            Stay signed in
          </button>
        </div>
      )}
    </div>
  );
}