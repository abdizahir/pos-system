// client/src/components/Header.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCornerDownLeft,
  FiLogOut,
  FiMaximize,
  FiMenu,
  FiMinimize,
  FiMonitor,
  FiPackage,
  FiSearch,
  FiUser,
} from "react-icons/fi";

import {
  api,
  useGetOverdueSalesQuery,
  useGetProductAlertsQuery,
  useLogoutMutation,
} from "../api/api";
import { clearToken } from "../features/auth/auth.slice";
import { openSidebar } from "../store/posSlice";
import type { RootState } from "../store/store";
import Logo from "./Logo";
import {
  NAV_GROUPS,
  NAV_HOME,
  isPathActive,
  type NavItem,
} from "./sidebar/navConfig";
import { canAccess } from "../features/auth/roles";
import { useCurrentUser } from "../features/auth/useCurrentUser";
import { useShop } from "../features/shop/useShop";

// ============================================================
// HELPERS
// ============================================================

type TokenPayload = { email?: string; role?: string };

function decodeUser(token: string | null): TokenPayload {
  if (!token) return {};
  try {
    return jwtDecode<TokenPayload>(token);
  } catch {
    return {};
  }
}

type SearchItem = NavItem & { group: string };

const SEARCH_ITEMS: SearchItem[] = [
  { ...NAV_HOME, group: "Main" },
  ...NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))),
];

// Title for the current page, e.g. { group: "Reports", title: "Balance Sheet" }
function pageTitle(pathname: string) {
  if (pathname.startsWith("/pos")) return { group: "Sales", title: "Point of Sale" };

  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => isPathActive(pathname, entry.to));
    if (item) return { group: group.label, title: item.label };
  }

  if (isPathActive(pathname, NAV_HOME.to)) return { group: "Overview", title: "Dashboard" };
  return { group: "", title: "" };
}

// Close a popover when clicking outside it or pressing Escape
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return ref;
}

const iconButton =
  "relative grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]";

// ============================================================
// SEARCH
// ============================================================

function QuickSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const ref = useDismiss(open, close);

  // Ctrl/⌘ + K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { role } = useCurrentUser();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = SEARCH_ITEMS.filter((item) => canAccess(role, item.roles));
    const list = q
      ? allowed.filter(
          (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q),
        )
      : allowed;
    return list.slice(0, 8);
  }, [query, role]);

  const go = (item: SearchItem) => {
    navigate(item.to);
    close();
    inputRef.current?.blur();
  };

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div
        className={`flex items-center gap-2.5 rounded-xl px-3.5 transition ${
          open ? "bg-white ring-2 ring-[#FE9F43]/40" : "bg-[#F1F5F9] hover:bg-[#EAEFF4]"
        }`}
      >
        <FiSearch className="shrink-0 text-[#94A3B8]" size={16} />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active]);
            }
          }}
          placeholder="Search pages…"
          className="h-10 w-full bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          aria-label="Search pages"
        />
        <kbd className="hidden shrink-0 rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#94A3B8] lg:block">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-[#EEF0F3] bg-white p-1.5 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#94A3B8]">No pages match “{query}”.</p>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(item)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    index === active ? "bg-[#FFF7ED]" : ""
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      index === active ? "bg-[#FE9F43] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#0F172A]">{item.label}</span>
                    <span className="block text-xs text-[#94A3B8]">{item.group}</span>
                  </span>
                  {index === active && <FiCornerDownLeft className="text-[#94A3B8]" size={14} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS (overdue customer dues + stock alerts)
// ============================================================

function formatEtb(value: number) {
  return `ETB ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Notifications() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  // Small counts from the server instead of every product + batch
  const { data: counts } = useGetProductAlertsQuery(undefined, {
    pollingInterval: 5 * 60 * 1000,
  });
  // Credit sales still unpaid a week after the sale day
  const { data: overdue } = useGetOverdueSalesQuery(undefined, {
    pollingInterval: 5 * 60 * 1000,
  });

  const alerts = useMemo(() => {
    const outOfStock = counts?.outOfStock ?? 0;
    const lowStock = counts?.lowStock ?? 0;
    const expired = counts?.expired ?? 0;
    const expiringSoon = counts?.expiringSoon ?? 0;

    return [
      { key: "out", count: outOfStock, label: "out of stock", icon: FiPackage, tone: "bg-red-50 text-red-500", to: "/low-stocks" },
      { key: "low", count: lowStock, label: "running low", icon: FiAlertTriangle, tone: "bg-amber-50 text-amber-600", to: "/low-stocks" },
      { key: "expired", count: expired, label: "expired batches", icon: FiClock, tone: "bg-rose-50 text-rose-500", to: "/expired-product" },
      { key: "soon", count: expiringSoon, label: "batches expire within 30 days", icon: FiClock, tone: "bg-orange-50 text-orange-500", to: "/expired-product" },
    ].filter((alert) => alert.count > 0);
  }, [counts]);

  const overdueCount = overdue?.count ?? 0;
  const overdueSales = overdue?.sales ?? [];
  const total = alerts.reduce((sum, alert) => sum + alert.count, 0) + overdueCount;

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={iconButton}
        title="Notifications"
        aria-label={`Notifications${total ? `: ${total}` : ""}`}
      >
        <FiBell size={18} />
        {total > 0 && (
          <span className="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-88 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[#EEF0F3] bg-white shadow-xl">
          <div className="border-b border-[#F1F5F9] px-4 py-3">
            <p className="font-semibold text-[#0F172A]">Notifications</p>
            <p className="text-xs text-[#94A3B8]">Things that need your attention</p>
          </div>

          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <FiCheckCircle className="text-emerald-500" size={22} />
              <p className="text-sm text-[#64748B]">All caught up.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {/* ---------------- Overdue customer dues ---------------- */}
              {overdueCount > 0 && (
                <section className="p-1.5">
                  <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                      Customer dues · over {overdue?.overdueAfterDays ?? 7} days
                    </p>
                    <p className="text-xs font-semibold text-red-500">{formatEtb(overdue?.totalDue ?? 0)}</p>
                  </div>
                  <ul>
                    {overdueSales.map((sale) => (
                      <li key={sale.id}>
                        <button
                          type="button"
                          onClick={() => go(`/sales/${sale.id}`)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F8FAFC]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                            <FiUser size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[#0F172A]">
                              {sale.customer
                                ? `${sale.customer.fname} ${sale.customer.lname}`
                                : "Walk-in Customer"}
                            </span>
                            <span className="block truncate text-xs text-[#94A3B8]">
                              {sale.invoiceNumber} · {sale.daysSinceSale} days ago
                              {sale.customer?.phone ? ` · ${sale.customer.phone}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-red-500">
                            {formatEtb(sale.dueAmount)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {overdueCount > overdueSales.length && (
                    <button
                      type="button"
                      onClick={() => go("/sales")}
                      className="w-full cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-medium text-[#FE9F43] hover:bg-[#FFF7ED]"
                    >
                      +{overdueCount - overdueSales.length} more overdue sales
                    </button>
                  )}
                </section>
              )}

              {/* ---------------- Stock alerts ---------------- */}
              {alerts.length > 0 && (
                <section className={`p-1.5 ${overdueCount > 0 ? "border-t border-[#F1F5F9]" : ""}`}>
                  <p className="px-3 pt-1.5 pb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Stock
                  </p>
                  <ul>
                    {alerts.map(({ key, count, label, icon: Icon, tone, to }) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => go(to)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F8FAFC]"
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                            <Icon size={16} />
                          </span>
                          <span className="text-sm text-[#475569]">
                            <span className="font-semibold text-[#0F172A]">{count}</span>{" "}
                            {count === 1 ? label.replace("batches", "batch").replace("expire", "expires") : label}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// USER MENU
// ============================================================

function UserMenu({ compact }: { compact?: boolean }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const user = decodeUser(token);
  const { user: me } = useCurrentUser();
  const email = me?.email ?? user.email ?? "User";
  const role = (me?.role ?? user.role)?.toLowerCase() ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    // Tell the server first, so the token can't be reused; sign out
    // here even if that fails (e.g. offline)
    await logout().unwrap().catch(() => undefined);
    dispatch(clearToken());
    dispatch(api.util.resetApiState());
    navigate("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1 pr-2 transition hover:bg-[#F1F5F9]"
        aria-label="Account menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-[#FFB566] to-[#FE9F43] text-xs font-bold text-white">
          {initials}
        </span>
        {!compact && (
          <span className="hidden text-left leading-tight xl:block">
            <span className="block max-w-40 truncate text-sm font-medium text-[#0F172A]">{email}</span>
            {role && <span className="block text-xs capitalize text-[#94A3B8]">{role}</span>}
          </span>
        )}
        <FiChevronDown size={14} className={`text-[#94A3B8] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-[#EEF0F3] bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#F1F5F9] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[#FFB566] to-[#FE9F43] text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{email}</p>
              {role && <p className="text-xs capitalize text-[#94A3B8]">{role}</p>}
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <FiLogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
    else void document.exitFullscreen();
  };

  const { group, title } = pageTitle(pathname);
  const { isManagement } = useCurrentUser();
  const { name: shopName } = useShop();

  return (
    <header className="sticky top-0 z-30 border-b border-[#EEF0F3] bg-white/90 backdrop-blur">
      {/* ---------------- Mobile + tablet ---------------- */}
      <div className="flex h-16 items-center justify-between gap-2 px-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(openSidebar())}
            className={iconButton}
            aria-label="Open menu"
          >
            <FiMenu size={20} />
          </button>
          <button type="button" onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-2" aria-label="Dashboard">
            <Logo size={32} />
            <span className="truncate text-sm font-semibold text-[#0F172A]">{title || shopName}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-[#FE9F43] text-white"
            aria-label="Open POS"
          >
            <FiMonitor size={18} />
          </button>
          {isManagement && <Notifications />}
          <UserMenu compact />
        </div>
      </div>

      {/* ---------------- Desktop ---------------- */}
      <div className="hidden h-16 items-center gap-4 px-6 md:flex">
        <div className="min-w-0 shrink-0 lg:w-56">
          {group && <p className="text-xs font-medium text-[#94A3B8]">{group}</p>}
          <h1 className="truncate text-base font-semibold text-[#0F172A]">{title || shopName}</h1>
        </div>

        <div className="flex flex-1 justify-center">
          <QuickSearch />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="mr-1 flex cursor-pointer items-center gap-2 rounded-xl bg-[#FE9F43] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#FE9F43]/25 transition hover:bg-[#F28F2F]"
          >
            <FiMonitor size={16} />
            POS
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={iconButton}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <FiMinimize size={17} /> : <FiMaximize size={17} />}
          </button>

          {isManagement && <Notifications />}

          <span className="mx-1 h-7 w-px bg-[#EEF0F3]" />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
