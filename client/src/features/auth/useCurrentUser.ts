// client/src/features/auth/useCurrentUser.ts

import { useSelector } from "react-redux";

import { useGetMeQuery } from "../../api/api";
import type { RootState } from "../../store/store";

// The logged-in user, with their role as stored on the server
export function useCurrentUser() {
  const token = useSelector((state: RootState) => state.auth.token);
  const { data: user, isLoading } = useGetMeQuery(undefined, { skip: !token });
  const role = user?.role;

  return {
    user,
    role,
    isLoading: !!token && isLoading,
    isManager: role === "MANAGER",
    isCashier: role === "CASHIER",
    // Everything except the teller desk
    isManagement: role === "MANAGER",
  };
}
