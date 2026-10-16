// client/src/components/RequireRole.tsx
//
// Shows a page only to the roles allowed to use it.

import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { FiLock } from "react-icons/fi";

import type { UserRole } from "../api/api";
import { canAccess, homeFor, ROLE_LABELS } from "../features/auth/roles";
import { useCurrentUser } from "../features/auth/useCurrentUser";

export default function RequireRole({
  roles,
  children,
  redirect,
}: {
  roles: UserRole[];
  children: ReactNode;
  // Send other roles to their own start page instead of "No access"
  redirect?: boolean;
}) {
  const { role, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="flex items-center justify-center p-10 text-sm text-[#94A3B8]">Loading...</div>;
  }

  if (canAccess(role, roles)) return <>{children}</>;

  if (redirect && role) return <Navigate to={homeFor(role)} replace />;

  return (
    <section className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="max-w-sm rounded-3xl border border-[#EEF0F3] bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF7ED] text-[#E8862A]">
          <FiLock size={20} />
        </span>
        <h1 className="mt-4 text-lg font-bold text-[#0F172A]">No access</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          This page is for the {roles.map((r) => ROLE_LABELS[r]).join(" and ")}.
          {role && ` You are signed in as ${ROLE_LABELS[role]}.`}
        </p>
        <Link
          to={homeFor(role)}
          className="mt-5 inline-block rounded-xl bg-[#FE9F43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F28F2F]"
        >
          {role === "CASHIER" ? "Back to POS" : "Back to dashboard"}
        </Link>
      </div>
    </section>
  );
}
