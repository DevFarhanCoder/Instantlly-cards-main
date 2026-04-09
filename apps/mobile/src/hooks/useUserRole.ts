import { useRef } from "react";
import { useAppSelector } from "../store";
import { selectUserRoles, selectActiveRole } from "../store/authSlice";

export type AppRole = "customer" | "business" | "admin";

export function useUserRole() {
  const roles = useAppSelector(selectUserRoles) as AppRole[];
  const activeRole = useAppSelector(selectActiveRole) as AppRole | null;
  const lastLog = useRef("");

  const hasAdmin = roles.includes("admin");
  const hasBusiness = roles.includes("business");

  // For single-role users, auto-determine. For multi-role, require explicit selection.
  const effectiveRole = activeRole
    ?? (roles.length === 1 ? roles[0] : null);

  // Log only when values change to avoid spam
  const logKey = `${roles.join(",")}_${activeRole}_${effectiveRole}`;
  if (logKey !== lastLog.current) {
    lastLog.current = logKey;
    console.log(`[useUserRole] roles=[${roles.join(', ')}] activeRole=${activeRole} → effective=${effectiveRole}`);
  }

  return {
    roles,
    activeRole: effectiveRole,
    isLoading: false,
    // When no role is selected yet (multi-role user), default to customer view
    isCustomer: !effectiveRole || effectiveRole === "customer",
    isBusiness: effectiveRole === "business" || effectiveRole === "admin",
    isAdmin: effectiveRole === "admin",
    // Raw role checks (for showing options, not for gating navigation)
    hasAdminRole: hasAdmin,
    hasBusinessRole: hasBusiness,
  };
}
