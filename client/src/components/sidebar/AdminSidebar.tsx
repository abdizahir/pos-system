// client/src/components/AdminSidebar.tsx

import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiSettings,
  FiPercent,
  FiCreditCard,
  FiShield,
  FiTag,
  FiDatabase,
  FiActivity,
  FiLink,
  FiAward,
  FiServer,
  FiChevronDown,
  FiChevronLeft,
  FiArrowLeft,
} from "react-icons/fi";

import BrandLogo from "../BrandLogo";

// ============================================================
// TYPES
// ============================================================

type SubItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

type Group = {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: SubItem[];
};

// ============================================================
// MENU CONFIG
// ============================================================

const GROUPS: Group[] = [
  {
    key: "access",
    label: "Access Control",
    icon: <FiShield size={18} />,
    items: [
      {
        label: "Users",
        to: "/admin/users",
        icon: <FiUsers size={16} />,
      },
      {
        label: "Roles",
        to: "/admin/roles",
        icon: <FiShield size={16} />,
      },
    ],
  },
  {
    key: "business",
    label: "Business",
    icon: <FiSettings size={18} />,
    items: [
      {
        label: "Store Settings",
        to: "/admin/settings",
        icon: <FiSettings size={16} />,
      },
      {
        label: "Tax / VAT",
        to: "/admin/tax",
        icon: <FiPercent size={16} />,
      },
      {
        label: "Payment Methods",
        to: "/admin/payments",
        icon: <FiCreditCard size={16} />,
      },
      {
        label: "Categories & Units",
        to: "/admin/master-data",
        icon: <FiTag size={16} />,
      },
    ],
  },
  {
    key: "system",
    label: "System",
    icon: <FiServer size={18} />,
    items: [
      {
        label: "Backup & Data",
        to: "/admin/backup",
        icon: <FiDatabase size={16} />,
      },
      {
        label: "Audit Log",
        to: "/admin/audit",
        icon: <FiActivity size={16} />,
      },
      {
        label: "Integrations",
        to: "/admin/integrations",
        icon: <FiLink size={16} />,
      },
      {
        label: "Subscription",
        to: "/admin/billing",
        icon: <FiAward size={16} />,
      },
      {
        label: "System Health",
        to: "/admin/health",
        icon: <FiServer size={16} />,
      },
    ],
  },
];

// ============================================================
// ADMIN SIDEBAR
// ============================================================

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => ({}),
  );

  // If the current URL is inside a group, force it open
  const effectiveOpen = useMemo(() => {
    const next: Record<string, boolean> = { ...openGroups };
    for (const g of GROUPS) {
      const active = g.items.some((i) => location.pathname.startsWith(i.to));
      if (active) next[g.key] = true;
    }
    return next;
  }, [openGroups, location.pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const isOpen = !!prev[key];
      // Close all, then open the clicked one (or close it if it was open)
      return isOpen ? {} : { [key]: true };
    });
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  return (
    <aside
      className={`relative h-full flex flex-col bg-white border-r border-[#E6EAED] transition-[width] duration-200 ${
        collapsed ? "w-18" : "w-65"
      }`}
    >
      {/* ==================================================
          LOGO + COLLAPSE TOGGLE
      ================================================== */}

      <div
        className={`flex items-center h-16 px-3 border-b border-[#E6EAED] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="flex items-center gap-3 cursor-pointer min-w-0"
          title="Go to admin home"
        >
          {collapsed ? (
            <BrandLogo size={36} showText={false} />
          ) : (
            <BrandLogo size={40} showText={true} />
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#646B72] hover:bg-gray-100 cursor-pointer"
            title="Collapse sidebar"
          >
            <FiChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 w-8 h-8 flex items-center justify-center rounded-md text-[#646B72] hover:bg-gray-100 cursor-pointer"
          title="Expand sidebar"
        >
          <FiChevronLeft size={16} className="rotate-180" />
        </button>
      )}

      {/* ==================================================
          NAVIGATION
      ================================================== */}

      <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-1">
        {/* ADMIN HOME */}

        <NavItem
          to="/admin"
          label="Admin Home"
          icon={<FiHome size={18} />}
          collapsed={collapsed}
          onClick={handleNavClick}
        />

        <div className="my-2 mx-3 border-t border-[#E6EAED]" />

        {/* GROUPS */}

        {GROUPS.map((group) => {
          const isOpen = effectiveOpen[group.key];
          const hasActive = group.items.some((i) =>
            location.pathname.startsWith(i.to),
          );

          return (
            <div key={group.key} className="flex flex-col">
              {/* Group header */}

              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className={`group flex items-center gap-3 rounded-md mx-2 px-2 py-2.5 text-sm cursor-pointer transition-colors ${
                  hasActive
                    ? "text-[#FE9F43]"
                    : "text-text-two hover:bg-[#FE9F43]/10"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? group.label : undefined}
              >
                <span
                  className={`shrink-0 ${
                    hasActive ? "text-[#FE9F43]" : "text-[#646B72]"
                  }`}
                >
                  {group.icon}
                </span>

                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">
                      {group.label}
                    </span>
                    <FiChevronDown
                      size={14}
                      className={`transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {/* Group items — expanded mode */}

              {!collapsed && isOpen && (
                <ul className="mt-1 mb-2">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `flex items-center gap-3 pl-9 pr-3 py-2 mx-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-[#FE9F43]/15 text-[#FE9F43] font-medium"
                              : "text-[#646B72] hover:bg-[#FE9F43]/10 hover:text-[#FE9F43]"
                          }`
                        }
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}

              {/* Group items — collapsed mode, only when active */}

              {collapsed && hasActive && (
                <ul className="mt-1 mb-2">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={handleNavClick}
                        title={item.label}
                        className={({ isActive }) =>
                          `flex items-center justify-center py-2 mx-2 rounded-md transition-colors ${
                            isActive
                              ? "bg-[#FE9F43]/15 text-[#FE9F43]"
                              : "text-[#646B72] hover:bg-[#FE9F43]/10 hover:text-[#FE9F43]"
                          }`
                        }
                      >
                        <span className="shrink-0">{item.icon}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* ==================================================
          BACK TO POS
      ================================================== */}

      <div className="border-t border-[#E6EAED] px-2 py-3">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 mx-0 px-2 py-2.5 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-[#FE9F43]/15 text-[#FE9F43] font-medium"
                : "text-[#646B72] hover:bg-[#FE9F43]/10 hover:text-[#FE9F43]"
            } ${collapsed ? "justify-center" : ""}`
          }
          title={collapsed ? "Back to POS" : undefined}
        >
          <FiArrowLeft size={16} className="shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Back to POS</span>}
        </NavLink>

        <div
          className={`mt-2 text-[11px] text-[#A6AAAF] ${
            collapsed ? "text-center" : "px-2"
          }`}
        >
          {collapsed ? "v1.0" : "© Galool POS · Admin"}
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// TOP-LEVEL NAV ITEM
// ============================================================

function NavItem({
  to,
  label,
  icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 mx-2 px-2 py-2.5 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-[#FE9F43]/15 text-[#FE9F43] font-medium"
            : "text-text-two hover:bg-[#FE9F43]/10 hover:text-[#FE9F43]"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </NavLink>
  );
}
