import { useAppSelector } from "../store";
import { selectUserRoles } from "../store/authSlice";

export type AppRole = "customer" | "business" | "admin";

export function useUserRole() {
  const roles = useAppSelector(selectUserRoles) as AppRole[];

  return {
    roles,
    isLoading: false,
    isCustomer: roles.includes("customer"),
    isBusiness: roles.includes("business"),
    isAdmin: roles.includes("admin"),
  };
}
