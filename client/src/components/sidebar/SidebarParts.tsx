// client/src/components/sidebar/SidebarParts.tsx
//
// Pieces shared by the desktop and mobile sidebars.

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";

import {
  groupsForRole,
  NAV_HOME,
  isPathActive,
  type NavGroup,
  type NavItem,
} from "./navConfig";
import { useCurrentUser } from "../../features/auth/useCurrentUser";
import { canAccess } from "../../features/auth/roles";

const ACCENT = "#FE9F43";

// ============================================================
// LINK
// ============================================================

function NavRow({
  item,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const active = isPathActive(pathname, item.to);
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-lg text-sm transition-colors ${
        collapsed ? "justify-center px-0 py-2.5" : nested ? "py-2 pl-10 pr-3" : "px-3 py-2.5"
      } ${
        active
          ? "bg-[#FE9F43]/12 font-medium text-[#E8862A]"
          : "text-[#5B6670] hover:bg-[#F4F6F8] hover:text-text-two"
      }`}
    >
      {/* Active indicator */}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: ACCENT }}
        />
      )}
      <Icon
        size={nested ? 15 : 18}
        className={`shrink-0 ${active ? "text-[#E8862A]" : "text-[#8A94A3] group-hover:text-text-two"}`}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </NavLink>
  );
}

// ============================================================
// NAVIGATION
// ============================================================

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { role } = useCurrentUser();
  const groups = groupsForRole(role);
  const showHome = canAccess(role, NAV_HOME.roles);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number } | null>(
    null,
  );

  const activeGroupKey =
    groups.find((group) =>
      group.items.some((item) => isPathActive(pathname, item.to)),
    )?.key ?? null;

  // Clicking a group opens it; the group of the current page starts open
  const expandedKey = openKey ?? activeGroupKey;

  // ---------------- Collapsed: icons + hover flyouts ----------------
  if (collapsed) {
    return (
      <nav
        className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3 custom-scrollbar"
        onMouseLeave={() => setFlyout(null)}
      >
        {showHome && <NavRow item={NAV_HOME} collapsed onNavigate={onNavigate} />}
        <div className="my-2 h-px w-8 bg-[#E6EAED]" />

        {groups.map((group) => {
          const Icon = group.icon;
          const active = group.key === activeGroupKey;

          return (
            <button
              key={group.key}
              type="button"
              onMouseEnter={(e) =>
                setFlyout({
                  group,
                  top: e.currentTarget.getBoundingClientRect().top,
                })
              }
              onClick={(e) =>
                setFlyout((current) =>
                  current?.group.key === group.key
                    ? null
                    : { group, top: e.currentTarget.getBoundingClientRect().top },
                )
              }
              className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                active
                  ? "bg-[#FE9F43]/12 text-[#E8862A]"
                  : "text-[#8A94A3] hover:bg-[#F4F6F8] hover:text-text-two"
              }`}
              aria-label={group.label}
            >
              <Icon size={18} />
            </button>
          );
        })}

        {flyout && (
          <div
            className="fixed left-19 z-50 w-56 rounded-xl border border-[#E6EAED] bg-white p-2 shadow-xl"
            style={{ top: Math.min(flyout.top - 8, window.innerHeight - 320) }}
          >
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A0A7AE]">
              {flyout.group.label}
            </p>
            {flyout.group.items.map((item) => (
              <NavRow
                key={item.to}
                item={item}
                onNavigate={() => {
                  setFlyout(null);
                  onNavigate?.();
                }}
              />
            ))}
          </div>
        )}
      </nav>
    );
  }

  // ---------------- Expanded ----------------
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 custom-scrollbar">
        <>
            {showHome && <NavRow item={NAV_HOME} onNavigate={onNavigate} />}

         

            {groups.map((group) => {
              const Icon = group.icon;
              const isOpen = expandedKey === group.key;
              const hasActive = group.key === activeGroupKey;

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? "" : group.key)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      hasActive
                        ? "font-medium text-text-two"
                        : "text-[#5B6670] hover:bg-[#F4F6F8] hover:text-text-two"
                    }`}
                    aria-expanded={isOpen}
                  >
                    <Icon
                      size={18}
                      className={hasActive ? "text-[#E8862A]" : "text-[#8A94A3]"}
                    />
                    <span className="flex-1 text-left">{group.label}</span>
                    {hasActive && !isOpen && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FE9F43]" />
                    )}
                    <FiChevronDown
                      size={15}
                      className={`text-[#A0A7AE] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Smooth open/close */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="relative space-y-0.5 py-1">
                        {/* Tree line */}
                        <span className="absolute bottom-2 left-5.25 top-2 w-px bg-[#E6EAED]" />
                        {group.items.map((item) => (
                          <NavRow
                            key={item.to}
                            item={item}
                            nested
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </>
      </nav>
    </div>
  );
}
