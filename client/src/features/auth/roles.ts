// client/src/features/auth/roles.ts
//
// Who can see what. The server enforces the same rules; this only
// decides which menus and pages to show.
//
//   CASHIER  the teller: POS, sales, returns, customers
//   MANAGER  everything else (and can cover the till)

import type { UserRole } from "../../api/api";

export const ALL_ROLES: UserRole[] = ["MANAGER", "CASHIER"];

// Running the store: dashboard, inventory, finance, people, reports
export const MANAGEMENT: UserRole[] = ["MANAGER"];

export const ROLE_LABELS: Record<UserRole, string> = {
  MANAGER: "Manager",
  CASHIER: "Cashier",
};

// Where each role starts after signing in
export function homeFor(role: UserRole | undefined) {
  return role === "CASHIER" ? "/pos" : "/dashboard";
}

export function canAccess(role: UserRole | undefined, allowed?: UserRole[]) {
  if (!allowed || allowed.length === 0) return true;
  return !!role && allowed.includes(role);
}
