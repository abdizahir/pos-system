// client/src/components/sidebar/navConfig.ts
//
// Single menu definition shared by the desktop and mobile sidebars and
// the header search. `roles` limits who sees an item (everyone if unset).

import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBox,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLayers,
  FiPercent,
  FiPieChart,
  FiRefreshCcw,
  FiRepeat,
  FiRotateCcw,
  FiShoppingCart,
  FiTrendingUp,
  FiTruck,
  FiBriefcase,
  FiKey,
  FiUserCheck,
  FiUsers,
  FiAward,
  FiMonitor,
} from "react-icons/fi";

import type { UserRole } from "../../api/api";
import { MANAGEMENT, canAccess } from "../../features/auth/roles";

export type NavItem = {
  label: string;
  to: string;
  icon: IconType;
  roles?: UserRole[];
};

export type NavGroup = {
  key: string;
  label: string;
  icon: IconType;
  items: NavItem[];
};

export const NAV_HOME: NavItem = {
  label: "Dashboard",
  to: "/dashboard",
  icon: FiHome,
  roles: MANAGEMENT,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "inventory",
    label: "Inventory",
    icon: FiBox,
    items: [
      { label: "Products", to: "/products", icon: FiBox, roles: MANAGEMENT },
      { label: "Low Stocks", to: "/low-stocks", icon: FiAlertTriangle, roles: MANAGEMENT },
      { label: "Expired", to: "/expired-product", icon: FiClock, roles: MANAGEMENT },
      { label: "Manage Stock", to: "/stock", icon: FiLayers, roles: MANAGEMENT },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: FiShoppingCart,
    items: [
      { label: "POS", to: "/pos", icon: FiMonitor },
      { label: "Sales", to: "/sales", icon: FiShoppingCart },
      { label: "Invoices", to: "/invoice", icon: FiFileText },
      { label: "Returns", to: "/sales-return", icon: FiRotateCcw },
    ],
  },
  {
    key: "purchases",
    label: "Purchases",
    icon: FiTruck,
    items: [
      { label: "Purchases", to: "/purchase", icon: FiTruck, roles: MANAGEMENT },
      { label: "Returns", to: "/purchase-returns", icon: FiRefreshCcw, roles: MANAGEMENT },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: FiDollarSign,
    items: [
      { label: "Money Overview", to: "/money-overview", icon: FiActivity, roles: MANAGEMENT },
      { label: "Expenses", to: "/expenses", icon: FiDollarSign, roles: MANAGEMENT },
      { label: "Income", to: "/income", icon: FiTrendingUp, roles: MANAGEMENT },
      { label: "Accounts", to: "/accounts", icon: FiCreditCard, roles: MANAGEMENT },
      { label: "Transfers", to: "/money-transfer", icon: FiRepeat, roles: MANAGEMENT },
      { label: "VAT", to: "/vat", icon: FiPercent, roles: MANAGEMENT },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FiBarChart2,
    items: [
      { label: "Close-Out (EOD)", to: "/close-out", icon: FiCalendar, roles: MANAGEMENT },
      { label: "Balance Sheet", to: "/balance-sheet", icon: FiPieChart, roles: MANAGEMENT },
      { label: "Trial Balance", to: "/trial-balance", icon: FiClipboard, roles: MANAGEMENT },
      { label: "Profit / Loss", to: "/profit-loss", icon: FiBarChart2, roles: MANAGEMENT },
      { label: "Cash Flow", to: "/cash-flow", icon: FiActivity, roles: MANAGEMENT },
    ],
  },
  {
    key: "peoples",
    label: "People",
    icon: FiUsers,
    items: [
      { label: "Customers", to: "/customers", icon: FiUsers },
      { label: "Suppliers", to: "/suppliers", icon: FiUserCheck, roles: MANAGEMENT },
      { label: "Employees", to: "/employees", icon: FiBriefcase, roles: MANAGEMENT },
      { label: "Owners", to: "/owners", icon: FiKey, roles: MANAGEMENT },
    ],
  },
  {
    key: "manager",
    label: "Manager",
    icon: FiAward,
    items: [{ label: "Staff", to: "/manager/staff", icon: FiAward, roles: MANAGEMENT }],
  },
];

// The menu a given role is allowed to see; empty groups are dropped
export function groupsForRole(role: UserRole | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.roles)),
  })).filter((group) => group.items.length > 0);
}

// "/sales" is active on /sales and /sales/12, but not on /sales-return
export function isPathActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}
